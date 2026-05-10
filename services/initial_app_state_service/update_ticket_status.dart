// update_ticket_status.dart
part of 'initial_app_state_service.dart';

extension ManageOrderTicketStatus on InitialAppStateService {
  // Standard Ticket Statuses by Service Type
  static const Map<String, List<String>> SERVICE_TICKET_STATUSES = {
    'IN_STORE': [
      'WAITING_FOR_APPROVAL',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'FINISHED',
    ],
    'COLLECTION': [
      'WAITING_FOR_APPROVAL',
      'ACCEPTED',
      'PREPARING',
      'READY_FOR_COLLECTION',
      'COLLECTED',
      'CANCELLED',
    ],
    'DELIVERY': [
      'WAITING_FOR_APPROVAL',
      'ACCEPTED',
      'PREPARING',
      'READY_FOR_DELIVERY',
      'ON_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ],
    'DINE_IN': [
      'WAITING_FOR_APPROVAL',
      'ACCEPTED',
      'PREPARING',
      'READY_TO_SERVE',
      'SERVED',
      'FINISHED',
    ],
  };

  List<String> getAvailableTicketStatusesForService(String serviceType) {
    return SERVICE_TICKET_STATUSES[serviceType.toUpperCase()] ??
        ['WAITING_FOR_APPROVAL', 'FINISHED', 'CANCELLED'];
  }

  String getDefaultTicketStatusForOrderStatus(
    String orderStatus,
    String serviceType,
  ) {
    final status = orderStatus.toUpperCase();
    final service = serviceType.toUpperCase();
    // Mapping based on order status
    switch (status) {
      case 'ACTIVATED':
      case 'in_progress':
        return 'WAITING_FOR_APPROVAL';
      case 'PARKED':
        return 'ACCEPTED';
      case 'HELD':
        return service == 'DINE_IN' ? 'PREPARING' : 'ACCEPTED';
      case 'COMPLETED':
        if (service == 'DELIVERY') return 'DELIVERED';
        if (service == 'COLLECTION') return 'COLLECTED';
        if (service == 'DINE_IN') return 'SERVED';
        return 'FINISHED';
      case 'CANCELLED':
      case 'VOIDED':
        return 'CANCELLED';
      case 'REFUNDED':
        return 'FINISHED';
      default:
        return 'WAITING_FOR_APPROVAL';
    }
  }

  // ADD THIS METHOD - Auto-update ticket status based on order status change
  Future<bool> autoUpdateTicketStatusOnOrderStatusChange(
    String newOrderStatus, {
    String? specificOrderId,
  }) async {
    try {
      ExtOrdersModel? existedOrder;

      if (specificOrderId != null) {
        // Find specific order
        existedOrder =
            activeOrders.firstWhereOrNull(
              (order) => order.uuid == specificOrderId,
            ) ??
            parkedOrders.firstWhereOrNull(
              (order) => order.uuid == specificOrderId,
            ) ??
            heldOrders.firstWhereOrNull(
              (order) => order.uuid == specificOrderId,
            );
      } else {
        existedOrder = currentOrder;
      }

      if (existedOrder == null) {
        printError(info: 'No order found for ticket status update');
        return false;
      }

      final serviceType = existedOrder.service_type ?? 'IN_STORE';
      final defaultTicketStatus = getDefaultTicketStatusForOrderStatus(
        newOrderStatus,
        serviceType,
      );

      if (specificOrderId != null) {
        return await updateOrderTicketStatusById(
          specificOrderId,
          defaultTicketStatus,
        );
      } else {
        return await updateCurrentOrderTicketStatus(defaultTicketStatus);
      }
    } catch (e, stackTrace) {
      printError(info: 'Error auto-updating ticket status: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> updateCurrentOrderTicketStatus(String newTicketStatus) async {
    try {
      if (newTicketStatus.isEmpty) {
        printError(info: 'Ticket status cannot be empty');
        return false;
      }

      final existedOrder = currentOrder;
      if (existedOrder == null) {
        printError(info: 'No active order exists');
        return false;
      }

      final serviceType = existedOrder.service_type ?? 'IN_STORE';
      final allowedTicketStatuses = getAvailableTicketStatusesForService(
        serviceType,
      );

      final upperStatus = newTicketStatus.toUpperCase();
      if (!allowedTicketStatuses.contains(upperStatus)) {
        printError(
          info:
              'Ticket status "$newTicketStatus" is not valid for service type "$serviceType"',
        );
        return false;
      }

      final currentTime = DateTime.now();
      final ticketStatusStages = List<Map<String, dynamic>>.from(
        existedOrder.ticket_status_stages ?? [],
      );

      ticketStatusStages.add({
        'ticket_status': upperStatus,
        'timestamp': currentTime.toIso8601String(),
        'updated_by': 'system',
      });

      final updatedOrder = existedOrder.copyWith(
        ticket_status_stages: ticketStatusStages,
        updated_at: currentTime, // Update timestamp
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

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating order ticket status: $e\n$stackTrace');
      return false;
    }
  }

  // Update specific order ticket status by order ID
  Future<bool> updateOrderTicketStatusById(
    String orderId,
    String newTicketStatus,
  ) async {
    ExtOrdersModel? orderToUpdate;
    try {
      if (orderId.isEmpty || newTicketStatus.isEmpty) {
        printError(info: 'Order ID and ticket status cannot be empty');
        return false;
      }

      // Find order in any of the lists first
      ExtOrdersModel? order;
      bool isInActiveOrders = false;
      bool isInParkedOrders = false;
      bool isInHeldOrders = false;
      int orderIndex = -1;

      // Check active orders first
      orderIndex = activeOrders.indexWhere((o) => o.uuid == orderId);
      if (orderIndex != -1) {
        order = activeOrders[orderIndex];
        isInActiveOrders = true;
      }

      // Check parked orders if not found in active
      if (order == null) {
        orderIndex = parkedOrders.indexWhere((o) => o.uuid == orderId);
        if (orderIndex != -1) {
          order = parkedOrders[orderIndex];
          isInParkedOrders = true;
        }
      }

      // Check held orders if not found elsewhere
      if (order == null) {
        orderIndex = heldOrders.indexWhere((o) => o.uuid == orderId);
        if (orderIndex != -1) {
          order = heldOrders[orderIndex];
          isInHeldOrders = true;
        }
      }

      // If still not found, fetch from database
      if (order == null) {
        order = await _extOrdersRepository.getOrderByUuid(orderId);
        if (order == null) {
          printError(info: 'Order with ID $orderId not found');
          return false;
        }
      }

      final serviceType = order.service_type ?? 'IN_STORE';
      final allowedTicketStatuses = getAvailableTicketStatusesForService(
        serviceType,
      );

      final upperStatus = newTicketStatus.toUpperCase();
      if (!allowedTicketStatuses.contains(upperStatus)) {
        printError(
          info:
              'Ticket status "$newTicketStatus" is not valid for service type "$serviceType"',
        );
        return false;
      }

      final currentTime = DateTime.now();
      final ticketStatusStages = List<Map<String, dynamic>>.from(
        order.ticket_status_stages ?? [],
      );

      ticketStatusStages.add({
        'ticket_status': upperStatus,
        'timestamp': currentTime.toIso8601String(),
        'updated_by': 'system',
      });

      final updatedOrder = order.copyWith(
        ticket_status_stages: ticketStatusStages,
        updated_at: currentTime,
      );

      // Update in database
      await _extOrdersRepository.updateOrderByUUID(updatedOrder, orderId);
      orderToUpdate = updatedOrder;

      // Update in appropriate local list
      if (isInActiveOrders && orderIndex != -1) {
        activeOrders[orderIndex] = updatedOrder;
      } else if (isInParkedOrders && orderIndex != -1) {
        parkedOrders[orderIndex] = updatedOrder;
      } else if (isInHeldOrders && orderIndex != -1) {
        heldOrders[orderIndex] = updatedOrder;
      }

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error updating order ticket status: $e\n$stackTrace');
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

  String getCurrentOrderTicketStatus() {
    final order = currentOrder;
    if (order == null) return 'NO_ORDER';
    return _getLatestTicketStatus(order);
  }

  Future<String> getOrderTicketStatus(String orderId) async {
    final order = await _getOrderFromRepository(orderId);

    if (order == null) return 'Order Not Found';

    return _getLatestTicketStatus(order);
  }

  String _getLatestTicketStatus(ExtOrdersModel order) {
    final ticketStages = order.ticket_status_stages;

    if (ticketStages == null || ticketStages.isEmpty) {
      final serviceType = order.service_type ?? 'IN_STORE';
      final orderStatus = order.last_status ?? 'ACTIVATED';

      return getDefaultTicketStatusForOrderStatus(orderStatus, serviceType);
    }

    // Return latest ticket status
    return ticketStages.last['ticket_status'] ?? 'WAITING_FOR_APPROVAL';
  }

  // Check if ticket status transition is valid
  bool isValidTicketStatusTransition(
    String currentTicketStatus,
    String newTicketStatus,
    String serviceType,
  ) {
    final allowedTicketStatuses = getAvailableTicketStatusesForService(
      serviceType,
    );

    if (!allowedTicketStatuses.contains(newTicketStatus.toUpperCase())) {
      return false;
    }

    // Add validation rules for invalid transitions
    switch (serviceType.toUpperCase()) {
      case 'COLLECTION':
        final invalidTransitions = <String, List<String>>{
          'COLLECTED': ['WAITING_FOR_APPROVAL', 'ACCEPTED'],
          'CANCELLED': ['COLLECTED'],
        };

        if (invalidTransitions.containsKey(newTicketStatus.toUpperCase())) {
          return !invalidTransitions[newTicketStatus.toUpperCase()]!.contains(
            currentTicketStatus.toUpperCase(),
          );
        }
        break;

      case 'DELIVERY':
        final invalidTransitions = <String, List<String>>{
          'DELIVERED': ['WAITING_FOR_APPROVAL'],
          'CANCELLED': ['DELIVERED'],
        };

        if (invalidTransitions.containsKey(newTicketStatus.toUpperCase())) {
          return !invalidTransitions[newTicketStatus.toUpperCase()]!.contains(
            currentTicketStatus.toUpperCase(),
          );
        }
        break;
    }

    return true;
  }

  // Get order ticket status history
  List<Map<String, dynamic>>? getOrderTicketStatusHistory(String? orderId) {
    try {
      ExtOrdersModel? order;

      if (orderId != null && orderId.isNotEmpty) {
        order =
            activeOrders.firstWhereOrNull((o) => o.uuid == orderId) ??
            parkedOrders.firstWhereOrNull((o) => o.uuid == orderId) ??
            heldOrders.firstWhereOrNull((o) => o.uuid == orderId);
      } else {
        order = currentOrder;
      }

      return order?.ticket_status_stages;
    } catch (e) {
      printError(info: 'Error getting order ticket status history: $e');
      return null;
    }
  }

  // Get all orders by ticket status
  Future<List<ExtOrdersModel>> getOrdersByTicketStatus(
    String ticketStatus,
  ) async {
    try {
      final allOrders = await _extOrdersRepository.getAllOrders();
      return allOrders.where((order) {
        final currentTicketStatus = _getLatestTicketStatus(order);
        return currentTicketStatus.toUpperCase() == ticketStatus.toUpperCase();
      }).toList();
    } catch (e) {
      printError(info: 'Error getting orders by ticket status: $e');
      return [];
    }
  }

  // Get orders count by ticket status for dashboard
  Future<Map<String, int>> getOrdersCountByTicketStatus() async {
    try {
      final allOrders = await _extOrdersRepository.getAllOrders();
      final ticketStatusCounts = <String, int>{};

      for (final order in allOrders) {
        final ticketStatus = _getLatestTicketStatus(order);
        ticketStatusCounts[ticketStatus] =
            (ticketStatusCounts[ticketStatus] ?? 0) + 1;
      }

      return ticketStatusCounts;
    } catch (e) {
      printError(info: 'Error getting orders count by ticket status: $e');
      return {};
    }
  }
}
