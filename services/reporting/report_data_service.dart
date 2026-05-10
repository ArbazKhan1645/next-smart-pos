// lib/app/services/reports_service/reports_data_service.dart
import 'dart:async';
import 'package:get/get.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/ext_orders_model/ext_orders_model.dart';
import 'package:hse_pos/app/repos/ext_orders_repo/ext_orders_repository.dart';
import 'package:hse_pos/app/services/reporting/batch_service.dart';

class ReportsDataService extends GetxService {
  final ExtOrdersRepository _ordersRepository;
  final BatchService _batchService;

  // Cache for performance
  List<ExtOrdersModel>? _cachedOrders;
  DateTime? _cacheTimestamp;
  static const _cacheValidDuration = Duration(seconds: 30);

  static ReportsDataService get instance => Get.find<ReportsDataService>();

  ReportsDataService({
    ExtOrdersRepository? ordersRepository,
    BatchService? batchService,
  }) : _ordersRepository =
           ordersRepository ?? ExtOrdersRepository(locator<TestDatabase>()),
       _batchService = batchService ?? BatchService.instance;

  /// Get orders with caching
  Future<List<ExtOrdersModel>> _getOrders({bool forceRefresh = false}) async {
    if (!forceRefresh &&
        _cachedOrders != null &&
        _cacheTimestamp != null &&
        DateTime.now().difference(_cacheTimestamp!) < _cacheValidDuration) {
      return _cachedOrders!;
    }

    _cachedOrders = await _ordersRepository.getAllOrders(
      lastThreeDaysOnly: false,
    );
    _cacheTimestamp = DateTime.now();
    return _cachedOrders!;
  }

  /// Clear cache
  void clearCache() {
    _cachedOrders = null;
    _cacheTimestamp = null;
  }

  /// Get orders by date range
  Future<List<ExtOrdersModel>> getOrdersByDateRange({
    required DateTime startDate,
    required DateTime endDate,
    List<String>? statuses,
    String? serviceType,
    String? customerId,
  }) async {
    try {
      final allOrders = await _getOrders();

      return allOrders.where((order) {
        // Date filter
        final orderDate = order.created_at ?? DateTime.now();

        if (orderDate.isBefore(startDate) || orderDate.isAfter(endDate)) {
          return false;
        }

        // Status filter
        if (statuses != null && statuses.isNotEmpty) {
          if (!statuses.contains(order.last_status?.toLowerCase())) {
            return false;
          }
        }

        // Service type filter
        if (serviceType != null &&
            order.service_type?.toLowerCase() != serviceType.toLowerCase()) {
          return false;
        }

        // Customer filter
        if (customerId != null && order.customer_uuid != customerId) {
          return false;
        }

        return true;
      }).toList();
    } catch (e) {
      printError(info: 'Error getting orders by date range: $e');
      return [];
    }
  }

  /// Get orders for today
  Future<List<ExtOrdersModel>> getTodayOrders() async {
    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = startOfDay.add(const Duration(days: 1));

    return await getOrdersByDateRange(startDate: startOfDay, endDate: endOfDay);
  }

  /// Get completed orders
  Future<List<ExtOrdersModel>> getCompletedOrders({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final start =
        startDate ?? DateTime.now().subtract(const Duration(days: 30));
    final end = endDate ?? DateTime.now();

    return await getOrdersByDateRange(
      startDate: start,
      endDate: end,
      statuses: ['completed'],
    );
  }

  /// Get refunded orders
  Future<List<ExtOrdersModel>> getRefundedOrders({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final start =
        startDate ?? DateTime.now().subtract(const Duration(days: 30));
    final end = endDate ?? DateTime.now();

    return await getOrdersByDateRange(
      startDate: start,
      endDate: end,
      statuses: ['refund'],
    );
  }

  /// Get voided orders
  Future<List<ExtOrdersModel>> getVoidedOrders({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final start =
        startDate ?? DateTime.now().subtract(const Duration(days: 30));
    final end = endDate ?? DateTime.now();

    return await getOrdersByDateRange(
      startDate: start,
      endDate: end,
      statuses: ['voided'],
    );
  }

  /// Calculate revenue summary
  Future<Map<String, dynamic>> calculateRevenueSummary({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 30)),
        endDate: endDate ?? DateTime.now(),
      );

      double grossSales = 0.0;
      double totalDiscounts = 0.0;
      double totalRefunds = 0.0;
      int completedOrders = 0;
      int refundedOrders = 0;
      int voidedOrders = 0;
      final int totalOrders = orders.length;

      for (final order in orders) {
        final orderTotal = _calculateOrderTotal(order);
        final discount = _calculateOrderDiscount(order, orderTotal);

        final status = order.last_status?.toLowerCase() ?? '';

        if (status == 'completed') {
          completedOrders++;
          grossSales += orderTotal;
          totalDiscounts += discount;
        } else if (status == 'refund') {
          refundedOrders++;
          totalRefunds += orderTotal;
        } else if (status == 'voided') {
          voidedOrders++;
        }
      }

      final netSales = grossSales - totalDiscounts - totalRefunds;
      final averageOrderValue = completedOrders > 0
          ? grossSales / completedOrders
          : 0.0;

      return {
        'gross_sales': grossSales,
        'net_sales': netSales,
        'total_discounts': totalDiscounts,
        'total_refunds': totalRefunds,
        'total_orders': totalOrders,
        'completed_orders': completedOrders,
        'refunded_orders': refundedOrders,
        'voided_orders': voidedOrders,
        'average_order_value': averageOrderValue,
        'total_tax': 0.0, // TODO: Calculate when tax system is ready
      };
    } catch (e) {
      printError(info: 'Error calculating revenue summary: $e');
      return {};
    }
  }

  /// Get hourly sales breakdown
  Future<Map<int, Map<String, dynamic>>> getHourlySalesBreakdown({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 1)),
        endDate: endDate ?? DateTime.now(),
        statuses: ['completed'],
      );

      final Map<int, Map<String, dynamic>> hourlyData = {};

      // Initialize all hours
      for (int hour = 0; hour < 24; hour++) {
        hourlyData[hour] = {
          'hour': hour,
          'sales': 0.0,
          'order_count': 0,
          'items_sold': 0,
        };
      }

      for (final order in orders) {
        final orderDate = order.created_at ?? DateTime.now();

        final hour = orderDate.hour;
        final orderTotal = _calculateOrderTotal(order);
        final discount = _calculateOrderDiscount(order, orderTotal);
        final netTotal = orderTotal - discount;

        hourlyData[hour]!['sales'] =
            (hourlyData[hour]!['sales'] as double) + netTotal;
        hourlyData[hour]!['order_count'] =
            (hourlyData[hour]!['order_count'] as int) + 1;
        hourlyData[hour]!['items_sold'] =
            (hourlyData[hour]!['items_sold'] as int) +
            (order.products?.length ?? 0);
      }

      return hourlyData;
    } catch (e) {
      printError(info: 'Error getting hourly sales breakdown: $e');
      return {};
    }
  }

  /// Get top selling products
  Future<List<Map<String, dynamic>>> getTopProducts({
    DateTime? startDate,
    DateTime? endDate,
    int limit = 10,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 30)),
        endDate: endDate ?? DateTime.now(),
        statuses: ['completed'],
      );

      final Map<String, Map<String, dynamic>> productStats = {};

      for (final order in orders) {
        if (order.products == null) continue;

        for (final product in order.products!) {
          final uuid = product['uuid']?.toString() ?? '';
          if (uuid.isEmpty) continue;

          final qty = _parseDouble(product['qty'] ?? 1.0);
          final price = _parseDouble(product['selling_price'] ?? 0.0);
          final revenue = price * qty;

          if (productStats.containsKey(uuid)) {
            productStats[uuid]!['quantity_sold'] =
                (productStats[uuid]!['quantity_sold'] as int) + qty.toInt();
            productStats[uuid]!['revenue'] =
                (productStats[uuid]!['revenue'] as double) + revenue;
          } else {
            productStats[uuid] = {
              'uuid': uuid,
              'name': product['name'] ?? 'Unknown',
              'quantity_sold': qty.toInt(),
              'revenue': revenue,
              'category_uuid': product['category_uuid'],
            };
          }
        }
      }

      final sortedProducts = productStats.values.toList()
        ..sort(
          (a, b) => (b['revenue'] as double).compareTo(a['revenue'] as double),
        );

      return sortedProducts.take(limit).toList();
    } catch (e) {
      printError(info: 'Error getting top products: $e');
      return [];
    }
  }

  /// Get category performance
  Future<List<Map<String, dynamic>>> getCategoryPerformance({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 30)),
        endDate: endDate ?? DateTime.now(),
        statuses: ['completed'],
      );

      final Map<String, Map<String, dynamic>> categoryStats = {};

      for (final order in orders) {
        if (order.products == null) continue;

        for (final product in order.products!) {
          final categoryUuid = product['category_uuid']?.toString();
          if (categoryUuid == null || categoryUuid.isEmpty) continue;

          final qty = _parseDouble(product['qty'] ?? 1.0);
          final price = _parseDouble(product['selling_price'] ?? 0.0);
          final revenue = price * qty;

          if (categoryStats.containsKey(categoryUuid)) {
            categoryStats[categoryUuid]!['items_sold'] =
                (categoryStats[categoryUuid]!['items_sold'] as int) +
                qty.toInt();
            categoryStats[categoryUuid]!['revenue'] =
                (categoryStats[categoryUuid]!['revenue'] as double) + revenue;
            categoryStats[categoryUuid]!['order_count'] =
                (categoryStats[categoryUuid]!['order_count'] as int) + 1;
          } else {
            // Get category name
            final categoryName = await _getCategoryName(categoryUuid);
            categoryStats[categoryUuid] = {
              'uuid': categoryUuid,
              'name': categoryName,
              'items_sold': qty.toInt(),
              'revenue': revenue,
              'order_count': 1,
            };
          }
        }
      }

      final sortedCategories = categoryStats.values.toList()
        ..sort(
          (a, b) => (b['revenue'] as double).compareTo(a['revenue'] as double),
        );

      return sortedCategories;
    } catch (e) {
      printError(info: 'Error getting category performance: $e');
      return [];
    }
  }

  /// Get payment method breakdown
  Future<Map<String, double>> getPaymentMethodBreakdown({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 30)),
        endDate: endDate ?? DateTime.now(),
        statuses: ['completed'],
      );

      final Map<String, double> paymentMethods = {};

      for (final order in orders) {
        if (order.payments == null || order.payments!.isEmpty) continue;

        for (final payment in order.payments!) {
          final method = payment['type']?.toString() ?? 'Unknown';
          final amount = _parseDouble(payment['amount'] ?? 0.0);
          paymentMethods[method] = (paymentMethods[method] ?? 0.0) + amount;
        }
      }

      return paymentMethods;
    } catch (e) {
      printError(info: 'Error getting payment method breakdown: $e');
      return {};
    }
  }

  /// Get service type breakdown
  Future<Map<String, Map<String, dynamic>>> getServiceTypeBreakdown({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final orders = await getOrdersByDateRange(
        startDate:
            startDate ?? DateTime.now().subtract(const Duration(days: 30)),
        endDate: endDate ?? DateTime.now(),
        statuses: ['completed'],
      );

      final Map<String, Map<String, dynamic>> serviceTypes = {};

      for (final order in orders) {
        final serviceType = order.service_type ?? 'Unknown';
        final orderTotal = _calculateOrderTotal(order);
        final discount = _calculateOrderDiscount(order, orderTotal);
        final netTotal = orderTotal - discount;

        if (serviceTypes.containsKey(serviceType)) {
          serviceTypes[serviceType]!['order_count'] =
              (serviceTypes[serviceType]!['order_count'] as int) + 1;
          serviceTypes[serviceType]!['revenue'] =
              (serviceTypes[serviceType]!['revenue'] as double) + netTotal;
        } else {
          serviceTypes[serviceType] = {
            'service_type': serviceType,
            'order_count': 1,
            'revenue': netTotal,
          };
        }
      }

      return serviceTypes;
    } catch (e) {
      printError(info: 'Error getting service type breakdown: $e');
      return {};
    }
  }

  /// Calculate order total
  double _calculateOrderTotal(ExtOrdersModel order) {
    if (order.products == null || order.products!.isEmpty) return 0.0;

    double total = 0.0;
    for (final product in order.products!) {
      final qty = _parseDouble(product['qty'] ?? 1.0);
      final price = _parseDouble(product['selling_price'] ?? 0.0);

      // Base product price
      total += price * qty;

      // Add modifiers
      if (product['modifiers'] != null && product['modifiers'] is List) {
        for (final modifier in product['modifiers']) {
          final modPrice = _parseDouble(modifier['singlePrice'] ?? 0.0);
          final modQty = _parseDouble(modifier['qty'] ?? 1.0);
          total += modPrice * modQty;
        }
      }
    }

    return total;
  }

  /// Calculate order discount
  double _calculateOrderDiscount(ExtOrdersModel order, double orderTotal) {
    try {
      if (order.discount == null || order.discount!.isEmpty) return 0.0;

      final parts = order.discount!.split(',');
      if (parts.length != 2) return 0.0;

      final value = double.tryParse(parts[0]) ?? 0.0;
      final type = parts[1].toLowerCase();

      if (type == 'percentage') {
        return (orderTotal * value) / 100;
      } else if (type == 'fixed') {
        return value > orderTotal ? orderTotal : value;
      }
      return 0.0;
    } catch (_) {
      return 0.0;
    }
  }

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

  void printError({required String info}) {
    print('[ReportsDataService ERROR] $info');
  }
}
