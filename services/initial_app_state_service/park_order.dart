part of 'initial_app_state_service.dart';

extension ManageParkOrder on InitialAppStateService {
  Future<bool> parkOrder({String? specificOrderId}) async {
    ExtOrdersModel? orderToUpdate;
    try {
      ExtOrdersModel? orderToPark;

      if (specificOrderId != null) {
        // Park specific order
        final index = activeOrders.indexWhere(
          (order) => order.uuid == specificOrderId,
        );
        if (index == -1) {
          printError(info: 'Order with ID $specificOrderId not found');
          return false;
        }
        orderToPark = activeOrders[index];
      } else {
        // Park current order
        orderToPark = currentOrder;
      }

      if (orderToPark == null) {
        printError(info: 'Cannot park order: No order to park');
        return false;
      }

      // Validate order status
      final String? lastStatus = orderToPark.last_status;
      if (lastStatus != 'ACTIVATED' &&
          lastStatus?.toLowerCase() != 'in_progress') {
        printError(info: 'Cannot park order: Order is not in active session');
        return false;
      }

      // Check if order has products
      final List<Map<String, dynamic>>? products = orderToPark.products;
      if (products == null || products.isEmpty) {
        printError(info: 'Cannot park order: Order has no products');
        return false;
      }

      // Update order status to PARKED
      final ExtOrdersModel parkedOrder = orderToPark.copyWith(last_status: 'PARKED');

      orderToUpdate = parkedOrder;

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        parkedOrder,
        orderToPark.uuid!,
      );

      // Remove from active orders and add to parked orders
      activeOrders.removeWhere((order) => order.uuid == orderToPark!.uuid);
      parkedOrders.add(parkedOrder);

      // Adjust current index if necessary
      if (currentActiveOrderIndex.value >= activeOrders.length) {
        currentActiveOrderIndex.value = activeOrders.length - 1;
      }

      // Create new order if no active orders remain
      if (activeOrders.isEmpty) {
        await _createNewOrder();
      }

 

      return true;
    } catch (e) {
      printError(info: 'Error parking order: $e');
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
            orderData.remove('sale_channel_type');
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
            orderData['sale_channel_type'] = 'POS';

            final supabaseresult = await _orderSupabaseService.upsertRecord(
              orderData['uuid'],
              orderData,
            );

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

  Future<bool> holdOrder({String? specificOrderId}) async {
    try {
      ExtOrdersModel? orderToHold;

      if (specificOrderId != null) {
        final index = activeOrders.indexWhere(
          (order) => order.uuid == specificOrderId,
        );
        if (index == -1) {
          printError(info: 'Order with ID $specificOrderId not found');
          return false;
        }
        orderToHold = activeOrders[index];
      } else {
        orderToHold = currentOrder;
      }

      if (orderToHold == null) {
        printError(info: 'Cannot hold order: No order to hold');
        return false;
      }

      // Similar validation as park order
      final String? lastStatus = orderToHold.last_status;

      if (lastStatus != 'ACTIVATED' &&
          lastStatus?.toLowerCase() != 'in_progress') {
        printError(info: 'Cannot park order: Order is not in active session');
        return false;
      }

      final ExtOrdersModel heldOrder = orderToHold.copyWith(last_status: 'HELD');

      // Update in database using specific UUID
      await _extOrdersRepository.updateOrderByUUID(
        heldOrder,
        orderToHold.uuid!,
      );

      // Remove from active orders and add to held orders
      activeOrders.removeWhere((order) => order.uuid == orderToHold!.uuid);
      heldOrders.add(heldOrder);

      // Adjust current index if necessary
      if (currentActiveOrderIndex.value >= activeOrders.length) {
        currentActiveOrderIndex.value = activeOrders.length - 1;
      }

      // Create new order if no active orders remain
      if (activeOrders.isEmpty) {
        await _createNewOrder();
      }

      return true;
    } catch (e) {
      printError(info: 'Error holding order: $e');
      return false;
    }
  }

  Future<bool> resumeParkedOrder(String orderId) async {
    try {
      final parkedOrderIndex = parkedOrders.indexWhere(
        (order) => order.uuid == orderId,
      );
      if (parkedOrderIndex == -1) {
        printError(info: 'Parked order with ID $orderId not found');
        return false;
      }

      final orderToResume = parkedOrders[parkedOrderIndex];
      final resumedOrder = orderToResume.copyWith(last_status: 'ACTIVATED');

      // Update in database
      await _extOrdersRepository.updateOrderByUUID(resumedOrder, orderId);

      // Move from parked to active
      parkedOrders.removeAt(parkedOrderIndex);
      activeOrders.add(resumedOrder);

      // Switch to the resumed order
      currentActiveOrderIndex.value = activeOrders.length - 1;

      return true;
    } catch (e) {
      printError(info: 'Error resuming parked order: $e');
      return false;
    }
  }

  Future<bool> resumeHeldOrder(String orderId) async {
    try {
      final heldOrderIndex = heldOrders.indexWhere(
        (order) => order.uuid == orderId,
      );
      if (heldOrderIndex == -1) {
        printError(info: 'Held order with ID $orderId not found');
        return false;
      }

      final orderToResume = heldOrders[heldOrderIndex];
      final resumedOrder = orderToResume.copyWith(last_status: 'ACTIVATED');

      // Update in database
      await _extOrdersRepository.updateOrderByUUID(resumedOrder, orderId);

      // Move from held to active
      heldOrders.removeAt(heldOrderIndex);
      activeOrders.add(resumedOrder);

      // Switch to the resumed order
      currentActiveOrderIndex.value = activeOrders.length - 1;

      return true;
    } catch (e) {
      printError(info: 'Error resuming held order: $e');
      return false;
    }
  }
}

extension ManageVoidOrder on InitialAppStateService {
  Future<bool> voidOrder({String? specificOrderId}) async {
    try {
      ExtOrdersModel? orderToVoid;

      if (specificOrderId != null) {
        // Void specific order by ID
        final index = activeOrders.indexWhere(
          (order) => order.uuid == specificOrderId,
        );
        if (index == -1) {
          printError(
            info: 'Order with ID $specificOrderId not found in active orders',
          );
          return false;
        }
        orderToVoid = activeOrders[index];
      } else {
        // Void current order
        orderToVoid = currentOrder;
      }

      if (orderToVoid == null) {
        printError(info: 'Cannot void order: No order to void');
        return false;
      }

      // Validate order status
      final String? lastStatus = orderToVoid.last_status;
      if (lastStatus != 'ACTIVATED' &&
          lastStatus?.toLowerCase() != 'in_progress') {
        printError(info: 'Cannot park order: Order is not in active session');
        return false;
      }

      // Optional: Check if order has products (not mandatory but good practice)
      final List<Map<String, dynamic>>? products = orderToVoid.products;
      if (products == null || products.isEmpty) {
        printError(info: 'Cannot void order: Order has no products');
        return false;
      }

      // Call the hard delete function from your repository
      await _extOrdersRepository.deleteOrder(orderToVoid.id ?? -1);

      // Remove from active orders list
      activeOrders.removeWhere((order) => order.uuid == orderToVoid!.uuid);

      // Adjust current index if necessary
      if (currentActiveOrderIndex.value >= activeOrders.length) {
        currentActiveOrderIndex.value = activeOrders.length - 1;
      }

      // Create new order if no active orders remain
      if (activeOrders.isEmpty) {
        await _createNewOrder();
      }

      return true;
    } catch (e) {
      printError(info: 'Error voiding order: $e');
      return false;
    }
  }

  Future<bool> voidCurrentOrder() async {
    return await voidOrder();
  }

  Future<bool> voidOrderById(String orderId) async {
    return await voidOrder(specificOrderId: orderId);
  }
}
