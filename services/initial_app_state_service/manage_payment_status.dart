// update_payment_status.dart
part of 'initial_app_state_service.dart';

extension ManagePaymentStatus on InitialAppStateService {
  // Payment Methods
  static const List<String> PAYMENT_METHODS = ['CASH', 'CARD', 'PAID'];

  // Payment Statuses
  static const List<String> PAYMENT_STATUSES = [
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
    'PARTIAL',
    'CANCELLED',
  ];

  // Fetch order from repository
  Future<ExtOrdersModel?> _getOrderFromRepository(String? orderId) async {
    if (orderId == null) return currentOrder;

    try {
      // First try to get from repository
      final order = await _extOrdersRepository.getOrderByUuid(orderId);
      if (order != null) return order;

      // Fallback to active orders if not found in repository
      return activeOrders.firstWhereOrNull((o) => o.uuid == orderId);
    } catch (e) {
      printError(info: 'Error fetching order from repository: $e');
      return null;
    }
  }

  Future<bool> addPaymentToOrder({
    required String paymentMethod,
    required double amount,
    String? specificOrderId,
    Map<String, dynamic>? additionalData,
    bool isRefundOrder = false,
  }) async {
    try {
      if (!PAYMENT_METHODS.contains(paymentMethod.toUpperCase())) {
        printError(info: 'Invalid payment method: $paymentMethod');
        return false;
      }

      // Fetch order from repository
      final ExtOrdersModel? orderToUpdate = await _getOrderFromRepository(
        specificOrderId,
      );

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final paymentId = const Uuid().v4();
      final currentTime = DateTime.now();

      final payment = {
        'id': paymentId,
        'type': paymentMethod.toUpperCase(),
        'amount': amount,
        'status': isRefundOrder ? 'REFUNDED' : 'COMPLETED',
        'initiated_at': currentTime.toIso8601String(),
        'completed_at': currentTime.toIso8601String(),
        'gateway': paymentMethod == 'CARD' ? 'stripe' : null,
        'reference': additionalData?['reference'],
        'user_id': 'system',
        ...?additionalData,
      };

      final payments = List<Map<String, dynamic>>.from(
        orderToUpdate.payments ?? [],
      );
      payments.add(payment);

      // Calculate payment status
      final orderTotal = totalOrderAmount(orderToUpdate);
      final totalPaid = payments.fold<double>(
        0.0,
        (sum, payment) => sum + (payment['amount'] ?? 0.0),
      );

      String paymentStatus = 'PENDING';
      if (totalPaid >= orderTotal) {
        paymentStatus = 'COMPLETED';
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL';
      }

      final updatedOrder = orderToUpdate.copyWith(
        payments: payments,
        updated_at: currentTime,
      );

      // Update in database
      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders if exists
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error adding payment: $e\n$stackTrace');
      return false;
    }
  }

  // Async version for checking payment status
  Future<bool> isOrderPaidAsync({String? specificOrderId}) async {
    final ExtOrdersModel? order = await _getOrderFromRepository(specificOrderId);

    if (order == null) return false;

    final payments = order.payments ?? [];
    if (payments.isEmpty) return false;

    final totalPaid = payments.fold<double>(0.0, (sum, payment) {
      return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
    });

    final orderTotal = totalOrderAmount(order);
    return totalPaid >= orderTotal;
  }

  // Sync version for backward compatibility (tries to use cached data first)
  bool isOrderPaid({String? specificOrderId}) {
    ExtOrdersModel? order;

    if (specificOrderId != null) {
      // Try active orders first for performance
      order = activeOrders.firstWhereOrNull((o) => o.uuid == specificOrderId);
    } else {
      order = currentOrder;
    }

    if (order == null) return false;

    final payments = order.payments ?? [];
    if (payments.isEmpty) return false;

    final totalPaid = payments.fold<double>(0.0, (sum, payment) {
      final status = payment['status']?.toString().toLowerCase() ?? '';
      if (status == 'completed' || status == 'paid') {
        return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
      }
      return sum;
    });

    final orderTotal = totalOrderAmount(order);
    return totalPaid >= orderTotal;
  }

  Future<double> getRemainingPaymentAsync({String? specificOrderId}) async {
    final ExtOrdersModel? order = await _getOrderFromRepository(specificOrderId);

    if (order == null) return 0.0;

    final orderTotal = totalOrderAmount(order);
    final payments = order.payments ?? [];

    final totalPaid = payments.fold<double>(0.0, (sum, payment) {
      final status = payment['status']?.toString().toLowerCase() ?? '';
      if (status == 'completed' || status == 'paid') {
        return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
      }
      return sum;
    });

    return (orderTotal - totalPaid).clamp(0.0, double.infinity);
  }

  double getRemainingPayment({String? specificOrderId}) {
    ExtOrdersModel? order;

    if (specificOrderId != null) {
      order = activeOrders.firstWhereOrNull((o) => o.uuid == specificOrderId);
    } else {
      order = currentOrder;
    }

    if (order == null) return 0.0;

    final orderTotal = totalOrderAmount(order);
    final payments = order.payments ?? [];

    final totalPaid = payments.fold<double>(0.0, (sum, payment) {
      final status = payment['status']?.toString().toLowerCase() ?? '';
      if (status == 'completed' || status == 'paid') {
        return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
      }
      return sum;
    });

    return (orderTotal - totalPaid).clamp(0.0, double.infinity);
  }

  Future<bool> refundPayment({
    required String paymentId,
    double? amount,
    String? reason,
    String? specificOrderId,
  }) async {
    try {
      final ExtOrdersModel? orderToUpdate = await _getOrderFromRepository(
        specificOrderId,
      );

      if (orderToUpdate == null) {
        printError(info: 'No order found');
        return false;
      }

      final payments = List<Map<String, dynamic>>.from(
        orderToUpdate.payments ?? [],
      );

      final paymentIndex = payments.indexWhere((p) => p['id'] == paymentId);

      if (paymentIndex == -1) {
        printError(info: 'Payment not found');
        return false;
      }

      final currentTime = DateTime.now();
      final refundAmount =
          amount ??
          (double.tryParse(payments[paymentIndex]['amount'].toString()) ?? 0.0);

      // Add refund record
      final refund = {
        'id': const Uuid().v4(),
        'payment_id': paymentId,
        'amount': refundAmount,
        'reason': reason ?? 'Customer requested',
        'status': 'COMPLETED',
        'refunded_at': currentTime.toIso8601String(),
        'refunded_by': 'system',
      };

      payments[paymentIndex]['status'] = 'REFUNDED';
      payments[paymentIndex]['refund'] = refund;

      // Recalculate payment status
      final orderTotal = totalOrderAmount(orderToUpdate);
      final totalPaid = payments.fold<double>(0.0, (sum, payment) {
        final status = payment['status']?.toString().toLowerCase() ?? '';
        if (status == 'completed' || status == 'paid') {
          return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
        }
        return sum;
      });

      String paymentStatus = 'REFUNDED';
      if (totalPaid >= orderTotal) {
        paymentStatus = 'COMPLETED';
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL';
      }

      final updatedOrder = orderToUpdate.copyWith(
        payments: payments,

        last_status: 'REFUNDED',
        updated_at: currentTime,
      );

      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        orderToUpdate.uuid!,
      );

      // Update in active orders if exists
      final index = activeOrders.indexWhere(
        (order) => order.uuid == orderToUpdate.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error refunding payment: $e\n$stackTrace');
      return false;
    }
  }

  // Helper method to get payment summary
  Future<Map<String, dynamic>> getPaymentSummaryAsync({
    String? specificOrderId,
  }) async {
    final ExtOrdersModel? order = await _getOrderFromRepository(specificOrderId);

    if (order == null) {
      return {
        'orderTotal': 0.0,
        'totalPaid': 0.0,
        'remaining': 0.0,
        'isPaid': false,
        'paymentStatus': 'PENDING',
        'payments': [],
      };
    }

    final orderTotal = totalOrderAmount(order);
    final payments = order.payments ?? [];

    final totalPaid = payments.fold<double>(0.0, (sum, payment) {
      final status = payment['status']?.toString().toLowerCase() ?? '';
      if (status == 'completed' || status == 'paid') {
        return sum + (double.tryParse(payment['amount'].toString()) ?? 0.0);
      }
      return sum;
    });

    final remaining = (orderTotal - totalPaid).clamp(0.0, double.infinity);

    String paymentStatus = 'PENDING';
    if (totalPaid >= orderTotal) {
      paymentStatus = 'COMPLETED';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL';
    }

    return {
      'orderTotal': orderTotal,
      'totalPaid': totalPaid,
      'remaining': remaining,
      'isPaid': totalPaid >= orderTotal,
      'paymentStatus': paymentStatus,
      'payments': payments,
    };
  }
}
