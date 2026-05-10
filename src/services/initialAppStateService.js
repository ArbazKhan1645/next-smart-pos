import { BehaviorSubject } from './behaviorSubject.js';
import { authService } from './authService.js';
import { appService } from './appService.js';

const SERVICE_ORDER_STATUSES = {
  IN_STORE: ['ACTIVATED', 'in_progress', 'COMPLETED', 'REFUNDED', 'VOIDED', 'HELD', 'CANCELLED'],
  COLLECTION: ['ACTIVATED', 'in_progress', 'PARKED', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  DELIVERY: ['ACTIVATED', 'in_progress', 'PARKED', 'COMPLETED', 'CANCELLED', 'REFUNDED'],
  DINE_IN: ['ACTIVATED', 'in_progress', 'HELD', 'COMPLETED', 'REFUNDED', 'VOIDED', 'CANCELLED'],
};

const SERVICE_TICKET_STATUSES = {
  IN_STORE: ['WAITING_FOR_APPROVAL', 'ACCEPTED', 'PREPARING', 'READY', 'FINISHED'],
  COLLECTION: ['WAITING_FOR_APPROVAL', 'ACCEPTED', 'PREPARING', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED'],
  DELIVERY: ['WAITING_FOR_APPROVAL', 'ACCEPTED', 'PREPARING', 'READY_FOR_DELIVERY', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED'],
  DINE_IN: ['WAITING_FOR_APPROVAL', 'ACCEPTED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'FINISHED'],
};

const PAYMENT_METHODS = ['CASH', 'CARD', 'PAID'];

class InitialAppStateService {
  constructor() {
    this.activeOrders = [];
    this.parkedOrders = [];
    this.heldOrders = [];

    this.currentActiveOrderIndex = new BehaviorSubject(0);
    this.isEditModeActive = new BehaviorSubject(false);
    this.tempOrderBeingEdited = new BehaviorSubject(null);
    this.editingOrderId = new BehaviorSubject(null);
    this.selectedBasketProductIndex = new BehaviorSubject(null);
    this.lastItemBasketId = new BehaviorSubject(null);
    this.mealDeallastItemBasketId = new BehaviorSubject(null);

    this._db = null;
    this._supabaseOrderService = null;
  }

  get _supabase() { return appService.supabaseClient; }

  get currentOrder() {
    if (this.activeOrders.length === 0) return null;
    const idx = this.currentActiveOrderIndex.value;
    return this.activeOrders[idx] ?? null;
  }

  async init(db) {
    this._db = db;
    await this.initializeOrdersState();
    return this;
  }

  async initializeOrdersState() {
    try {
      const retryCount = 3;
      let fetchedActiveOrders = null;

      for (let i = 0; i < retryCount; i++) {
        try {
          fetchedActiveOrders = await this._db.extOrders.getActiveOrders();
          break;
        } catch (e) {
          if (i < retryCount - 1) await new Promise(r => setTimeout(r, 500));
        }
      }

      const fetchedParkedOrders = await this._db.extOrders.getOrdersByStatus('PARKED');
      const fetchedHeldOrders = await this._db.extOrders.getOrdersByStatus('HELD');

      this.activeOrders = fetchedActiveOrders ?? [];
      this.parkedOrders = fetchedParkedOrders ?? [];
      this.heldOrders = fetchedHeldOrders ?? [];

      // Deduplicate active orders
      const unique = new Map();
      for (const order of this.activeOrders) {
        if (order.uuid) unique.set(order.uuid, order);
      }
      this.activeOrders = [...unique.values()];

      if (this.activeOrders.length === 0) {
        await this._createNewOrderWithRetry();
      } else {
        this.currentActiveOrderIndex.add(0);
      }
    } catch (e) {
      console.error('[InitialAppState] Error initializing orders:', e);
      await this._createNewOrderWithRetry();
    }
  }

  async _createNewOrderWithRetry() {
    const retryCount = 3;
    for (let i = 0; i < retryCount; i++) {
      try {
        await this._createNewOrder();
        return;
      } catch (e) {
        console.error(`[InitialAppState] Error creating order attempt ${i + 1}:`, e);
        if (i < retryCount - 1) await new Promise(r => setTimeout(r, 500));
      }
    }
    throw new Error('Failed to create new order after ' + retryCount + ' attempts');
  }

  async generateUniqueOrderNumber() {
    try {
      const allOrders = await this._db.extOrders.getAllOrders();
      const existingNumbers = new Set(allOrders.filter(o => o.order_number != null).map(o => o.order_number));

      const maxAttempts = 10;
      let attempts = 0;
      let generatedNumber;

      do {
        attempts++;
        generatedNumber = 100000000 + Math.floor(Math.random() * 900000000);
        const timestampComponent = Date.now() % 1000;
        generatedNumber = Math.floor(generatedNumber / 1000) * 1000 + timestampComponent;

        if (!existingNumbers.has(generatedNumber)) break;
        if (attempts >= maxAttempts) throw new Error('Unable to generate unique order number');
        await new Promise(r => setTimeout(r, 2));
      } while (true);

      return generatedNumber;
    } catch (e) {
      console.error('[InitialAppState] Error generating order number:', e);
      return Date.now() % 1000000000;
    }
  }

  _getServiceNameById(id) {
    const map = { 1: 'IN_STORE', 2: 'COLLECTION', 3: 'DELIVERY', 4: 'CAR_REPAIR', 5: 'MOBILE_REPAIR', 6: 'DINE_IN' };
    return map[id] ?? 'UNKNOWN';
  }

  async _createNewOrder() {
    const uuid = crypto.randomUUID();
    const orderNumber = await this.generateUniqueOrderNumber();
    const locationId = authService.selectedLocation.value?.id;
    const terminalId = authService.selectedTerminal.value?.id;
    if (!locationId || !terminalId) return;

    const serviceTypeId = 1;

    const newOrder = {
      uuid,
      order_number: orderNumber,
      created_at: new Date().toISOString(),
      version: 0,
      mode: 'Sale',
      last_status: 'ACTIVATED',
      deleted_at: null,
      service_type: this._getServiceNameById(serviceTypeId),
      sale_channel_type: 'SMART_POS',
      status_stages: [],
      ticket_status_stages: [],
      discount: '',
      products: [],
      payments: [],
      location_id: locationId,
      terminal_id: terminalId,
      country: authService.selectedCountry.value?.countryName ?? '-',
    };

    await this._db.extOrders.insertOrder(newOrder);
    this.activeOrders.push(newOrder);
    this.currentActiveOrderIndex.add(this.activeOrders.length - 1);
  }

  // ─── Order navigation ───────────────────────────────────────────────────────

  switchToNextOrder() {
    if (this.activeOrders.length === 0) return false;
    const idx = this.currentActiveOrderIndex.value;
    if (idx < this.activeOrders.length - 1) {
      this.currentActiveOrderIndex.add(idx + 1);
      return true;
    }
    return false;
  }

  switchToPreviousOrder() {
    if (this.activeOrders.length === 0) return false;
    const idx = this.currentActiveOrderIndex.value;
    if (idx > 0) {
      this.currentActiveOrderIndex.add(idx - 1);
      return true;
    }
    return false;
  }

  switchToOrderByIndex(index) {
    if (index >= 0 && index < this.activeOrders.length) {
      this.currentActiveOrderIndex.add(index);
      return true;
    }
    return false;
  }

  switchToOrderById(orderId) {
    const index = this.activeOrders.findIndex(o => o.uuid === orderId);
    if (index !== -1) {
      this.currentActiveOrderIndex.add(index);
      return true;
    }
    return false;
  }

  // ─── Order status ────────────────────────────────────────────────────────────

  getAvailableStatusesForService(serviceType) {
    return SERVICE_ORDER_STATUSES[serviceType.toUpperCase()] ??
      ['ACTIVATED', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'VOIDED', 'HELD', 'PARKED', 'in_progress'];
  }

  async updateCurrentOrderStatus(newStatus) {
    try {
      if (!newStatus) return false;
      const existedOrder = this.currentOrder;
      if (!existedOrder) return false;

      const serviceType = existedOrder.service_type ?? 'IN_STORE';
      const allowedStatuses = this.getAvailableStatusesForService(serviceType);
      if (!allowedStatuses.map(s => s.toLowerCase()).includes(newStatus.toLowerCase())) return false;

      const now = new Date().toISOString();
      const statusStages = [...(existedOrder.status_stages ?? [])];
      statusStages.push({ status: newStatus.toUpperCase(), timestamp: now, updated_by: 'system' });

      const updatedOrder = { ...existedOrder, last_status: newStatus.toUpperCase(), status_stages: statusStages, updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, existedOrder.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === existedOrder.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      await this.autoUpdateTicketStatusOnOrderStatusChange(newStatus);
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating order status:', e);
      return false;
    }
  }

  async updateSpecificOrderStatus(orderId, newStatus) {
    try {
      const lists = [
        { list: this.activeOrders, setter: (i, o) => { this.activeOrders[i] = o; } },
        { list: this.parkedOrders, setter: (i, o) => { this.parkedOrders[i] = o; } },
        { list: this.heldOrders, setter: (i, o) => { this.heldOrders[i] = o; } },
      ];
      for (const { list, setter } of lists) {
        const idx = list.findIndex(o => o.uuid === orderId);
        if (idx !== -1) {
          const updatedOrder = { ...list[idx], last_status: newStatus };
          await this._db.extOrders.updateOrderByUUID(updatedOrder, orderId);
          setter(idx, updatedOrder);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('[InitialAppState] Error updating specific order status:', e);
      return false;
    }
  }

  // ─── Ticket status ───────────────────────────────────────────────────────────

  getAvailableTicketStatusesForService(serviceType) {
    return SERVICE_TICKET_STATUSES[serviceType.toUpperCase()] ?? ['WAITING_FOR_APPROVAL', 'FINISHED', 'CANCELLED'];
  }

  getDefaultTicketStatusForOrderStatus(orderStatus, serviceType) {
    const status = orderStatus.toUpperCase();
    const service = serviceType.toUpperCase();
    switch (status) {
      case 'ACTIVATED':
      case 'IN_PROGRESS': return 'WAITING_FOR_APPROVAL';
      case 'PARKED': return 'ACCEPTED';
      case 'HELD': return service === 'DINE_IN' ? 'PREPARING' : 'ACCEPTED';
      case 'COMPLETED':
        if (service === 'DELIVERY') return 'DELIVERED';
        if (service === 'COLLECTION') return 'COLLECTED';
        if (service === 'DINE_IN') return 'SERVED';
        return 'FINISHED';
      case 'CANCELLED':
      case 'VOIDED': return 'CANCELLED';
      case 'REFUNDED': return 'FINISHED';
      default: return 'WAITING_FOR_APPROVAL';
    }
  }

  async autoUpdateTicketStatusOnOrderStatusChange(newOrderStatus, { specificOrderId } = {}) {
    try {
      let existedOrder = null;
      if (specificOrderId) {
        existedOrder = this.activeOrders.find(o => o.uuid === specificOrderId)
          ?? this.parkedOrders.find(o => o.uuid === specificOrderId)
          ?? this.heldOrders.find(o => o.uuid === specificOrderId);
      } else {
        existedOrder = this.currentOrder;
      }
      if (!existedOrder) return false;

      const serviceType = existedOrder.service_type ?? 'IN_STORE';
      const defaultTicketStatus = this.getDefaultTicketStatusForOrderStatus(newOrderStatus, serviceType);

      if (specificOrderId) {
        return await this.updateOrderTicketStatusById(specificOrderId, defaultTicketStatus);
      } else {
        return await this.updateCurrentOrderTicketStatus(defaultTicketStatus);
      }
    } catch (e) {
      console.error('[InitialAppState] Error auto-updating ticket status:', e);
      return false;
    }
  }

  async updateCurrentOrderTicketStatus(newTicketStatus) {
    try {
      if (!newTicketStatus) return false;
      const existedOrder = this.currentOrder;
      if (!existedOrder) return false;

      const serviceType = existedOrder.service_type ?? 'IN_STORE';
      const allowedStatuses = this.getAvailableTicketStatusesForService(serviceType);
      const upperStatus = newTicketStatus.toUpperCase();
      if (!allowedStatuses.includes(upperStatus)) return false;

      const now = new Date().toISOString();
      const ticketStatusStages = [...(existedOrder.ticket_status_stages ?? [])];
      ticketStatusStages.push({ ticket_status: upperStatus, timestamp: now, updated_by: 'system' });

      const updatedOrder = { ...existedOrder, ticket_status_stages: ticketStatusStages, updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, existedOrder.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === existedOrder.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating ticket status:', e);
      return false;
    }
  }

  async updateOrderTicketStatusById(orderId, newTicketStatus) {
    let orderToUpdate = null;
    try {
      if (!orderId || !newTicketStatus) return false;

      let order = null;
      let listRef = null;
      let listIdx = -1;

      listIdx = this.activeOrders.findIndex(o => o.uuid === orderId);
      if (listIdx !== -1) { order = this.activeOrders[listIdx]; listRef = this.activeOrders; }

      if (!order) {
        listIdx = this.parkedOrders.findIndex(o => o.uuid === orderId);
        if (listIdx !== -1) { order = this.parkedOrders[listIdx]; listRef = this.parkedOrders; }
      }
      if (!order) {
        listIdx = this.heldOrders.findIndex(o => o.uuid === orderId);
        if (listIdx !== -1) { order = this.heldOrders[listIdx]; listRef = this.heldOrders; }
      }
      if (!order) {
        order = await this._db.extOrders.getOrderByUuid(orderId);
        if (!order) return false;
      }

      const serviceType = order.service_type ?? 'IN_STORE';
      const allowedStatuses = this.getAvailableTicketStatusesForService(serviceType);
      const upperStatus = newTicketStatus.toUpperCase();
      if (!allowedStatuses.includes(upperStatus)) return false;

      const now = new Date().toISOString();
      const ticketStatusStages = [...(order.ticket_status_stages ?? [])];
      ticketStatusStages.push({ ticket_status: upperStatus, timestamp: now, updated_by: 'system' });

      const updatedOrder = { ...order, ticket_status_stages: ticketStatusStages, updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderId);
      orderToUpdate = updatedOrder;

      if (listRef && listIdx !== -1) listRef[listIdx] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating order ticket status by ID:', e);
      return false;
    } finally {
      if (orderToUpdate) {
        this._backgroundSupabaseSync(orderToUpdate);
      }
    }
  }

  getCurrentOrderTicketStatus() {
    const order = this.currentOrder;
    if (!order) return 'NO_ORDER';
    return this._getLatestTicketStatus(order);
  }

  _getLatestTicketStatus(order) {
    const stages = order.ticket_status_stages;
    if (!stages || stages.length === 0) {
      const serviceType = order.service_type ?? 'IN_STORE';
      const orderStatus = order.last_status ?? 'ACTIVATED';
      return this.getDefaultTicketStatusForOrderStatus(orderStatus, serviceType);
    }
    return stages[stages.length - 1].ticket_status ?? 'WAITING_FOR_APPROVAL';
  }

  isValidTicketStatusTransition(currentTicketStatus, newTicketStatus, serviceType) {
    const allowedStatuses = this.getAvailableTicketStatusesForService(serviceType);
    const upperNew = newTicketStatus.toUpperCase();
    if (!allowedStatuses.includes(upperNew)) return false;

    const invalidTransitions = {};
    if (serviceType.toUpperCase() === 'COLLECTION') {
      invalidTransitions['COLLECTED'] = ['WAITING_FOR_APPROVAL', 'ACCEPTED'];
      invalidTransitions['CANCELLED'] = ['COLLECTED'];
    } else if (serviceType.toUpperCase() === 'DELIVERY') {
      invalidTransitions['DELIVERED'] = ['WAITING_FOR_APPROVAL'];
      invalidTransitions['CANCELLED'] = ['DELIVERED'];
    }

    if (invalidTransitions[upperNew]) {
      return !invalidTransitions[upperNew].includes(currentTicketStatus.toUpperCase());
    }
    return true;
  }

  // ─── Edit mode ────────────────────────────────────────────────────────────────

  async enterEditMode(orderId) {
    try {
      if (!orderId) return false;
      let targetOrder = this.activeOrders.find(o => o.uuid === orderId)
        ?? this.parkedOrders.find(o => o.uuid === orderId)
        ?? this.heldOrders.find(o => o.uuid === orderId);

      if (!targetOrder) return false;

      this.tempOrderBeingEdited.add(this.currentOrder);
      this.editingOrderId.add(orderId);

      const wasActive = this.activeOrders.some(o => o.uuid === orderId);
      if (!wasActive) {
        this.activeOrders.push(targetOrder);
        this.currentActiveOrderIndex.add(this.activeOrders.length - 1);
      } else {
        this.switchToOrderById(orderId);
      }

      this.isEditModeActive.add(true);
      await this.updateSpecificOrderStatus(orderId, 'in_progress');
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error entering edit mode:', e);
      return false;
    }
  }

  async enterPaymentMode(orderId) {
    try {
      if (!orderId) return false;
      let targetOrder = this.activeOrders.find(o => o.uuid === orderId)
        ?? this.parkedOrders.find(o => o.uuid === orderId)
        ?? this.heldOrders.find(o => o.uuid === orderId);

      if (!targetOrder) return false;

      this.tempOrderBeingEdited.add(this.currentOrder);
      this.editingOrderId.add(orderId);

      const wasActive = this.activeOrders.some(o => o.uuid === orderId);
      if (!wasActive) {
        this.activeOrders.push(targetOrder);
        this.currentActiveOrderIndex.add(this.activeOrders.length - 1);
      } else {
        this.switchToOrderById(orderId);
      }

      await this.updateSpecificOrderStatus(orderId, 'in_progress');
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error entering payment mode:', e);
      return false;
    }
  }

  async saveAndExitEditMode() {
    let orderToUpdate = null;
    try {
      if (!this.isEditModeActive.value || !this.editingOrderId.value) return false;
      const editingId = this.editingOrderId.value;
      const modifiedOrder = this.currentOrder;
      if (!modifiedOrder) return false;

      const wasParked = this.parkedOrders.some(o => o.uuid === editingId);
      const wasHeld = !wasParked && this.heldOrders.some(o => o.uuid === editingId);
      const statusToRestore = wasParked ? 'PARKED' : wasHeld ? 'HELD' : 'in_progress';

      const now = new Date().toISOString();
      const updatedOrder = { ...modifiedOrder, last_status: statusToRestore, updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, editingId);
      orderToUpdate = updatedOrder;

      this.activeOrders = this.activeOrders.filter(o => o.uuid !== editingId);

      if (wasParked) {
        this.parkedOrders = this.parkedOrders.filter(o => o.uuid !== editingId);
        this.parkedOrders.push(updatedOrder);
      } else if (wasHeld) {
        this.heldOrders = this.heldOrders.filter(o => o.uuid !== editingId);
        this.heldOrders.push(updatedOrder);
      }

      const tempOrder = this.tempOrderBeingEdited.value;
      if (tempOrder) {
        const idx = this.activeOrders.findIndex(o => o.uuid === tempOrder.uuid);
        this.currentActiveOrderIndex.add(idx !== -1 ? idx : 0);
      } else {
        this.currentActiveOrderIndex.add(0);
      }

      if (this.activeOrders.length === 0) await this._createNewOrder();

      this.isEditModeActive.add(false);
      this.tempOrderBeingEdited.add(null);
      this.editingOrderId.add(null);
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error saving and exiting edit mode:', e);
      return false;
    } finally {
      if (orderToUpdate) this._backgroundSupabaseSync(orderToUpdate);
    }
  }

  async cancelEditMode() {
    try {
      if (!this.isEditModeActive.value) return false;

      if (this.editingOrderId.value && !this.tempOrderBeingEdited.value) {
        this.activeOrders = this.activeOrders.filter(o => o.uuid !== this.editingOrderId.value);
      }

      const tempOrder = this.tempOrderBeingEdited.value;
      if (tempOrder) {
        this.switchToOrderById(tempOrder.uuid);
      } else if (this.activeOrders.length > 0) {
        this.currentActiveOrderIndex.add(0);
      }

      this.isEditModeActive.add(false);
      this.tempOrderBeingEdited.add(null);
      this.editingOrderId.add(null);
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error canceling edit mode:', e);
      return false;
    }
  }

  // ─── Park / Hold / Resume / Void ─────────────────────────────────────────────

  async parkOrder({ specificOrderId } = {}) {
    let orderToUpdate = null;
    try {
      let orderToPark = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToPark) return false;

      const lastStatus = orderToPark.last_status;
      if (lastStatus !== 'ACTIVATED' && lastStatus?.toLowerCase() !== 'in_progress') return false;
      if (!orderToPark.products || orderToPark.products.length === 0) return false;

      const parkedOrder = { ...orderToPark, last_status: 'PARKED' };
      orderToUpdate = parkedOrder;

      await this._db.extOrders.updateOrderByUUID(parkedOrder, orderToPark.uuid);

      this.activeOrders = this.activeOrders.filter(o => o.uuid !== orderToPark.uuid);
      this.parkedOrders.push(parkedOrder);

      const idx = this.currentActiveOrderIndex.value;
      if (idx >= this.activeOrders.length) {
        this.currentActiveOrderIndex.add(Math.max(0, this.activeOrders.length - 1));
      }

      if (this.activeOrders.length === 0) await this._createNewOrder();
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error parking order:', e);
      return false;
    } finally {
      if (orderToUpdate) this._backgroundSupabaseSync(orderToUpdate);
    }
  }

  async holdOrder({ specificOrderId } = {}) {
    try {
      let orderToHold = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToHold) return false;

      const lastStatus = orderToHold.last_status;
      if (lastStatus !== 'ACTIVATED' && lastStatus?.toLowerCase() !== 'in_progress') return false;

      const heldOrder = { ...orderToHold, last_status: 'HELD' };
      await this._db.extOrders.updateOrderByUUID(heldOrder, orderToHold.uuid);

      this.activeOrders = this.activeOrders.filter(o => o.uuid !== orderToHold.uuid);
      this.heldOrders.push(heldOrder);

      const idx = this.currentActiveOrderIndex.value;
      if (idx >= this.activeOrders.length) {
        this.currentActiveOrderIndex.add(Math.max(0, this.activeOrders.length - 1));
      }

      if (this.activeOrders.length === 0) await this._createNewOrder();
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error holding order:', e);
      return false;
    }
  }

  async resumeParkedOrder(orderId) {
    try {
      const idx = this.parkedOrders.findIndex(o => o.uuid === orderId);
      if (idx === -1) return false;

      const resumedOrder = { ...this.parkedOrders[idx], last_status: 'ACTIVATED' };
      await this._db.extOrders.updateOrderByUUID(resumedOrder, orderId);

      this.parkedOrders.splice(idx, 1);
      this.activeOrders.push(resumedOrder);
      this.currentActiveOrderIndex.add(this.activeOrders.length - 1);
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error resuming parked order:', e);
      return false;
    }
  }

  async resumeHeldOrder(orderId) {
    try {
      const idx = this.heldOrders.findIndex(o => o.uuid === orderId);
      if (idx === -1) return false;

      const resumedOrder = { ...this.heldOrders[idx], last_status: 'ACTIVATED' };
      await this._db.extOrders.updateOrderByUUID(resumedOrder, orderId);

      this.heldOrders.splice(idx, 1);
      this.activeOrders.push(resumedOrder);
      this.currentActiveOrderIndex.add(this.activeOrders.length - 1);
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error resuming held order:', e);
      return false;
    }
  }

  async voidOrder({ specificOrderId } = {}) {
    try {
      let orderToVoid = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToVoid) return false;

      const lastStatus = orderToVoid.last_status;
      if (lastStatus !== 'ACTIVATED' && lastStatus?.toLowerCase() !== 'in_progress') return false;
      if (!orderToVoid.products || orderToVoid.products.length === 0) return false;

      await this._db.extOrders.deleteOrder(orderToVoid.id ?? -1);
      this.activeOrders = this.activeOrders.filter(o => o.uuid !== orderToVoid.uuid);

      const idx = this.currentActiveOrderIndex.value;
      if (idx >= this.activeOrders.length) {
        this.currentActiveOrderIndex.add(Math.max(0, this.activeOrders.length - 1));
      }

      if (this.activeOrders.length === 0) await this._createNewOrder();
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error voiding order:', e);
      return false;
    }
  }

  async voidCurrentOrder() { return this.voidOrder(); }
  async voidOrderById(orderId) { return this.voidOrder({ specificOrderId: orderId }); }

  // ─── Products ─────────────────────────────────────────────────────────────────

  async addItemsToExistedOrder(product, { qty = 1, mealDealGroupUuid = null, mealDealProductUuid = null } = {}) {
    try {
      const existedOrder = this.currentOrder;
      if (!existedOrder || !product || !product.uuid) return false;

      product = { ...product, mealDealGroupUuid, mealDealProductUuid };

      const oldProducts = existedOrder.products ?? [];
      const updatedProducts = [];
      let productFound = false;

      for (const p of oldProducts) {
        if (p.uuid === product.uuid?.toString() && p.parentbasketid == null) {
          const currentQty = this._parseDouble(p.qty ?? 0);
          updatedProducts.push({ ...p, qty: currentQty + qty });
          this.lastItemBasketId.add(p.basketid);
          this.mealDeallastItemBasketId.add(null);
          productFound = true;
        } else {
          updatedProducts.push({ ...p });
        }
      }

      if (!productFound) {
        const newProduct = { ...product, basketid: crypto.randomUUID(), qty };
        this.lastItemBasketId.add(newProduct.basketid);
        this.mealDeallastItemBasketId.add(null);
        updatedProducts.push(newProduct);
      }

      const updatedOrder = { ...existedOrder, products: updatedProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, existedOrder.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === existedOrder.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      this.selectedBasketProductIndex.add(product);
      await this.updateSpecificOrderStatus(existedOrder.uuid, 'in_progress');
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error adding item:', e);
      return false;
    }
  }

  async addCustomPropertyItemsToExistedOrder(product, { qty = 1, mealDealGroupUuid = null, mealDealProductUuid = null } = {}) {
    try {
      const existedOrder = this.currentOrder;
      if (!existedOrder || !product) return false;

      product = { ...product, mealDealGroupUuid, mealDealProductUuid };
      const existedProducts = [...(existedOrder.products ?? [])];

      if (!mealDealGroupUuid || !mealDealProductUuid) {
        product = { ...product, basketid: crypto.randomUUID() };
        this.lastItemBasketId.add(product.basketid);
        this.mealDeallastItemBasketId.add(null);
      } else {
        product = { ...product, basketid: crypto.randomUUID(), parentbasketid: this.lastItemBasketId.value };
        this.mealDeallastItemBasketId.add(product.basketid);
      }

      existedProducts.push({ ...product, qty });
      const updatedOrder = { ...existedOrder, products: existedProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, existedOrder.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === existedOrder.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      this.selectedBasketProductIndex.add(product);
      await this.updateCurrentOrderStatus('in_progress');
      return true;
    } catch (e) {
      console.error('[InitialAppState] Error adding custom item:', e);
      return false;
    }
  }

  async removeProduct({ productMap, specificOrderId } = {}) {
    try {
      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate || !productMap) return false;
      const products = orderToUpdate.products;
      if (!products || products.length === 0) return false;

      const updatedProducts = [...products];
      const productIndex = updatedProducts.findIndex(p =>
        p.uuid?.toString() === productMap.uuid &&
        p.qty === productMap.qty &&
        p.selling_price === productMap.selling_price &&
        p.basketid === productMap.basketid
      );

      if (productIndex === -1) return false;

      updatedProducts.splice(productIndex, 1);
      // Remove associated meal deal products
      const filtered = updatedProducts.filter(p =>
        !(p.mealDealProductUuid === productMap.uuid && p.parentbasketid === productMap.basketid)
      );

      const updatedOrder = { ...orderToUpdate, products: filtered };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      if (filtered.length === 0) await this.updateSpecificOrderStatus(orderToUpdate.uuid, 'ACTIVATED');

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error removing product:', e);
      return false;
    }
  }

  async clearAllProducts({ specificOrderId } = {}) {
    try {
      const orderToClear = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToClear) return false;
      if (!orderToClear.products || orderToClear.products.length === 0) return true;

      const updatedOrder = { ...orderToClear, products: [], last_status: 'ACTIVATED' };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToClear.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToClear.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error clearing products:', e);
      return false;
    }
  }

  async incrementProductQuantity({ productUuid, basketid, incrementBy = 1.0, specificOrderId } = {}) {
    return this._updateProductQty(productUuid, basketid, specificOrderId, (current) => current + incrementBy);
  }

  async decrementProductQuantity({ productUuid, basketid, decrementBy = 1.0, specificOrderId } = {}) {
    return this._updateProductQty(productUuid, basketid, specificOrderId, (current) => {
      return current <= decrementBy ? null : current - decrementBy;
    });
  }

  async _updateProductQty(productUuid, basketid, specificOrderId, updateFn) {
    try {
      if (!productUuid || !basketid) return false;

      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;

      const currentProducts = [...(orderToUpdate.products ?? [])];
      const productIndex = currentProducts.findIndex(p => p.uuid?.toString() === productUuid && p.basketid === basketid);
      if (productIndex === -1) return false;

      const product = { ...currentProducts[productIndex] };
      const currentQty = this._parseDouble(product.qty ?? 1.0);
      const newQty = updateFn(currentQty);

      if (newQty === null) {
        currentProducts.splice(productIndex, 1);
      } else {
        product.qty = newQty;
        currentProducts[productIndex] = product;
      }

      const updatedOrder = { ...orderToUpdate, products: currentProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating product quantity:', e);
      return false;
    }
  }

  async addModifiersToProduct({ productUuid, modifier, modifierPrice = 0.0, specificOrderId } = {}) {
    try {
      if (!productUuid || !modifier) return false;

      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;

      const currentProducts = [...(orderToUpdate.products ?? [])];
      const productIndex = currentProducts.findIndex(p =>
        p.uuid?.toString() === productUuid &&
        (p.basketid === this.lastItemBasketId.value || p.basketid === this.mealDeallastItemBasketId.value)
      );

      if (productIndex === -1) return false;

      const productToUpdate = { ...currentProducts[productIndex] };
      const modifiers = productToUpdate.modifiers ? [...productToUpdate.modifiers] : [];

      if (modifier.merge === true) {
        const existingIdx = modifiers.findIndex(m => m.uuid === modifier.uuid && m.name === modifier.name);
        if (existingIdx !== -1) {
          const existing = { ...modifiers[existingIdx] };
          existing.qty = (existing.qty ?? 1) + (modifier.qty ?? 1);
          modifiers[existingIdx] = existing;
        } else {
          modifiers.push(modifier);
        }
      } else {
        modifiers.push(modifier);
      }

      productToUpdate.modifiers = modifiers;
      currentProducts[productIndex] = productToUpdate;

      const updatedOrder = { ...orderToUpdate, products: currentProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error adding modifier:', e);
      return false;
    }
  }

  async removeModifierFromProduct({ productUuid, basketUuid, modifierUuid, specificOrderId } = {}) {
    try {
      if (!productUuid || !modifierUuid) return false;

      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;

      const updatedProducts = [...(orderToUpdate.products ?? [])];
      const productIndex = updatedProducts.findIndex(p => p.uuid?.toString() === productUuid && p.basketid === basketUuid);
      if (productIndex === -1) return false;

      const productToUpdate = { ...updatedProducts[productIndex] };
      if (!productToUpdate.modifiers) return false;

      const modifiers = [...productToUpdate.modifiers];
      const modifierIndex = modifiers.findIndex(m => m.uuid?.toString() === modifierUuid);
      if (modifierIndex === -1) return false;

      modifiers.splice(modifierIndex, 1);
      productToUpdate.modifiers = modifiers;
      updatedProducts[productIndex] = productToUpdate;

      const updatedOrder = { ...orderToUpdate, products: updatedProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error removing modifier:', e);
      return false;
    }
  }

  async addProductNote({ productUuid, basketid, note, specificOrderId } = {}) {
    return this._updateProductField(productUuid, basketid, specificOrderId, p => ({ ...p, description: note }));
  }

  async updateProductSellingPrice({ productUuid, basketid, newSellingPrice, specificOrderId } = {}) {
    if (newSellingPrice < 0) return false;
    return this._updateProductField(productUuid, basketid, specificOrderId, p => ({ ...p, selling_price: newSellingPrice }));
  }

  async updateProductCustomName({ productUuid, basketid, newName, specificOrderId } = {}) {
    if (!newName) return false;
    return this._updateProductField(productUuid, basketid, specificOrderId, p => ({ ...p, name: newName }));
  }

  async updateProductKitchenMessage({ productUuid, basketid, newMessage, specificOrderId } = {}) {
    if (!newMessage) return false;
    return this._updateProductField(productUuid, basketid, specificOrderId, p => ({ ...p, description: newMessage }));
  }

  async _updateProductField(productUuid, basketid, specificOrderId, updateFn) {
    try {
      if (!productUuid || !basketid) return false;

      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;

      const currentProducts = [...(orderToUpdate.products ?? [])];
      const productIndex = currentProducts.findIndex(p => p.uuid?.toString() === productUuid && p.basketid === basketid);
      if (productIndex === -1) return false;

      currentProducts[productIndex] = updateFn(currentProducts[productIndex]);

      const updatedOrder = { ...orderToUpdate, products: currentProducts };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating product field:', e);
      return false;
    }
  }

  countModifiersForProduct({ productUuid, modifierGroupUuid } = {}) {
    const order = this.currentOrder;
    if (!order || !order.products) return 0;

    const product = order.products.find(p =>
      p.uuid === productUuid &&
      (!this.lastItemBasketId.value || p.basketid === this.lastItemBasketId.value || p.basketid === this.mealDeallastItemBasketId.value)
    );

    if (!product || !product.modifiers) return 0;
    const modifiers = product.modifiers;
    if (!modifierGroupUuid) return modifiers.length;

    return modifiers
      .filter(m => m.modifierGroupUuid === modifierGroupUuid)
      .reduce((sum, m) => sum + (m.qty ?? 1), 0);
  }

  countMealDealsForProduct({ productUuid, mealDealGroupUuid } = {}) {
    const order = this.currentOrder;
    if (!order || !order.products) return 0;
    return order.products.filter(p =>
      p.mealDealGroupUuid === mealDealGroupUuid && p.parentbasketid === this.lastItemBasketId.value
    ).length;
  }

  // ─── Discount ─────────────────────────────────────────────────────────────────

  async updateOrderDiscount({ discountValue, specificOrderId } = {}) {
    try {
      if (!discountValue) return false;
      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;

      const updatedOrder = { ...orderToUpdate, discount: discountValue };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating discount:', e);
      return false;
    }
  }

  async removeOrderDiscount({ specificOrderId } = {}) {
    try {
      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;
      if (!orderToUpdate.discount) return true;

      const updatedOrder = { ...orderToUpdate, discount: '' };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error removing discount:', e);
      return false;
    }
  }

  calculateOrderDiscount() {
    const order = this.currentOrder;
    if (!order || !order.discount) return 0.0;

    const parts = order.discount.split(',');
    if (parts.length !== 2) return 0.0;

    const discountValue = parseFloat(parts[0]);
    if (isNaN(discountValue)) return 0.0;

    const discountType = parts[1].toLowerCase();
    const orderTotal = this.totalOrderAmount(order);

    if (discountType === 'percentage') {
      return discountValue < 0 || discountValue > 100 ? 0.0 : (orderTotal * discountValue) / 100;
    } else if (discountType === 'fixed') {
      return discountValue < 0 ? 0.0 : Math.min(discountValue, orderTotal);
    }
    return 0.0;
  }

  isDiscountApplied() {
    const order = this.currentOrder;
    return !!(order && order.discount && order.discount.length > 0);
  }

  // ─── Customer / Service type ──────────────────────────────────────────────────

  async updateCustomerUUID(customeruuid, { specificOrderId } = {}) {
    try {
      if (!customeruuid) return false;
      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;
      if (orderToUpdate.last_status !== 'ACTIVATED' && orderToUpdate.last_status !== 'in_progress') return false;

      const updatedOrder = { ...orderToUpdate, customer_uuid: customeruuid };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating customer UUID:', e);
      return false;
    }
  }

  async updateServiceType(serviceType, { specificOrderId } = {}) {
    try {
      if (!serviceType) return false;
      const orderToUpdate = specificOrderId
        ? this.activeOrders.find(o => o.uuid === specificOrderId)
        : this.currentOrder;

      if (!orderToUpdate) return false;
      if (orderToUpdate.last_status !== 'ACTIVATED' && orderToUpdate.last_status !== 'in_progress') return false;

      const updatedOrder = { ...orderToUpdate, service_type: serviceType };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error updating service type:', e);
      return false;
    }
  }

  getCustomerId() { return this.currentOrder?.customer_uuid ?? null; }

  // ─── Totals ───────────────────────────────────────────────────────────────────

  totalCurrentOrderAmount() {
    return this.totalOrderAmount(this.currentOrder);
  }

  totalOrderAmount(orderData) {
    try {
      if (!orderData || !orderData.products || orderData.products.length === 0) return 0.0;

      let total = 0.0;
      for (const product of orderData.products) {
        const qty = this._parseDouble(product.qty ?? 1.0);
        const basePrice = this._parseDouble(product.selling_price ?? product.total_price ?? 0.0);
        total += basePrice * qty;

        if (product.modifiers && Array.isArray(product.modifiers)) {
          for (const modifier of product.modifiers) {
            const price = this._parseDouble(modifier.singlePrice ?? 0.0);
            const modQty = modifier.qty ?? 1.0;
            total += price * modQty;
          }
        }
      }

      if (orderData.discount) {
        total -= this._parseDiscount(orderData.discount, total);
      }

      return parseFloat(total.toFixed(2));
    } catch (e) {
      console.error('[InitialAppState] Error calculating total:', e);
      return 0.0;
    }
  }

  get formattedTotalAmount() {
    return `Rs. ${this.totalCurrentOrderAmount().toFixed(2)}`;
  }

  // ─── Payment ──────────────────────────────────────────────────────────────────

  async _getOrderFromRepository(orderId) {
    if (!orderId) return this.currentOrder;
    try {
      const order = await this._db.extOrders.getOrderByUuid(orderId);
      if (order) return order;
      return this.activeOrders.find(o => o.uuid === orderId) ?? null;
    } catch (e) {
      return null;
    }
  }

  async addPaymentToOrder({ paymentMethod, amount, specificOrderId, additionalData, isRefundOrder = false } = {}) {
    try {
      if (!PAYMENT_METHODS.includes(paymentMethod?.toUpperCase())) return false;

      const orderToUpdate = await this._getOrderFromRepository(specificOrderId);
      if (!orderToUpdate) return false;

      const paymentId = crypto.randomUUID();
      const now = new Date().toISOString();

      const payment = {
        id: paymentId,
        type: paymentMethod.toUpperCase(),
        amount,
        status: isRefundOrder ? 'REFUNDED' : 'COMPLETED',
        initiated_at: now,
        completed_at: now,
        gateway: paymentMethod === 'CARD' ? 'stripe' : null,
        reference: additionalData?.reference ?? null,
        user_id: 'system',
        ...(additionalData ?? {}),
      };

      const payments = [...(orderToUpdate.payments ?? []), payment];

      const updatedOrder = { ...orderToUpdate, payments, updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error adding payment:', e);
      return false;
    }
  }

  async isOrderPaidAsync({ specificOrderId } = {}) {
    const order = await this._getOrderFromRepository(specificOrderId);
    if (!order) return false;
    const payments = order.payments ?? [];
    if (payments.length === 0) return false;
    const totalPaid = payments.reduce((sum, p) => sum + this._parseDouble(p.amount), 0);
    return totalPaid >= this.totalOrderAmount(order);
  }

  isOrderPaid({ specificOrderId } = {}) {
    const order = specificOrderId
      ? this.activeOrders.find(o => o.uuid === specificOrderId)
      : this.currentOrder;
    if (!order) return false;
    const payments = order.payments ?? [];
    const totalPaid = payments
      .filter(p => ['completed', 'paid'].includes(p.status?.toLowerCase() ?? ''))
      .reduce((sum, p) => sum + this._parseDouble(p.amount), 0);
    return totalPaid >= this.totalOrderAmount(order);
  }

  async getRemainingPaymentAsync({ specificOrderId } = {}) {
    const order = await this._getOrderFromRepository(specificOrderId);
    if (!order) return 0.0;
    const orderTotal = this.totalOrderAmount(order);
    const totalPaid = (order.payments ?? [])
      .filter(p => ['completed', 'paid'].includes(p.status?.toLowerCase() ?? ''))
      .reduce((sum, p) => sum + this._parseDouble(p.amount), 0);
    return Math.max(0, orderTotal - totalPaid);
  }

  getRemainingPayment({ specificOrderId } = {}) {
    const order = specificOrderId
      ? this.activeOrders.find(o => o.uuid === specificOrderId)
      : this.currentOrder;
    if (!order) return 0.0;
    const orderTotal = this.totalOrderAmount(order);
    const totalPaid = (order.payments ?? [])
      .filter(p => ['completed', 'paid'].includes(p.status?.toLowerCase() ?? ''))
      .reduce((sum, p) => sum + this._parseDouble(p.amount), 0);
    return Math.max(0, orderTotal - totalPaid);
  }

  async refundPayment({ paymentId, amount, reason, specificOrderId } = {}) {
    try {
      const orderToUpdate = await this._getOrderFromRepository(specificOrderId);
      if (!orderToUpdate) return false;

      const payments = [...(orderToUpdate.payments ?? [])];
      const paymentIndex = payments.findIndex(p => p.id === paymentId);
      if (paymentIndex === -1) return false;

      const now = new Date().toISOString();
      const refundAmount = amount ?? this._parseDouble(payments[paymentIndex].amount);

      payments[paymentIndex] = {
        ...payments[paymentIndex],
        status: 'REFUNDED',
        refund: {
          id: crypto.randomUUID(),
          payment_id: paymentId,
          amount: refundAmount,
          reason: reason ?? 'Customer requested',
          status: 'COMPLETED',
          refunded_at: now,
          refunded_by: 'system',
        },
      };

      const updatedOrder = { ...orderToUpdate, payments, last_status: 'REFUNDED', updated_at: now };
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToUpdate.uuid);

      const index = this.activeOrders.findIndex(o => o.uuid === orderToUpdate.uuid);
      if (index !== -1) this.activeOrders[index] = updatedOrder;

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error refunding payment:', e);
      return false;
    }
  }

  async getPaymentSummaryAsync({ specificOrderId } = {}) {
    const order = await this._getOrderFromRepository(specificOrderId);
    if (!order) return { orderTotal: 0, totalPaid: 0, remaining: 0, isPaid: false, paymentStatus: 'PENDING', payments: [] };

    const orderTotal = this.totalOrderAmount(order);
    const payments = order.payments ?? [];
    const totalPaid = payments
      .filter(p => ['completed', 'paid'].includes(p.status?.toLowerCase() ?? ''))
      .reduce((sum, p) => sum + this._parseDouble(p.amount), 0);
    const remaining = Math.max(0, orderTotal - totalPaid);
    const paymentStatus = totalPaid >= orderTotal ? 'COMPLETED' : totalPaid > 0 ? 'PARTIAL' : 'PENDING';

    return { orderTotal, totalPaid, remaining, isPaid: totalPaid >= orderTotal, paymentStatus, payments };
  }

  // ─── Complete order ───────────────────────────────────────────────────────────

  async completeOrder({ specificOrderId, method = 'CASH', forceFinished = false, isRefundOrder = false } = {}) {
    let orderToUpdate = null;
    try {
      let orderToComplete = specificOrderId
        ? await this._getOrderFromRepository(specificOrderId)
        : this.currentOrder;

      if (!orderToComplete) return false;

      const lastStatus = orderToComplete.last_status ?? '';
      if (lastStatus !== 'ACTIVATED' && lastStatus.toLowerCase() !== 'in_progress' && lastStatus !== 'PARKED') return false;

      const products = orderToComplete.products;
      if (!products || products.length === 0) return false;

      if (!await this.isOrderPaidAsync({ specificOrderId: orderToComplete.uuid })) {
        if (method !== 'SPLIT') {
          const orderTotal = this.totalOrderAmount(orderToComplete);
          await this.addPaymentToOrder({ isRefundOrder, paymentMethod: method, amount: orderTotal, specificOrderId: orderToComplete.uuid });

          const updatedIdx = this.activeOrders.findIndex(o => o.uuid === orderToComplete.uuid);
          if (updatedIdx !== -1) orderToComplete = this.activeOrders[updatedIdx];
        } else {
          return false;
        }
      }

      const now = new Date().toISOString();
      const statusStages = [...(orderToComplete.status_stages ?? [])];
      const serviceTypeLower = orderToComplete.service_type?.toLowerCase();

      const newStatus = isRefundOrder || forceFinished || serviceTypeLower === 'in_store' ? 'COMPLETED' : 'PARKED';
      const newTicketStatus = isRefundOrder || forceFinished || serviceTypeLower === 'in_store' ? 'Finished' : 'ACCEPTED';

      statusStages.push({ status: newStatus, timestamp: now, updated_by: 'system' });

      const ticketStatusStages = [...(orderToComplete.ticket_status_stages ?? [])];
      ticketStatusStages.push({ ticket_status: newTicketStatus, timestamp: now, updated_by: 'system' });

      const updatedOrder = {
        ...orderToComplete,
        last_status: newStatus,
        status_stages: statusStages,
        ticket_status_stages: ticketStatusStages,
        updated_at: now,
      };

      orderToUpdate = updatedOrder;
      await this._db.extOrders.updateOrderByUUID(updatedOrder, orderToComplete.uuid);

      this.activeOrders = this.activeOrders.filter(o => o.uuid !== orderToComplete.uuid);

      const idx = this.currentActiveOrderIndex.value;
      if (idx >= this.activeOrders.length) {
        this.currentActiveOrderIndex.add(Math.max(0, this.activeOrders.length - 1));
      }

      if (this.activeOrders.length === 0) await this._createNewOrder();

      return true;
    } catch (e) {
      console.error('[InitialAppState] Error completing order:', e);
      return false;
    } finally {
      if (orderToUpdate) this._backgroundSupabaseSync(orderToUpdate);
    }
  }

  // ─── Reset ────────────────────────────────────────────────────────────────────

  resetOrder() {
    this.activeOrders = [];
    this.parkedOrders = [];
    this.heldOrders = [];
    this.currentActiveOrderIndex.add(0);
    this.isEditModeActive.add(false);
    this.tempOrderBeingEdited.add(null);
    this.editingOrderId.add(null);
    this.lastItemBasketId.add(null);
    this.mealDeallastItemBasketId.add(null);
    this.selectedBasketProductIndex.add(null);
  }

  async resetToNewOrder() {
    this.resetOrder();
    await this._createNewOrder();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  _parseDouble(value) {
    if (value == null) return 0.0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0.0;
    return 0.0;
  }

  _parseDiscount(discount, total) {
    try {
      if (!discount) return 0.0;
      if (discount.endsWith('%')) {
        const percent = parseFloat(discount.slice(0, -1));
        return total * (percent / 100);
      }
      return parseFloat(discount) || 0.0;
    } catch (_) { return 0.0; }
  }

  generateTrackingNumber() {
    const random = (Date.now() * 1000) % 1000000000000;
    return random.toString().padStart(12, '0');
  }

  _backgroundSupabaseSync(orderToUpdate) {
    (async () => {
      try {
        const orderData = { ...orderToUpdate };
        delete orderData.last_status;
        delete orderData.synced_at;
        delete orderData.id;
        delete orderData.order_mode;
        delete orderData.supabase_id;

        orderData.mode = (orderToUpdate.mode ?? 'SALE').toUpperCase();
        orderData.country = 'GB';
        orderData.status = orderToUpdate.last_status ?? 'PARKED';
        orderData.tracking_number = this.generateTrackingNumber();
        orderData.sale_channel_type = 'POS';

        const statusStages = orderToUpdate.status_stages ?? [];
        orderData.status_timestamp = statusStages.length > 0
          ? statusStages[statusStages.length - 1].timestamp
          : new Date().toISOString();

        const ticketStages = orderToUpdate.ticket_status_stages ?? [];
        orderData.ticket_status = (ticketStages.length > 0
          ? ticketStages[ticketStages.length - 1].ticket_status
          : 'WAITING_FOR_APPROVAL').toUpperCase();
        orderData.ticket_status_timestamp = ticketStages.length > 0
          ? ticketStages[ticketStages.length - 1].timestamp
          : new Date().toISOString();

        const { error } = await this._supabase.from('ext_orders').upsert(orderData);
        if (error) {
          await this._db.extQuery.insertItem({
            uuid: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            operation_at: new Date().toISOString(),
            version: 0,
            entity: 'ext_orders',
            operation: 'upsert',
            entity_id: orderToUpdate.uuid,
            location_id: String(orderToUpdate.location_id),
          });
        }
      } catch (e) {
        console.error('[InitialAppState] Background sync error:', e);
      }
    })();
  }
}

export const initialAppStateService = new InitialAppStateService();
