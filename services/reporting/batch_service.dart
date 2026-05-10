// lib/app/services/batch_service/batch_service.dart
import 'dart:async';
import 'package:get/get.dart';
import 'package:hse_pos/app/repos/batch_reports_repository/batch_reports_repository.dart';
import 'package:uuid/uuid.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/batch_report_model/batch_report_model.dart';
import 'package:hse_pos/app/core/utils/helpers/current_location.dart';

class BatchService extends GetxService {
  final BatchReportsRepository _batchRepository;

  // Observable current active batch
  final Rxn<BatchReportModel> activeBatch = Rxn<BatchReportModel>();

  // Real-time batch stats
  final Rx<BatchReportStats?> currentBatchStats = Rx<BatchReportStats?>(null);

  // Timer for auto-closure check
  Timer? _midnightCheckTimer;

  // Stream subscriptions
  StreamSubscription? _batchWatchSubscription;

  static BatchService get instance => Get.find<BatchService>();

  BatchService({BatchReportsRepository? batchRepository})
    : _batchRepository =
          batchRepository ?? BatchReportsRepository(locator<TestDatabase>());

  @override
  Future<void> onInit() async {
    super.onInit();
    await initializeBatchSystem();
    _startMidnightCheckTimer();
  }

  @override
  void onClose() {
    _midnightCheckTimer?.cancel();
    _batchWatchSubscription?.cancel();
    super.onClose();
  }

  /// Initialize batch system on app start
  Future<void> initializeBatchSystem() async {
    try {
      final locationId = getLocationId(initial: true);
      if (locationId == null) {
        printError(info: 'Cannot initialize batch: No location ID available');
        return;
      }

      // Check for active batch
      final existingBatch = await _batchRepository.getActiveBatchReport(
        locationId: locationId.toString(),
      );

      if (existingBatch != null) {
        // Active batch exists
        activeBatch.value = existingBatch;

        // Check if it should have been closed (day changed)
        if (_shouldAutoCloseBatch(existingBatch.start_date ?? DateTime.now())) {
          await _autoCloseBatch(existingBatch);
          await _createNewBatch();
        } else {
          // Watch active batch for changes
          _watchActiveBatch(locationId.toString());
        }
      } else {
        // No active batch - create one
        await _createNewBatch();
      }
    } catch (e, stackTrace) {
      printError(info: 'Error initializing batch system: $e\n$stackTrace');
    }
  }

  /// Create a new batch report
  Future<bool> _createNewBatch() async {
    try {
      final locationId = getLocationId(initial: true);
      final terminalId = getTerminalId(initial: true);

      if (locationId == null || terminalId == null) {
        printError(
          info: 'Cannot create batch: Missing location or terminal ID',
        );
        return false;
      }

      final uuid = const Uuid().v4();
      final now = DateTime.now();
      final batchName = 'Batch ${_formatDate(now)}';

      final newBatch = BatchReportModel(
        uuid: uuid,
        batch_name: batchName,
        start_date: now,
        status: 'ACTIVE',
        location_id: locationId.toString(),
        terminal_id: terminalId.toString(),
        total_sales: 0.0,
        total_cost: 0.0,
        gross_profit: 0.0,
        net_profit: 0.0,
        total_orders: 0,
        total_items_sold: 0,
        created_at: now.toIso8601String(),
        updated_at: now.toIso8601String(),
      );

      await _batchRepository.createBatchReport(newBatch);
      activeBatch.value = newBatch;

      // Start watching the new batch
      _watchActiveBatch(locationId.toString());

      printInfo(info: 'New batch created: $batchName (UUID: $uuid)');
      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error creating new batch: $e\n$stackTrace');
      return false;
    }
  }

  /// Manually start a new batch (closes current if active)
  Future<bool> startNewBatch() async {
    try {
      if (activeBatch.value != null && activeBatch.value!.status == 'ACTIVE') {
        // Close current batch first
        final closed = await closeBatch(activeBatch.value!.uuid!);
        if (!closed) {
          printError(
            info: 'Failed to close current batch before starting new one',
          );
          return false;
        }
      }

      return await _createNewBatch();
    } catch (e, stackTrace) {
      printError(info: 'Error starting new batch: $e\n$stackTrace');
      return false;
    }
  }

  /// Close the current active batch
  Future<bool> closeBatch(String uuid) async {
    try {
      // Calculate final stats
      final stats = await calculateBatchStats(uuid);

      if (stats == null) {
        printError(info: 'Cannot close batch: Failed to calculate stats');
        return false;
      }

      // Close the batch with final stats
      final success = await _batchRepository.closeBatchReport(
        uuid,
        totalSales: stats.grossSales,
        totalCost: 0.0, // Will be calculated when cost tracking is added
        grossProfit: stats.grossSales, // Temporary until cost tracking
        netProfit: stats.netSales,
        totalOrders: stats.totalOrders,
        totalItemsSold: _calculateTotalItems(stats),
        categoryBreakdown: _convertCategoryStatsToMap(stats.categoryStats),
        productBreakdown: _convertTopProductsToMap(stats.topProducts),
        paymentMethodBreakdown: stats.paymentMethodBreakdown,
        serviceTypeBreakdown: stats.serviceTypeBreakdown,
      );

      if (success) {
        activeBatch.value = activeBatch.value?.copyWith(
          status: 'CLOSED',
          end_date: DateTime.now(),
          closed_at: DateTime.now().toIso8601String(),
        );
        printInfo(info: 'Batch closed successfully: $uuid');
      }

      return success;
    } catch (e, stackTrace) {
      printError(info: 'Error closing batch: $e\n$stackTrace');
      return false;
    }
  }

  /// Auto-close batch at midnight
  Future<void> _autoCloseBatch(BatchReportModel batch) async {
    try {
      printInfo(
        info: 'Auto-closing batch due to day change: ${batch.batch_name}',
      );
      await closeBatch(batch.uuid!);
    } catch (e, stackTrace) {
      printError(info: 'Error auto-closing batch: $e\n$stackTrace');
    }
  }

  /// Check if batch should be auto-closed (day changed)
  bool _shouldAutoCloseBatch(DateTime batchStartDate) {
    final now = DateTime.now();
    return batchStartDate.year != now.year ||
        batchStartDate.month != now.month ||
        batchStartDate.day != now.day;
  }

  /// Start timer to check for midnight
  void _startMidnightCheckTimer() {
    // Calculate time until next midnight
    final now = DateTime.now();
    final tomorrow = DateTime(now.year, now.month, now.day + 1);
    final durationUntilMidnight = tomorrow.difference(now);

    // Set initial timer for midnight
    _midnightCheckTimer = Timer(durationUntilMidnight, () {
      _onMidnightReached();

      // Set up recurring daily timer
      _midnightCheckTimer = Timer.periodic(
        const Duration(days: 1),
        (_) => _onMidnightReached(),
      );
    });
  }

  /// Called when midnight is reached
  Future<void> _onMidnightReached() async {
    try {
      printInfo(info: 'Midnight reached - checking for batch auto-closure');

      if (activeBatch.value != null && activeBatch.value!.status == 'ACTIVE') {
        await _autoCloseBatch(activeBatch.value!);
        await _createNewBatch();
      }
    } catch (e, stackTrace) {
      printError(
        info: 'Error handling midnight batch closure: $e\n$stackTrace',
      );
    }
  }

  /// Watch active batch for changes
  void _watchActiveBatch(String locationId) {
    _batchWatchSubscription?.cancel();

    _batchWatchSubscription = _batchRepository
        .watchActiveBatchReport(locationId: locationId)
        .listen(
          (batch) {
            if (batch != null) {
              activeBatch.value = batch;
            }
          },
          onError: (error) {
            printError(info: 'Error watching active batch: $error');
          },
        );
  }

  /// Calculate real-time batch statistics
  Future<BatchReportStats?> calculateBatchStats(String batchUuid) async {
    try {
      final batch = await _batchRepository.getBatchReportByUuid(batchUuid);
      if (batch == null) return null;

      // Get all orders for this batch
      final database = locator<TestDatabase>();
      final ordersRepo = database.extOrdersRepository;

      final allOrders = await ordersRepo.getAllOrders(lastThreeDaysOnly: false);

      // Filter orders by batch time range
      final batchOrders = allOrders.where((order) {
        final orderDate =order.created_at ?? DateTime.now();


        final start = batch.start_date ?? DateTime.now();
        final end = batch.end_date ?? DateTime.now();

        return orderDate.isAfter(start) &&
            (batch.status == 'ACTIVE' || orderDate.isBefore(end));
      }).toList();

      // Calculate stats
      double grossSales = 0.0;
      double discounts = 0.0;
      double refunds = 0.0;
      final int totalOrders = batchOrders.length;
      int completedOrders = 0;
      int refundedOrders = 0;
      int voidedOrders = 0;
      int canceledOrders = 0;

      final Map<String, double> paymentMethodBreakdown = {};
      final Map<String, double> serviceTypeBreakdown = {};
      final Map<String, int> hourlyOrderCount = {};
      final Map<String, double> hourlySales = {};
      final Map<String, CategoryStats> categoryStats = {};
      final Map<String, StaffStats> staffStats = {};
      final Map<String, TopProductData> productDataMap = {};

      for (final order in batchOrders) {
        // Calculate order total
        double orderTotal = 0.0;
        int itemCount = 0;

        if (order.products != null) {
          for (final product in order.products!) {
            final qty = _parseDouble(product['qty'] ?? 1.0);
            final price = _parseDouble(product['selling_price'] ?? 0.0);
            orderTotal += price * qty;
            itemCount += qty.toInt();

            // Product stats
            final productUuid = product['uuid']?.toString() ?? '';
            final productName = product['name']?.toString() ?? 'Unknown';
            final categoryUuid = product['category_uuid']?.toString();

            if (productUuid.isNotEmpty) {
              if (productDataMap.containsKey(productUuid)) {
                final existing = productDataMap[productUuid]!;
                productDataMap[productUuid] = existing.copyWith(
                  quantitySold: existing.quantitySold + qty.toInt(),
                  revenue: existing.revenue + (price * qty),
                );
              } else {
                productDataMap[productUuid] = TopProductData(
                  productUuid: productUuid,
                  productName: productName,
                  quantitySold: qty.toInt(),
                  revenue: price * qty,
                  profit: price * qty, // Temporary until cost tracking
                  categoryUuid: categoryUuid,
                );
              }
            }

            // Category stats
            if (categoryUuid != null && categoryUuid.isNotEmpty) {
              if (categoryStats.containsKey(categoryUuid)) {
                final existing = categoryStats[categoryUuid]!;
                categoryStats[categoryUuid] = existing.copyWith(
                  itemsSold: existing.itemsSold + qty.toInt(),
                  revenue: existing.revenue + (price * qty),
                  orderCount: existing.orderCount + 1,
                );
              } else {
                // Get category name from database
                final categoryName = await _getCategoryName(categoryUuid);
                categoryStats[categoryUuid] = CategoryStats(
                  categoryUuid: categoryUuid,
                  categoryName: categoryName,
                  itemsSold: qty.toInt(),
                  revenue: price * qty,
                  orderCount: 1,
                  averageItemPrice: price,
                );
              }
            }
          }
        }

        // Apply discount
        if (order.discount != null && order.discount!.isNotEmpty) {
          final discountValue = _parseDiscount(order.discount, orderTotal);
          discounts += discountValue;
          orderTotal -= discountValue;
        }

        grossSales += orderTotal;

        // Order status counts
        final status = order.last_status?.toLowerCase() ?? '';
        if (status == 'completed') {
          completedOrders++;
        } else if (status == 'refund') {
          refundedOrders++;
          refunds += orderTotal;
        } else if (status == 'voided') {
          voidedOrders++;
        } else if (status == 'canceled') {
          canceledOrders++;
        }

        // Service type breakdown
        final serviceType = order.service_type ?? 'Unknown';
        serviceTypeBreakdown[serviceType] =
            (serviceTypeBreakdown[serviceType] ?? 0.0) + orderTotal;

        // Payment method breakdown
        if (order.payments != null && order.payments!.isNotEmpty) {
          for (final payment in order.payments!) {
            final method = payment['type']?.toString() ?? 'Unknown';
            final amount = _parseDouble(payment['amount'] ?? 0.0);
            paymentMethodBreakdown[method] =
                (paymentMethodBreakdown[method] ?? 0.0) + amount;
          }
        }

        // Hourly breakdown
        final orderDate = order.created_at ?? DateTime.now();
        final hour = '${orderDate.hour.toString().padLeft(2, '0')}:00';
        hourlyOrderCount[hour] = (hourlyOrderCount[hour] ?? 0) + 1;
        hourlySales[hour] = (hourlySales[hour] ?? 0.0) + orderTotal;

        // Staff stats (if staff info available in order)
        // TODO: Add staff tracking to orders
      }

      // Sort top products by revenue
      final topProducts = productDataMap.values.toList()
        ..sort((a, b) => b.revenue.compareTo(a.revenue));

      final netSales = grossSales - discounts - refunds;
      final averageOrderValue = totalOrders > 0
          ? grossSales / totalOrders
          : 0.0;

      return BatchReportStats(
        batchUuid: batchUuid,
        grossSales: grossSales,
        netSales: netSales,
        discounts: discounts,
        refunds: refunds,
        tax: 0.0, // TODO: Calculate when tax system is implemented
        totalOrders: totalOrders,
        completedOrders: completedOrders,
        refundedOrders: refundedOrders,
        voidedOrders: voidedOrders,
        canceledOrders: canceledOrders,
        averageOrderValue: averageOrderValue,
        paymentMethodBreakdown: paymentMethodBreakdown,
        serviceTypeBreakdown: serviceTypeBreakdown,
        hourlyOrderCount: hourlyOrderCount,
        hourlySales: hourlySales,
        topProducts: topProducts.take(20).toList(),
        categoryStats: categoryStats,
        staffStats: staffStats,
        calculatedAt: DateTime.now(),
      );
    } catch (e, stackTrace) {
      printError(info: 'Error calculating batch stats: $e\n$stackTrace');
      return null;
    }
  }

  /// Update batch stats in real-time
  Future<void> updateBatchStats() async {
    try {
      if (activeBatch.value == null || activeBatch.value!.status != 'ACTIVE') {
        return;
      }

      final stats = await calculateBatchStats(activeBatch.value!.uuid!);
      if (stats != null) {
        currentBatchStats.value = stats;

        // Update batch record with latest stats
        await _batchRepository.updateBatchReportStats(
          activeBatch.value!.uuid!,
          totalSales: stats.grossSales,
          totalCost: 0.0,
          grossProfit: stats.grossSales,
          netProfit: stats.netSales,
          totalOrders: stats.totalOrders,
          totalItemsSold: _calculateTotalItems(stats),
        );
      }
    } catch (e, stackTrace) {
      printError(info: 'Error updating batch stats: $e\n$stackTrace');
    }
  }

  /// Get batch history
  Future<List<BatchReportModel>> getBatchHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? locationId,
  }) async {
    try {
      locationId ??= getLocationId(initial: true).toString();

      final start =
          startDate ?? DateTime.now().subtract(const Duration(days: 30));
      final end = endDate ?? DateTime.now();

      return await _batchRepository.getBatchReportsByDateRange(
        startDate: start,
        endDate: end,
        locationId: locationId,
      );
    } catch (e, stackTrace) {
      printError(info: 'Error getting batch history: $e\n$stackTrace');
      return [];
    }
  }

  /// Get specific batch by UUID
  Future<BatchReportModel?> getBatchByUuid(String uuid) async {
    try {
      return await _batchRepository.getBatchReportByUuid(uuid);
    } catch (e, stackTrace) {
      printError(info: 'Error getting batch by UUID: $e\n$stackTrace');
      return null;
    }
  }

  // Helper methods

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

  double _parseDiscount(String? discount, double total) {
    try {
      if (discount == null || discount.isEmpty) return 0.0;

      final parts = discount.split(',');
      if (parts.length != 2) return 0.0;

      final value = double.tryParse(parts[0]) ?? 0.0;
      final type = parts[1].toLowerCase();

      if (type == 'percentage') {
        return (total * value) / 100;
      } else if (type == 'fixed') {
        return value > total ? total : value;
      }
      return 0.0;
    } catch (_) {
      return 0.0;
    }
  }

  int _calculateTotalItems(BatchReportStats stats) {
    return stats.topProducts.fold<int>(
      0,
      (sum, product) => sum + product.quantitySold,
    );
  }

  Map<String, dynamic> _convertCategoryStatsToMap(
    Map<String, CategoryStats> categoryStats,
  ) {
    return categoryStats.map(
      (key, value) => MapEntry(key, {
        'name': value.categoryName,
        'items_sold': value.itemsSold,
        'revenue': value.revenue,
        'order_count': value.orderCount,
        'average_price': value.averageItemPrice,
      }),
    );
  }

  Map<String, dynamic> _convertTopProductsToMap(List<TopProductData> products) {
    final Map<String, dynamic> result = {};
    for (var i = 0; i < products.length; i++) {
      final product = products[i];
      result[product.productUuid] = {
        'name': product.productName,
        'quantity_sold': product.quantitySold,
        'revenue': product.revenue,
        'profit': product.profit,
        'rank': i + 1,
      };
    }
    return result;
  }

  Future<String> _getCategoryName(String categoryUuid) async {
    try {
      final database = locator<TestDatabase>();
      final categoryRepo = database.categoriesRepository;
      return await categoryRepo.getCategoryNameByUuid(categoryUuid) ??
          'Unknown';
    } catch (_) {
      return 'Unknown';
    }
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  void printInfo({required String info}) {
    print('[BatchService] $info');
  }

  void printError({required String info}) {
    print('[BatchService ERROR] $info');
  }

  /// Get batch statistics (for specific or current active batch)
  Future<BatchReportStats?> getBatchStats({String? batchUuid}) async {
    try {
      // Use provided UUID or the current active batch
      final targetUuid = batchUuid ?? activeBatch.value?.uuid;

      if (targetUuid == null) {
        printError(
          info:
              'Cannot get batch stats: No batch UUID provided or active batch found',
        );
        return null;
      }

      printInfo(info: 'Fetching stats for batch: $targetUuid');

      // Calculate stats based on all orders linked to this batch
      final stats = await calculateBatchStats(targetUuid);

      if (stats == null) {
        printError(info: 'Failed to calculate stats for batch: $targetUuid');
        return null;
      }

      // Store in observable (optional — keeps live data accessible)
      currentBatchStats.value = stats;

      printInfo(info: 'Batch stats fetched successfully for: $targetUuid');
      return stats;
    } catch (e, stackTrace) {
      printError(info: 'Error getting batch stats: $e\n$stackTrace');
      return null;
    }
  }
}
