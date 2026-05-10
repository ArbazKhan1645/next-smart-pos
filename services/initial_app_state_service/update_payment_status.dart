part of 'initial_app_state_service.dart';

extension ManageEditMode on InitialAppStateService {
  Future<bool> enterEditMode(String orderId) async {
    try {
      if (orderId.isEmpty) {
        printError(info: 'Order ID cannot be empty');
        return false;
      }

      // Check if order exists in active, parked, or held orders
      ExtOrdersModel? targetOrder;

      // First check active orders
      targetOrder = activeOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      // If not found in active, check parked orders
      targetOrder ??= parkedOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      // If not found in parked, check held orders
      targetOrder ??= heldOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      if (targetOrder == null) {
        printError(info: 'Order with ID $orderId not found');
        return false;
      }

      // Save current state for restoration
      tempOrderBeingEdited.value = currentOrder;
      editingOrderId.value = orderId;

      // Add the order to active orders temporarily if it's not already active
      final bool wasActive = activeOrders.any((order) => order.uuid == orderId);
      if (!wasActive) {
        activeOrders.add(targetOrder);
        currentActiveOrderIndex.value = activeOrders.length - 1;
      } else {
        // Switch to the target order if it's already active
        switchToOrderById(orderId);
      }

      // Activate edit mode
      isEditModeActive.value = true;

      await updateSpecificOrderStatus(orderId, 'in_progress');

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error entering edit mode: $e\n$stackTrace');
      return false;
    }
  }

  Future<bool> enterPaymentMode(String orderId) async {
    try {
      if (orderId.isEmpty) {
        printError(info: 'Order ID cannot be empty');
        return false;
      }

      // Check if order exists in active, parked, or held orders
      ExtOrdersModel? targetOrder;

      // First check active orders
      targetOrder = activeOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      // If not found in active, check parked orders
      targetOrder ??= parkedOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      // If not found in parked, check held orders
      targetOrder ??= heldOrders.firstWhereOrNull(
        (order) => order.uuid == orderId,
      );

      if (targetOrder == null) {
        printError(info: 'Order with ID $orderId not found');
        return false;
      }

      // Save current state for restoration
      tempOrderBeingEdited.value = currentOrder;
      editingOrderId.value = orderId;

      // Add the order to active orders temporarily if it's not already active
      final bool wasActive = activeOrders.any((order) => order.uuid == orderId);
      if (!wasActive) {
        activeOrders.add(targetOrder);
        currentActiveOrderIndex.value = activeOrders.length - 1;
      } else {
        // Switch to the target order if it's already active
        switchToOrderById(orderId);
      }

      await updateSpecificOrderStatus(orderId, 'in_progress');

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error entering edit mode: $e\n$stackTrace');
      return false;
    }
  }

  /// Saves changes in edit mode and returns to original state
  Future<bool> saveAndExitEditMode() async {
    ExtOrdersModel? orderToUpdate;
    try {
      if (!isEditModeActive.value || editingOrderId.value == null) {
        printError(info: 'Not in edit mode');
        return false;
      }

      final editingId = editingOrderId.value!;
      final modifiedOrder = currentOrder;

      if (modifiedOrder == null) {
        printError(info: 'No order being modified');
        return false;
      }

      // Get the original order to check its previous status
      ExtOrdersModel? originalOrder;
      originalOrder = parkedOrders.firstWhereOrNull(
        (order) => order.uuid == editingId,
      );

      final wasParked = originalOrder != null;

      if (!wasParked) {
        originalOrder = heldOrders.firstWhereOrNull(
          (order) => order.uuid == editingId,
        );
      }

      final wasHeld = originalOrder != null && !wasParked;

      // Determine the status to restore
      String statusToRestore = 'in_progress';
      if (wasParked) {
        statusToRestore = 'PARKED';
      } else if (wasHeld) {
        statusToRestore = 'HELD';
      }

      final currentTime = DateTime.now();
      final updatedOrder = modifiedOrder.copyWith(
        last_status: statusToRestore,
        updated_at: currentTime,
      );

      // Update in database
      await _extOrdersRepository.updateOrderByUUID(updatedOrder, editingId);
      orderToUpdate = updatedOrder;

      // Remove from active orders
      activeOrders.removeWhere((order) => order.uuid == editingId);

      // Put back in appropriate list
      if (wasParked) {
        parkedOrders.removeWhere((order) => order.uuid == editingId);
        parkedOrders.add(updatedOrder);
      } else if (wasHeld) {
        heldOrders.removeWhere((order) => order.uuid == editingId);
        heldOrders.add(updatedOrder);
      }

      // Restore previous current order
      if (tempOrderBeingEdited.value != null) {
        final tempOrderIndex = activeOrders.indexWhere(
          (order) => order.uuid == tempOrderBeingEdited.value!.uuid,
        );
        if (tempOrderIndex != -1) {
          currentActiveOrderIndex.value = tempOrderIndex;
        } else if (activeOrders.isNotEmpty) {
          currentActiveOrderIndex.value = 0;
        }
      } else if (activeOrders.isNotEmpty) {
        currentActiveOrderIndex.value = 0;
      }

      // Ensure we have at least one active order
      if (activeOrders.isEmpty) {
        await _createNewOrder();
      }

      // Reset edit mode
      isEditModeActive.value = false;
      tempOrderBeingEdited.value = null;
      editingOrderId.value = null;

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error saving and exiting edit mode: $e\n$stackTrace');
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

  /// Cancels edit mode without saving changes
  Future<bool> cancelEditMode() async {
    try {
      if (!isEditModeActive.value) {
        printError(info: 'No active edit mode to cancel');
        return false;
      }

      // Remove the order being edited from active orders if it wasn't originally active
      if (editingOrderId.value != null && tempOrderBeingEdited.value == null) {
        activeOrders.removeWhere((order) => order.uuid == editingOrderId.value);
      }

      // Restore previous current order
      if (tempOrderBeingEdited.value != null) {
        switchToOrderById(tempOrderBeingEdited.value!.uuid!);
      } else if (activeOrders.isNotEmpty) {
        currentActiveOrderIndex.value = 0;
      }

      // Reset edit mode
      isEditModeActive.value = false;
      tempOrderBeingEdited.value = null;
      editingOrderId.value = null;

      return true;
    } catch (e, stackTrace) {
      printError(info: 'Error canceling edit mode: $e\n$stackTrace');
      return false;
    }
  }
}
