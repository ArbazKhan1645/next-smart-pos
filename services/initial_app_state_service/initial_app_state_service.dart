import 'dart:async';
import 'dart:math';
import 'dart:math' as Math;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/core/utils/helpers/current_location.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/ext_orders_model/ext_orders_model.dart';
import 'package:hse_pos/app/modules/smartpos_orders/views/smartpos_orders_view.dart';
import 'package:hse_pos/app/modules/sticky_orders/sticky_orders.dart';
import 'package:hse_pos/app/repos/ext_orders_repo/ext_orders_repository.dart';
import 'package:hse_pos/app/repos/ext_query_repo/ext_query_repo.dart';
import 'package:hse_pos/app/routes/app_pages.dart';
import 'package:hse_pos/app/services/auth/auth_service.dart';
import 'package:hse_pos/app/services/printing/print_job_service.dart';
import 'package:hse_pos/app/services/supabase/generic_supabase_service/generic_supabase_service.dart';
import 'package:uuid/uuid.dart';
part 'update_status.dart';
part 'update_ticket_status.dart';
part 'update_payment_status.dart';
part 'park_order.dart';
part 'manage_payment_status.dart';

class InitialAppStateService extends GetxService {
  var activeOrders = <ExtOrdersModel>[].obs;
  final ExtQueryRepository _extQueryRepository = ExtQueryRepository(
    locator<TestDatabase>(),
  );
  var currentActiveOrderIndex = 0.obs;
  var parkedOrders = <ExtOrdersModel>[].obs;
  var heldOrders = <ExtOrdersModel>[].obs;

  // Keep edit mode variables
  var isEditModeActive = false.obs;
  var tempOrderBeingEdited = Rxn<ExtOrdersModel>();
  var editingOrderId = Rxn<String>();

  final GenericSupabaseService<ExtOrders> _orderSupabaseService =
      GenericSupabaseService<ExtOrders>(
        tableName: 'ext_orders',
        requiresLocationFilter: true,
        fromJson: ExtOrders.fromJson,
        repositorySaveAll: (items) =>
            database.extOrdersRepository.createOrUpdateAll(items),
      );

  // Current order getter
  ExtOrdersModel? get currentOrder => activeOrders.isNotEmpty
      ? activeOrders[currentActiveOrderIndex.value]
      : null;

  Rxn<Map<String, dynamic>> selectedBasketProductIndex =
      Rxn<Map<String, dynamic>>();

  static InitialAppStateService get instance =>
      Get.find<InitialAppStateService>();

  final ExtOrdersRepository _extOrdersRepository;

  var lastItemBasketId = Rxn<String>();
  var mealDeallastItemBasketId = Rxn<String>();
  void updateLastItemBasketId(String? newId) {
    lastItemBasketId.value = newId;
  }

  void updateMealDealLastItemBasketId(String? newId) {
    mealDeallastItemBasketId.value = newId;
  }

  // Dependency injection via constructor
  InitialAppStateService({ExtOrdersRepository? extOrdersRepository})
    : _extOrdersRepository =
          extOrdersRepository ?? ExtOrdersRepository(locator<TestDatabase>());

  // Getter with null safety
  ExtOrdersModel? get appcurrentStateOrder => currentOrder;

  // Main initialization method
  Future<InitialAppStateService> init() async {
    try {
      await initializeOrdersState();
      return this;
    } catch (e) {
      printError(info: 'Failed to initialize app state: $e');
      // Consider logging to an error tracking service
      rethrow; // Propagate error to caller for proper handling
    }
  }

  oninitsCall() async {
    try {
      await initializeOrdersState();
    } catch (e) {
      printError(info: 'Failed to initialize app state: $e');
      // Consider logging to an error tracking service
      rethrow; // Propagate error to caller for proper handling
    }
  }

  // Separate initialization method for orders state
  // In initial_app_state_service.dart, update initializeOrdersState:

  Future<void> initializeOrdersState() async {
    try {
      // Add retry logic for database operations
      const int retryCount = 3;
      List<ExtOrdersModel>? fetchedActiveOrders;

      for (int i = 0; i < retryCount; i++) {
        try {
          // Load all active orders with retry
          fetchedActiveOrders = await _extOrdersRepository.getActiveOrders();
        } catch (dbError) {
          printError(info: 'Database error attempt ${i + 1}: $dbError');
          if (i < retryCount - 1) {
            await Future.delayed(const Duration(milliseconds: 500));
          }
        }
      }

      // Load parked and held orders
      final List<ExtOrdersModel> fetchedParkedOrders =
          await _extOrdersRepository.getOrdersByStatus('PARKED');
      final List<ExtOrdersModel> fetchedHeldOrders = await _extOrdersRepository
          .getOrdersByStatus('HELD');

      activeOrders.assignAll(fetchedActiveOrders ?? []);
      parkedOrders.assignAll(fetchedParkedOrders);
      heldOrders.assignAll(fetchedHeldOrders);

      // Remove any duplicate active orders (fix for restart issue)
      final uniqueActiveOrders = <String, ExtOrdersModel>{};
      for (final order in activeOrders) {
        if (order.uuid != null) {
          uniqueActiveOrders[order.uuid!] = order;
        }
      }
      activeOrders.assignAll(uniqueActiveOrders.values.toList());

      // Create new order if no active orders exist
      if (activeOrders.isEmpty) {
        await _createNewOrderWithRetry();
      } else {
        // Set first active order as current
        currentActiveOrderIndex.value = 0;
      }
    } catch (e) {
      printError(info: 'Error initializing orders state: $e');
      await _createNewOrderWithRetry();
    }
  }

  Future<void> _createNewOrderWithRetry() async {
    const int retryCount = 3;

    for (int i = 0; i < retryCount; i++) {
      try {
        await _createNewOrder();
        return;
      } catch (e) {
        printError(info: 'Error creating order attempt ${i + 1}: $e');
        if (i < retryCount - 1) {
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }
    }

    throw Exception('Failed to create new order after $retryCount attempts');
  }

  Future<int> generateUniqueOrderNumber() async {
    try {
      // Get all existing orders to check for duplicate order numbers
      final List<ExtOrdersModel> allOrders = await _extOrdersRepository
          .getAllOrders();
      final Set<int> existingOrderNumbers = allOrders
          .where((order) => order.order_number != null)
          .map((order) => order.order_number!)
          .toSet();
      // Set initial parameters for order number generation
      const int maxAttempts = 10;
      int attempts = 0;
      int generatedNumber;
      // Keep generating until we find a unique number or reach max attempts
      do {
        attempts++;
        // Create a 9-digit number (between 100,000,000 and 999,999,999)
        // You can adjust the range based on your requirements
        final random = Random();
        generatedNumber = 100000000 + random.nextInt(900000000);
        // Add timestamp-based component for additional uniqueness
        // Use the last 3 digits of the current timestamp (milliseconds)
        final int timestampComponent =
            DateTime.now().millisecondsSinceEpoch % 1000;
        generatedNumber = (generatedNumber ~/ 1000) * 1000 + timestampComponent;
        // Exit loop if we found a unique number
        if (!existingOrderNumbers.contains(generatedNumber)) {
          break;
        }
        // Prevent infinite loops and handle the unlikely case of running out of unique numbers
        if (attempts >= maxAttempts) {
          printError(
            info:
                'Failed to generate unique order number after $maxAttempts attempts',
          );
          throw Exception('Unable to generate unique order number');
        }
        // Small delay to ensure timestamp component changes
        await Future.delayed(const Duration(milliseconds: 2));
      } while (true);
      return generatedNumber;
    } catch (e) {
      printError(info: 'Error generating unique order number: $e');
      // Fallback to timestamp-based order number in case of error
      return DateTime.now().millisecondsSinceEpoch % 1000000000;
    }
  }

  // Helper method to check if an order number already exists
  Future<bool> isOrderNumberUnique(int orderNumber) async {
    try {
      final List<ExtOrdersModel> allOrders = await _extOrdersRepository
          .getAllOrders();
      return !allOrders.any((order) => order.order_number == orderNumber);
    } catch (e) {
      printError(info: 'Error checking order number uniqueness: $e');
      return false; // Assume not unique on error to be safe
    }
  }

  // Update the _createNewOrder method to use the unique order number generator
  Future<void> _createNewOrder() async {
    try {
      final uuid = const Uuid().v4();
      final orderNumber = await generateUniqueOrderNumber();
      final locationId = getLocationId(initial: true);
      final terminalId = getTerminalId(initial: true);
      if (locationId == null || terminalId == null) return;
      int serviceTypeId = 1;
      if (Get.currentRoute == Routes.RESTAURANTPOS) {
        final activeJunctions = await database
            .terminalsServiceJunctionRepository
            .getActiveTerminalServiceJunctions();
        final firstJunction = activeJunctions.firstOrNull;
        if (firstJunction?.service_uuid != null) {
          final service = await database.serviceRepository.getServiceByUuid(
            firstJunction!.service_uuid!,
          );
          if (service != null) {
            serviceTypeId = service.service_type_id ?? serviceTypeId;
          } else {
            _showSyncDialog();
            return;
          }
        } else {
          _showSyncDialog();
          return;
        }
      }

      final newOrder = ExtOrdersModel(
        uuid: uuid,
        order_number: orderNumber,
        created_at: DateTime.now(),
        version: 0,
        mode: 'Sale',
        last_status: 'ACTIVATED',
        deleted_at: null,
        service_type: getNameById(serviceTypeId),
        sale_channel_type: 'SMART_POS',
        status_stages: [],

        ticket_status_stages: [],
        discount: '',
        products: [],
        payments: [],
        location_id: locationId,
        terminal_id: terminalId,
        country:
            AuthService
                .instance
                .selectedLocationCountryBehaviorSubject
                .value
                ?.countryName ??
            '-',
      );

      await _extOrdersRepository.insertOrder(newOrder);
      activeOrders.add(newOrder);
      currentActiveOrderIndex.value = activeOrders.length - 1;
    } catch (e, stackTrace) {
      printError(info: 'Error creating new order: $e\n$stackTrace');
      throw Exception('Failed to create new order');
    }
  }

  bool switchToNextOrder() {
    if (activeOrders.isEmpty) return false;

    if (currentActiveOrderIndex.value < activeOrders.length - 1) {
      currentActiveOrderIndex.value++;
      return true;
    }
    return false;
  }

  bool switchToPreviousOrder() {
    if (activeOrders.isEmpty) return false;

    if (currentActiveOrderIndex.value > 0) {
      currentActiveOrderIndex.value--;
      return true;
    }
    return false;
  }

  bool switchToOrderByIndex(int index) {
    if (index >= 0 && index < activeOrders.length) {
      currentActiveOrderIndex.value = index;
      return true;
    }
    return false;
  }

  bool switchToOrderById(String orderId) {
    final index = activeOrders.indexWhere((order) => order.uuid == orderId);
    if (index != -1) {
      currentActiveOrderIndex.value = index;
      return true;
    }
    return false;
  }

  String getNameById(int id) {
    switch (id) {
      case 1:
        return 'IN_STORE';
      case 2:
        return 'COLLECTION';
      case 3:
        return 'DELIVERY';
      case 4:
        return 'CAR_REPAIR';
      case 5:
        return 'MOBILE_REPAIR';
      case 6:
        return 'DINE_IN';
      default:
        return 'UNKNOWN';
    }
  }

  void _showSyncDialog() {
    Get.defaultDialog(
      title: 'Data Missing',
      middleText: 'Please sync services and Junctions mappings again.',
      confirm: ElevatedButton(
        onPressed: () {
          Get.offNamed(Routes.STAFFS_PIN_LOGIN);
        },
        child: const Text('OK'),
      ),
      barrierDismissible: false,
    );
  }

  // Add items to an existing order with validation
  Future<bool> addItemsToExistedOrder(
    Map<String, dynamic> product, {
    double qty = 1,
    String? mealDealGroupUuid,
    String? mealDealProductUuid,
  }) async {
    try {
      final existedOrder = currentOrder;
      if (existedOrder == null) {
        printError(info: 'No ACTIVATED order exists');
        return false;
      }
      if (product.isEmpty || !product.containsKey('uuid')) {
        printError(info: 'Invalid product or missing uuid');
        return false;
      }

      product['mealDealGroupUuid'] = mealDealGroupUuid;
      product['mealDealProductUuid'] = mealDealProductUuid;

      final oldProducts = existedOrder.products ?? [];
      final updatedProducts = <Map<String, dynamic>>[];
      bool productFound = false;

      for (final p in oldProducts) {
        if (p['uuid'] == product['uuid']?.toString() &&
            p['parentbasketid'] == null) {
          final updated = Map<String, dynamic>.from(p);

          final currentQty = (updated['qty'] ?? 0).toDouble();
          updated['qty'] = currentQty + qty;
          lastItemBasketId.value = p['basketId'];
          mealDeallastItemBasketId.value = null;
          updatedProducts.add(updated);
          productFound = true;
        } else {
          updatedProducts.add(Map<String, dynamic>.from(p));
        }
      }

      if (!productFound) {
        product['basketid'] = const Uuid().v4().toString();
        final newProduct = Map<String, dynamic>.from(product);
        lastItemBasketId.value = product['basketid'];
        mealDeallastItemBasketId.value = null;
        newProduct['qty'] = qty;
        updatedProducts.add(newProduct);
      }
      final updatedOrder = existedOrder.copyWith(products: updatedProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        existedOrder.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == existedOrder.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      selectedBasketProductIndex.value = product;
      await updateSpecificOrderStatus(existedOrder.uuid!, 'in_progress');

      return true;
    } catch (e) {
      printError(info: 'Error adding item: $e');
      return false;
    }
  }

  Future<bool> updateSpecificOrderStatus(
    String orderId,
    String newStatus,
  ) async {
    try {
      // Find the order in any of the lists
      ExtOrdersModel? orderToUpdate;

      orderToUpdate = activeOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );
      if (orderToUpdate != null) {
        final updatedOrder = orderToUpdate.copyWith(last_status: newStatus);
        await _extOrdersRepository.updateOrderByUUID(updatedOrder, orderId);

        final index = activeOrders.indexWhere((order) => order.uuid == orderId);
        if (index != -1) {
          activeOrders[index] = updatedOrder;
        }
        return true;
      }

      // Check parked orders
      orderToUpdate = parkedOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );
      if (orderToUpdate != null) {
        final updatedOrder = orderToUpdate.copyWith(last_status: newStatus);
        await _extOrdersRepository.updateOrderByUUID(updatedOrder, orderId);

        final index = parkedOrders.indexWhere((order) => order.uuid == orderId);
        if (index != -1) {
          parkedOrders[index] = updatedOrder;
        }
        return true;
      }

      // Check held orders
      orderToUpdate = heldOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );
      if (orderToUpdate != null) {
        final updatedOrder = orderToUpdate.copyWith(last_status: newStatus);
        await _extOrdersRepository.updateOrderByUUID(updatedOrder, orderId);

        final index = heldOrders.indexWhere((order) => order.uuid == orderId);
        if (index != -1) {
          heldOrders[index] = updatedOrder;
        }
        return true;
      }

      return false;
    } catch (e) {
      printError(info: 'Error updating order status: $e');
      return false;
    }
  }

  Future<bool> addCustomPropertyItemsToExistedOrder(
    Map<String, dynamic> product, {
    double qty = 1,
    String? mealDealGroupUuid,
    String? mealDealProductUuid,
  }) async {
    try {
      final ExtOrdersModel? existedOrder = currentOrder;
      if (existedOrder == null) {
        printError(info: 'Cannot add item: No ACTIVATED order exists');
        return false;
      }
      if (product.isEmpty) {
        printError(info: 'Cannot add empty product');
        return false;
      }

      product['mealDealGroupUuid'] = mealDealGroupUuid;
      product['mealDealProductUuid'] = mealDealProductUuid;

      // Create a modifiable copy of the list
      final List<Map<String, dynamic>> existedProducts =
          List<Map<String, dynamic>>.from(existedOrder.products ?? []);

      if (mealDealGroupUuid == null || mealDealProductUuid == null) {
        product['basketid'] = const Uuid().v4().toString();
        lastItemBasketId.value = product['basketid'];
        mealDeallastItemBasketId.value = null;
      } else {
        product['basketid'] = const Uuid().v4().toString();
        mealDeallastItemBasketId.value = product['basketid'];
        product['parentbasketid'] = lastItemBasketId.value;
      }

      final newProduct = Map<String, dynamic>.from(product);
      newProduct['qty'] = qty;
      existedProducts.add(newProduct);

      final ExtOrdersModel updatedOrder = existedOrder.copyWith(
        products: existedProducts,
      );

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        existedOrder.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == existedOrder.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      selectedBasketProductIndex.value = product;
      await updateCurrentOrderStatus('in_progress');

      return true;
    } catch (e) {
      printError(info: 'Error adding item to order: $e');
      return false;
    }
  }

  void resetOrder() {
    // Clear all order lists
    activeOrders.clear();
    parkedOrders.clear();
    heldOrders.clear();

    // Reset current order index
    currentActiveOrderIndex.value = 0;

    // Reset edit mode states
    isEditModeActive.value = false;
    tempOrderBeingEdited.value = null;
    editingOrderId.value = null;

    // Reset basket tracking
    lastItemBasketId.value = null;
    mealDeallastItemBasketId.value = null;
    selectedBasketProductIndex.value = null;
  }

  // Alternative method to reset and create a fresh order
  Future<void> resetToNewOrder() async {
    try {
      resetOrder();
      await _createNewOrder();
    } catch (e) {
      printError(info: 'Error resetting and creating new order: $e');
      rethrow;
    }
  }

  // Complete the current order with validation
  // In initial_app_state_service.dart, update the completeOrder method:

  Future<bool> completeOrder({
    String? specificOrderId,
    String method = 'CASH',
    bool forceFinished = false,
    bool isRefundOrder = false,
  }) async {
    ExtOrdersModel? orderToUpdate;
    try {
      ExtOrdersModel? orderToComplete;

      if (specificOrderId != null) {
        orderToComplete = await _getOrderFromRepository(specificOrderId);
      } else {
        orderToComplete = currentOrder;
      }

      if (orderToComplete == null) {
        printError(info: 'Cannot complete order: No order to complete');
        return false;
      }

      final String lastStatus = orderToComplete.last_status ?? '';

      if (lastStatus != 'ACTIVATED' &&
          (lastStatus.toLowerCase() != 'in_progress') &&
          lastStatus != 'PARKED') {
        printError(
          info: 'Cannot complete order: Order is not in active session',
        );
        return false;
      }

      final List<Map<String, dynamic>>? products = orderToComplete.products;
      if (products == null || products.isEmpty) {
        printError(info: 'Cannot complete order: Order has no products');
        return false;
      }

      if (!await isOrderPaidAsync(specificOrderId: orderToComplete.uuid)) {
        // Only auto-add payment for non-split payment methods
        if (method != 'SPLIT') {
          final orderTotal = totalOrderAmount(orderToComplete);
          await addPaymentToOrder(
            isRefundOrder: isRefundOrder,
            paymentMethod: method,
            amount: orderTotal,
            specificOrderId: orderToComplete.uuid,
          );

          // Re-fetch the updated order
          final updatedIndex = activeOrders.indexWhere(
            (order) => order.uuid == orderToComplete!.uuid,
          );
          if (updatedIndex != -1) {
            orderToComplete = activeOrders[updatedIndex];
          }
        } else {
          // For split payments, payments should already be added
          printError(
            info: 'Split payment method selected but no payments found',
          );
          return false;
        }
      }

      final currentTime = DateTime.now();

      // Update status stages
      final statusStages = List<Map<String, dynamic>>.from(
        orderToComplete.status_stages ?? [],
      );

      statusStages.add({
        'status': isRefundOrder
            ? 'COMPLETED'
            : forceFinished
            ? 'COMPLETED'
            : orderToComplete.service_type?.toLowerCase() == 'in_store'
            ? 'COMPLETED'
            : 'PARKED',
        'timestamp': currentTime.toIso8601String(),
        'updated_by': 'system',
      });

      // Update ticket status stages
      final ticketStatusStages = List<Map<String, dynamic>>.from(
        orderToComplete.ticket_status_stages ?? [],
      );
      ticketStatusStages.add({
        'ticket_status': isRefundOrder
            ? 'Finished'
            : forceFinished
            ? 'Finished'
            : orderToComplete.service_type?.toLowerCase() == 'in_store'
            ? 'Finished'
            : 'ACCEPTED',
        'timestamp': currentTime.toIso8601String(),
        'updated_by': 'system',
      });

      final ExtOrdersModel updatedOrder = orderToComplete.copyWith(
        last_status: isRefundOrder
            ? 'COMPLETED'
            : forceFinished
            ? 'COMPLETED'
            : orderToComplete.service_type?.toLowerCase() == 'in_store'
            ? 'COMPLETED'
            : 'PARKED',
        status_stages: statusStages,
        ticket_status_stages: ticketStatusStages,
        updated_at: currentTime,
      );

      orderToUpdate = updatedOrder;

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToComplete.uuid!,
      );

      // Remove from active orders list
      activeOrders.removeWhere((order) => order.uuid == orderToComplete!.uuid);

      // Adjust current index if necessary
      if (currentActiveOrderIndex.value >= activeOrders.length) {
        currentActiveOrderIndex.value = Math.max(0, activeOrders.length - 1);
      }

      // Create new order if no active orders remain
      if (activeOrders.isEmpty) {
        await _createNewOrder();
      }

      DialogService.showDialogIfEnabled(const SmartposOrdersView());
      final printJobService = Get.find<PrintJobService>();
      await printJobService.createJobsForOrder(updatedOrder);
      return true;
    } catch (e) {
      printError(info: 'Error completing order: $e');
      return false;
    } finally {
      if (orderToUpdate != null) {
        // Background me chalao — UI wait nahi karega
        unawaited(
          Future(() async {
            final Map<String, dynamic> orderData = orderToUpdate!.toJson();

            orderData.remove('last_status');
            orderData.remove('synced_at');
            orderData.remove('id');
            orderData.remove('order_mode');

            orderData.remove('supabase_id');

            orderData['mode'] = (orderToUpdate.mode ?? 'SALE').toUpperCase();
            orderData['country'] = 'GB';
            orderData['status'] = orderToUpdate.last_status ?? 'PARKED';
            orderData['tracking_number'] = generateTrackingNumber();
            orderData['status_timestamp'] =
                orderToUpdate.status_stages?.last['timestamp'] ??
                DateTime.now().toIso8601String();
            orderData['ticket_status'] =
                orderToUpdate.ticket_status_stages?.last['ticket_status']
                    ?.toString()
                    .toUpperCase() ??
                'WAITING_FOR_APPROVAL';
            orderData['ticket_status_timestamp'] =
                orderToUpdate.ticket_status_stages?.last['timestamp'] ??
                DateTime.now().toIso8601String();

            final supabaseresult = await _orderSupabaseService.upsertRecord(
              orderData['uuid'],
              orderData,
            );

            print(supabaseresult.error);

            if (supabaseresult.success != true) {
              _extQueryRepository.insertItem(
                EXTQueryModel(
                  uuid: const Uuid().v4().toString(),
                  created_at: DateTime.now().toString(),
                  operation_at: DateTime.now().toString(),
                  version: 0,
                  entity: 'ext_orders',
                  operation: 'upsert',
                  entity_id: orderToUpdate.uuid,
                  location_id: orderToUpdate.location_id.toString(),
                ),
              );
            }
          }),
        );
      }
    }
  }

  String generateTrackingNumber() {
    final random = DateTime.now().microsecondsSinceEpoch;
    return (random % 1000000000000).toString().padLeft(12, '0');
  }

  Future<bool> clearAllProducts({String? specificOrderId}) async {
    try {
      ExtOrdersModel? orderToClear;

      if (specificOrderId != null) {
        orderToClear = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToClear = currentOrder;
      }

      if (orderToClear == null) {
        printError(info: 'Cannot clear products: No order found');
        return false;
      }

      if (orderToClear.products == null || orderToClear.products!.isEmpty) {
        return true; // Already empty
      }

      final ExtOrdersModel updatedOrder = orderToClear.copyWith(
        products: [],
        last_status: 'ACTIVATED',
      );

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToClear.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToClear!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e) {
      printError(info: 'Error clearing products: $e');
      return false;
    }
  }

  Future<bool> removeProduct({
    Map<String, dynamic>? productMap,
    String? specificOrderId,
  }) async {
    try {
      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'Cannot remove product: No order found');
        return false;
      }

      final List<Map<String, dynamic>>? products = orderToUpdate.products;
      if (products == null || products.isEmpty) {
        printError(info: 'Cannot remove product: Order has no products');
        return false;
      }

      if (productMap == null) {
        printError(info: 'Product map must be provided');
        return false;
      }

      final List<Map<String, dynamic>> updatedProducts =
          List<Map<String, dynamic>>.from(products);

      final int productIndex = updatedProducts.indexWhere(
        (product) =>
            product['uuid']?.toString() == productMap['uuid'] &&
            product['qty'] == productMap['qty'] &&
            product['selling_price'] == productMap['selling_price'] &&
            product['basketid'] == productMap['basketid'],
      );

      if (productIndex == -1) {
        printError(info: 'Product not found');
        return false;
      }

      updatedProducts.removeAt(productIndex);

      // Remove meal deal products associated with this product
      updatedProducts.removeWhere(
        (element) =>
            element['mealDealProductUuid'] == productMap['uuid'] &&
            element['parentbasketid'] == productMap['basketid'],
      );

      final ExtOrdersModel updatedOrder = orderToUpdate.copyWith(
        products: updatedProducts,
      );

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update status if no products remain
      if (updatedProducts.isEmpty) {
        await updateSpecificOrderStatus(orderToUpdate.uuid!, 'ACTIVATED');
      }

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e) {
      printError(info: 'Error removing product: $e');
      return false;
    }
  }

  Future<bool> updateCustomerUUID(
    String customeruuid, {
    String? specificOrderId,
  }) async {
    try {
      if (customeruuid.isEmpty) {
        printError(info: 'Cannot update customer: Customer ID is empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'Cannot update customer: No order found');
        return false;
      }

      if (orderToUpdate.last_status != 'ACTIVATED' &&
          orderToUpdate.last_status != 'in_progress') {
        printError(
          info: 'Cannot update customer: Order is not in ACTIVATED state',
        );
        return false;
      }

      final ExtOrdersModel updatedOrder = orderToUpdate.copyWith(
        customer_uuid: customeruuid,
      );

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e) {
      printError(info: 'Error updating customer ID: $e');
      return false;
    }
  }

  Future<bool> updateServiceType(
    String serviceType, {
    String? specificOrderId,
  }) async {
    try {
      if (serviceType.isEmpty) {
        printError(info: 'Cannot update service: Service type is empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'Cannot update service: No order found');
        return false;
      }

      if (orderToUpdate.last_status != 'ACTIVATED' &&
          orderToUpdate.last_status != 'in_progress') {
        printError(
          info: 'Cannot update service: Order is not in ACTIVATED state',
        );
        return false;
      }

      final ExtOrdersModel updatedOrder = orderToUpdate.copyWith(
        service_type: serviceType,
      );

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e) {
      printError(info: 'Error updating service type: $e');
      return false;
    }
  }

  // Optional: Add a helper method to get current customer information
  String? getCustomerId() {
    return currentOrder?.customer_uuid;
  }

  double totalCurrentOrderAmount() {
    try {
      final ExtOrdersModel? order = currentOrder;
      if (order == null || order.products == null || order.products!.isEmpty) {
        return 0.0;
      }

      double total = 0.0;

      for (var product in order.products!) {
        final double quantity = _parseDouble(product['qty'] ?? 1.0);

        // Base product price
        double baseProductPrice = 0.0;
        if (product.containsKey('selling_price')) {
          baseProductPrice = _parseDouble(product['selling_price']);
        } else if (product.containsKey('total_price')) {
          baseProductPrice = _parseDouble(product['total_price']);
        }

        // Modifiers price (added directly, not multiplied by quantity)
        double modifiersPrice = 0.0;

        if (product['modifiers'] != null && product['modifiers'] is List) {
          for (var modifier in product['modifiers']) {
            final double price = _parseDouble(modifier['singlePrice'] ?? 0.0);
            final double qty = modifier['qty'] ?? 1.0;
            modifiersPrice += price * qty;
          }
        }

        total += (baseProductPrice * quantity) + modifiersPrice;
      }

      // Apply discount if available
      if (order.discount != null && order.discount!.isNotEmpty) {
        final double discountValue = _parseDiscount(order.discount, total);
        total -= discountValue;
      }

      return double.parse(total.toStringAsFixed(2));
    } catch (e) {
      printError(info: 'Error calculating total order amount: $e');
      return 0.0;
    }
  }

  double totalOrderAmount(ExtOrdersModel? orderData) {
    try {
      final ExtOrdersModel? order = orderData;
      if (order == null || order.products == null || order.products!.isEmpty) {
        return 0.0;
      }
      double total = 0.0;
      // Iterate through each product and accumulate the total
      for (var product in order.products!) {
        // Check if product has price and quantity fields
        if (product.containsKey('selling_price')) {
          // Try to parse price and quantity values safely
          final double price = _parseDouble(product['selling_price']);
          const double quantity = 1;
          // Calculate product subtotal and add to total
          total += price * quantity;
        } else if (product.containsKey('total_price')) {
          // Alternative: use total_price field if available
          total += _parseDouble(product['total_price']);
        }
      }
      // Apply discount if available
      if (order.discount != null && order.discount!.isNotEmpty) {
        final double discountValue = _parseDiscount(order.discount, total);
        total -= discountValue;
      }

      // Round to 2 decimal places to avoid floating point precision issues
      return double.parse(total.toStringAsFixed(2));
    } catch (e) {
      printError(info: 'Error calculating total order amount: $e');
      return 0.0;
    }
  }

  /// Helper method to safely parse a value to double
  double _parseDouble(dynamic value) {
    if (value == null) return 0.0;

    if (value is int) return value.toDouble();
    if (value is double) return value;
    if (value is String) {
      try {
        return double.parse(value);
      } catch (_) {
        return 0.0;
      }
    }
    return 0.0;
  }

  /// Helper method to parse and apply discount
  double _parseDiscount(String? discount, double total) {
    try {
      if (discount == null) return 0.0;
      if (discount.isEmpty) return 0.0;

      // Handle percentage discount (e.g., "10%")
      if (discount.endsWith('%')) {
        final String percentStr = discount.substring(0, discount.length - 1);
        final double percent = double.parse(percentStr);
        return total * (percent / 100);
      }
      // Handle fixed amount discount (e.g., "50.00")
      else {
        final double amount = double.parse(discount);
        return amount;
      }
    } catch (_) {
      return 0.0;
    }
  }

  /// Getter for formatted total amount with currency symbol
  String get formattedTotalAmount {
    return 'Rs. ${totalCurrentOrderAmount().toStringAsFixed(2)}';
  }

  Future<bool> addModifiersToProduct({
    required String productUuid,
    required Map<String, dynamic> modifier,
    double modifierPrice = 0.0,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty) {
        printError(info: 'Product UUID cannot be empty');
        return false;
      }

      if (modifier.isEmpty) {
        printError(info: 'Modifier cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts = List.from(
        orderToUpdate.products ?? [],
      );

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid &&
            (p['basketid'] == lastItemBasketId.value ||
                p['basketid'] == mealDeallastItemBasketId.value),
      );

      if (productIndex == -1) {
        printError(info: 'Product with UUID $productUuid not found in order');
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );

      if (productToUpdate['modifiers'] == null) {
        productToUpdate['modifiers'] = [];
      }

      final List<dynamic> modifiers = productToUpdate['modifiers'] is List
          ? List.from(productToUpdate['modifiers'])
          : [];

      final bool shouldMerge = modifier['merge'] == true;
      if (shouldMerge) {
        final existingModifierIndex = modifiers.indexWhere((existingMod) {
          return existingMod['uuid'] == modifier['uuid'] &&
              existingMod['name'] == modifier['name'];
        });

        if (existingModifierIndex != -1) {
          final existingModifier = Map<String, dynamic>.from(
            modifiers[existingModifierIndex],
          );
          final currentQty = existingModifier['qty'] ?? 1;
          existingModifier['qty'] = currentQty + (modifier['qty'] ?? 1);
          modifiers[existingModifierIndex] = existingModifier;
        } else {
          modifiers.add(modifier);
        }
      } else {
        modifiers.add(modifier);
      }

      productToUpdate['modifiers'] = modifiers;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error adding modifier: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> removeModifierFromProduct({
    required String productUuid,
    required String basketUuid,
    required String modifierUuid,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || modifierUuid.isEmpty) {
        printError(info: 'Product UUID and Modifier UUID cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> updatedProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = updatedProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && p['basketid'] == basketUuid,
      );

      if (productIndex == -1) {
        printError(info: 'Product with UUID $productUuid not found');
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        updatedProducts[productIndex],
      );

      if (productToUpdate['modifiers'] == null ||
          productToUpdate['modifiers'] is! List) {
        printError(info: 'Product has no modifiers');
        return false;
      }

      final List<dynamic> modifiers = List<dynamic>.from(
        productToUpdate['modifiers'],
      );

      final modifierIndex = modifiers.indexWhere(
        (m) => m['uuid']?.toString() == modifierUuid,
      );

      if (modifierIndex == -1) {
        printError(info: 'Modifier with UUID $modifierUuid not found');
        return false;
      }

      modifiers.removeAt(modifierIndex);
      productToUpdate['modifiers'] = modifiers;
      updatedProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: updatedProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error removing modifier: $e\n$stackTrace');
      return false;
    }
  }

  Future<int> countModifiersForProduct({
    required String productUuid,
    String? modifierGroupUuid,
  }) async {
    try {
      final order = currentOrder;
      if (order == null || order.products == null) return 0;

      final product = order.products!.firstWhere(
        (p) =>
            p['uuid'] == productUuid &&
            (lastItemBasketId.value == null ||
                (p['basketid'] == lastItemBasketId.value ||
                    p['basketid'] == mealDeallastItemBasketId.value)),
        orElse: () => {},
      );

      if (product.isEmpty || product['modifiers'] == null) return 0;

      final modifiers = product['modifiers'] as List;
      if (modifierGroupUuid == null) return modifiers.length;

      final double count = modifiers
          .where((m) => m['modifierGroupUuid'] == modifierGroupUuid)
          .fold<double>(0.0, (sum, m) => sum + ((m['qty'] as double?) ?? 1.0));
      return count.toInt();
    } catch (e) {
      printError(info: 'Error counting modifiers: $e');
      return 0;
    }
  }

  Future<int> countMealDealsForProduct({
    required String productUuid,
    String? mealDealGroupUuid,
  }) async {
    try {
      final order = currentOrder;
      if (order == null || order.products == null) return 0;
      final product = order.products!.where(
        (p) =>
            p['mealDealGroupUuid'] == mealDealGroupUuid &&
            p['parentbasketid'] == lastItemBasketId.value,
      );
      if (product.isEmpty) return 0;
      return product.length;
    } catch (e) {
      printError(info: 'Error counting modifiers: $e');
      return 0;
    }
  }

  Future<bool> decrementProductQuantity({
    required String productUuid,
    required String basketid,
    double decrementBy = 1.0,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      if (decrementBy <= 0) {
        printError(info: 'Decrement value must be positive');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && (p['basketid'] == basketid),
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      final currentQty = _parseDouble(productToUpdate['qty'] ?? 1.0);

      if (currentQty <= decrementBy) {
        currentProducts.removeAt(productIndex);
      } else {
        productToUpdate['qty'] = currentQty - decrementBy;
        currentProducts[productIndex] = productToUpdate;
      }

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error decrementing product quantity: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> incrementProductQuantity({
    required String productUuid,
    required String basketid,
    double incrementBy = 1.0,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      if (incrementBy <= 0) {
        printError(info: 'Increment value must be positive');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && (p['basketid'] == basketid),
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      final currentQty = _parseDouble(productToUpdate['qty'] ?? 1.0);

      productToUpdate['qty'] = currentQty + incrementBy;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error incrementing product quantity: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> addProductNote({
    required String productUuid,
    required String basketid,
    required String note,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && (p['basketid'] == basketid),
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      productToUpdate['description'] = note;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error adding product note: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> updateProductSellingPrice({
    required String productUuid,
    required String basketid,
    required double newSellingPrice,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      if (newSellingPrice < 0) {
        printError(info: 'Selling price cannot be negative');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && p['basketid'] == basketid,
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      productToUpdate['selling_price'] = newSellingPrice;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating product selling price: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> updateProductCustomName({
    required String productUuid,
    required String basketid,
    required String newName,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      if (newName.isEmpty) {
        printError(info: 'New name cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && p['basketid'] == basketid,
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      productToUpdate['name'] = newName;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating product custom name: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> updateProductKitchenMessage({
    required String productUuid,
    required String basketid,
    required String newMessage,
    String? specificOrderId,
  }) async {
    try {
      if (productUuid.isEmpty || basketid.isEmpty) {
        printError(info: 'Product UUID and Basket ID cannot be empty');
        return false;
      }

      if (newMessage.isEmpty) {
        printError(info: 'Kitchen message cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final List<Map<String, dynamic>> currentProducts =
          List<Map<String, dynamic>>.from(orderToUpdate.products ?? []);

      final productIndex = currentProducts.indexWhere(
        (p) =>
            p['uuid']?.toString() == productUuid && p['basketid'] == basketid,
      );

      if (productIndex == -1) {
        printError(
          info:
              'Product with UUID $productUuid and basket ID $basketid not found',
        );
        return false;
      }

      final productToUpdate = Map<String, dynamic>.from(
        currentProducts[productIndex],
      );
      productToUpdate['description'] = newMessage;
      currentProducts[productIndex] = productToUpdate;

      final updatedOrder = orderToUpdate.copyWith(products: currentProducts);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(
        info: 'Error updating product kitchen message: $e\n$stackTrace',
      );
      return false;
    }
  }

  Future<bool> removeOrderDiscount({String? specificOrderId}) async {
    try {
      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      if (orderToUpdate.discount == null || orderToUpdate.discount!.isEmpty) {
        return true; // No discount to remove
      }

      final updatedOrder = orderToUpdate.copyWith(discount: '');

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error removing order discount: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> updateOrderDiscount({
    required String discountValue,
    String? specificOrderId,
  }) async {
    try {
      if (discountValue.isEmpty) {
        printError(info: 'Discount value cannot be empty');
        return false;
      }

      ExtOrdersModel? orderToUpdate;

      if (specificOrderId != null) {
        orderToUpdate = activeOrders.firstWhereOrNull(
          (order) => order.uuid == specificOrderId,
        );
      } else {
        orderToUpdate = currentOrder;
      }

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final updatedOrder = orderToUpdate.copyWith(discount: discountValue);

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders list
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate!.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating order discount: $e\n$stackTrace');
      return false;
    }
  }

  double calculateOrderDiscount() {
    try {
      final order = currentOrder;
      if (order == null) {
        return 0.0;
      }
      // Check if discount exists and is in correct format
      if (order.discount == null || order.discount!.isEmpty) {
        return 0.0;
      }

      // Split the discount string into parts
      final parts = order.discount!.split(',');
      if (parts.length != 2) {
        printError(info: 'Invalid discount format: ${order.discount}');
        return 0.0;
      }

      // Parse the discount value
      final discountValue = double.tryParse(parts[0]);
      if (discountValue == null) {
        printError(info: 'Invalid discount value: ${parts[0]}');
        return 0.0;
      }

      // Calculate based on discount type
      final discountType = parts[1].toLowerCase();
      final orderTotal = totalOrderAmount(order);

      if (discountType == 'percentage') {
        // Percentage discount (0-100)
        if (discountValue < 0 || discountValue > 100) {
          printError(info: 'Percentage discount must be between 0-100');
          return 0.0;
        }
        return (orderTotal * discountValue) / 100;
      } else if (discountType == 'fixed') {
        // Fixed amount discount
        if (discountValue < 0) {
          printError(info: 'Fixed discount cannot be negative');
          return 0.0;
        }
        // Return the lesser of discount value or order total
        return discountValue > orderTotal ? orderTotal : discountValue;
      } else {
        printError(info: 'Unknown discount type: $discountType');
        return 0.0;
      }
    } catch (e, stackTrace) {
      printError(info: 'Error calculating discount: $e\n$stackTrace');
      return 0.0;
    }
  }

  bool isDiscountApplied() {
    final order = currentOrder;
    if (order == null) {
      return false;
    }
    if (order.discount == null || order.discount!.isEmpty) {
      return false;
    }

    return true;
  }
}

enum OrderMode { normal, addMore, edit }
