// update_status.dart
part of 'initial_app_state_service.dart';

extension ManageOrderStatus on InitialAppStateService {
  // Standard Order Statuses
  static const Map<String, List<String>> SERVICE_ORDER_STATUSES = {
    'IN_STORE': [
      'ACTIVATED',
      'in_progress',
      'COMPLETED',
      'REFUNDED',
      'VOIDED',
      'HELD',
      'CANCELLED',
    ],
    'COLLECTION': [
      'ACTIVATED',
      'in_progress',
      'PARKED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ],
    'DELIVERY': [
      'ACTIVATED',
      'in_progress',
      'PARKED',
      'COMPLETED',
      'CANCELLED',
      'REFUNDED',
    ],
    'DINE_IN': [
      'ACTIVATED',
      'in_progress',
      'HELD',
      'COMPLETED',
      'REFUNDED',
      'VOIDED',
      'CANCELLED',
    ],
  };

  List<String> getAvailableStatusesForService(String serviceType) {
    return SERVICE_ORDER_STATUSES[serviceType.toUpperCase()] ??
        [
          'ACTIVATED',
          'COMPLETED',
          'CANCELLED',
          'REFUNDED',
          'VOIDED',
          'HELD',
          'PARKED',
          'in_progress',
        ];
  }

  Future<bool> updateCurrentOrderStatus(String newStatus) async {
    try {
      if (newStatus.isEmpty) {
        printError(info: 'Status cannot be empty');
        return false;
      }

      final existedOrder = currentOrder;
      if (existedOrder == null) {
        printError(info: 'No active order exists');
        return false;
      }

      final serviceType = existedOrder.service_type ?? 'IN_STORE';
      final allowedStatuses = getAvailableStatusesForService(serviceType);

      final allowed = allowedStatuses.map((e) => e.toLowerCase()).toList();
      final status = newStatus.toLowerCase();

      if (!allowed.contains(status)) {
        printError(
          info:
              'Status "$newStatus" is not valid for service type "$serviceType"',
        );
        return false;
      }

      final currentTime = DateTime.now();
      final statusStages = List<Map<String, dynamic>>.from(
        existedOrder.status_stages ?? [],
      );

      statusStages.add({
        'status': newStatus.toUpperCase(),
        'timestamp': currentTime.toIso8601String(),
        'updated_by': 'system',
      });

      final updatedOrder = existedOrder.copyWith(
        last_status: newStatus.toUpperCase(),
        status_stages: statusStages,
        updated_at: currentTime, // IMPORTANT: Update timestamp
      );

      await _extOrdersRepository.updateOrderByUUID(
        updatedOrder,
        existedOrder.uuid!,
      );

      final index = activeOrders.indexWhere(
        (order) => order.uuid == existedOrder.uuid,
      );
      if (index != -1) {
        activeOrders[index] = updatedOrder;
      }

      // Auto-update ticket status based on order status
      await autoUpdateTicketStatusOnOrderStatusChange(newStatus);

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating order status: $e\n$stackTrace');
      return false;
    }
  }
}
