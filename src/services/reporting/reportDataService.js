import { batchService } from './batchService.js';

const CACHE_VALID_MS = 30 * 1000;

class ReportDataService {
  constructor() {
    this._db = null;
    this._cachedOrders = null;
    this._cacheTimestamp = null;
  }

  async init(db) {
    this._db = db;
    return this;
  }

  async _getOrders({ forceRefresh = false } = {}) {
    if (!forceRefresh && this._cachedOrders && this._cacheTimestamp &&
      (Date.now() - this._cacheTimestamp) < CACHE_VALID_MS) {
      return this._cachedOrders;
    }
    this._cachedOrders = await this._db.extOrders.getAllOrders();
    this._cacheTimestamp = Date.now();
    return this._cachedOrders;
  }

  clearCache() {
    this._cachedOrders = null;
    this._cacheTimestamp = null;
  }

  async getOrdersByDateRange({ startDate, endDate, statuses, serviceType, customerId } = {}) {
    try {
      const allOrders = await this._getOrders();
      return allOrders.filter(order => {
        const orderDate = new Date(order.created_at ?? Date.now());
        if (orderDate < startDate || orderDate > endDate) return false;
        if (statuses?.length && !statuses.includes(order.last_status?.toLowerCase())) return false;
        if (serviceType && order.service_type?.toLowerCase() !== serviceType.toLowerCase()) return false;
        if (customerId && order.customer_uuid !== customerId) return false;
        return true;
      });
    } catch (e) {
      console.error('[ReportDataService] Error getting orders by date range:', e);
      return [];
    }
  }

  async getTodayOrders() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return this.getOrdersByDateRange({ startDate: startOfDay, endDate: endOfDay });
  }

  async getCompletedOrders({ startDate, endDate } = {}) {
    const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ?? new Date();
    return this.getOrdersByDateRange({ startDate: start, endDate: end, statuses: ['completed'] });
  }

  async getRefundedOrders({ startDate, endDate } = {}) {
    const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ?? new Date();
    return this.getOrdersByDateRange({ startDate: start, endDate: end, statuses: ['refund'] });
  }

  async getVoidedOrders({ startDate, endDate } = {}) {
    const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ?? new Date();
    return this.getOrdersByDateRange({ startDate: start, endDate: end, statuses: ['voided'] });
  }

  async calculateRevenueSummary({ startDate, endDate } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
      });

      let grossSales = 0, totalDiscounts = 0, totalRefunds = 0;
      let completedOrders = 0, refundedOrders = 0, voidedOrders = 0;

      for (const order of orders) {
        const orderTotal = this._calculateOrderTotal(order);
        const discount = this._calculateOrderDiscount(order, orderTotal);
        const status = (order.last_status ?? '').toLowerCase();

        if (status === 'completed') {
          completedOrders++;
          grossSales += orderTotal;
          totalDiscounts += discount;
        } else if (status === 'refund') {
          refundedOrders++;
          totalRefunds += orderTotal;
        } else if (status === 'voided') {
          voidedOrders++;
        }
      }

      const netSales = grossSales - totalDiscounts - totalRefunds;
      const averageOrderValue = completedOrders > 0 ? grossSales / completedOrders : 0;

      return {
        gross_sales: grossSales, net_sales: netSales, total_discounts: totalDiscounts,
        total_refunds: totalRefunds, total_orders: orders.length, completed_orders: completedOrders,
        refunded_orders: refundedOrders, voided_orders: voidedOrders,
        average_order_value: averageOrderValue, total_tax: 0,
      };
    } catch (e) {
      console.error('[ReportDataService] Error calculating revenue summary:', e);
      return {};
    }
  }

  async getHourlySalesBreakdown({ startDate, endDate } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
        statuses: ['completed'],
      });

      const hourlyData = {};
      for (let h = 0; h < 24; h++) {
        hourlyData[h] = { hour: h, sales: 0, order_count: 0, items_sold: 0 };
      }

      for (const order of orders) {
        const hour = new Date(order.created_at ?? Date.now()).getHours();
        const orderTotal = this._calculateOrderTotal(order);
        const discount = this._calculateOrderDiscount(order, orderTotal);
        hourlyData[hour].sales += orderTotal - discount;
        hourlyData[hour].order_count += 1;
        hourlyData[hour].items_sold += order.products?.length ?? 0;
      }

      return hourlyData;
    } catch (e) {
      console.error('[ReportDataService] Error getting hourly breakdown:', e);
      return {};
    }
  }

  async getTopProducts({ startDate, endDate, limit = 10 } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
        statuses: ['completed'],
      });

      const productStats = {};

      for (const order of orders) {
        if (!order.products) continue;
        for (const product of order.products) {
          const uuid = product.uuid?.toString() ?? '';
          if (!uuid) continue;
          const qty = this._parseDouble(product.qty ?? 1);
          const price = this._parseDouble(product.selling_price ?? 0);
          const revenue = price * qty;

          if (productStats[uuid]) {
            productStats[uuid].quantity_sold += qty;
            productStats[uuid].revenue += revenue;
          } else {
            productStats[uuid] = { uuid, name: product.name ?? 'Unknown', quantity_sold: qty, revenue, category_uuid: product.category_uuid };
          }
        }
      }

      return Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    } catch (e) {
      console.error('[ReportDataService] Error getting top products:', e);
      return [];
    }
  }

  async getCategoryPerformance({ startDate, endDate } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
        statuses: ['completed'],
      });

      const categoryStats = {};

      for (const order of orders) {
        if (!order.products) continue;
        for (const product of order.products) {
          const categoryUuid = product.category_uuid?.toString();
          if (!categoryUuid) continue;
          const qty = this._parseDouble(product.qty ?? 1);
          const price = this._parseDouble(product.selling_price ?? 0);
          const revenue = price * qty;

          if (categoryStats[categoryUuid]) {
            categoryStats[categoryUuid].items_sold += qty;
            categoryStats[categoryUuid].revenue += revenue;
            categoryStats[categoryUuid].order_count += 1;
          } else {
            const categoryName = await this._getCategoryName(categoryUuid);
            categoryStats[categoryUuid] = { uuid: categoryUuid, name: categoryName, items_sold: qty, revenue, order_count: 1 };
          }
        }
      }

      return Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);
    } catch (e) {
      console.error('[ReportDataService] Error getting category performance:', e);
      return [];
    }
  }

  async getPaymentMethodBreakdown({ startDate, endDate } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
        statuses: ['completed'],
      });

      const paymentMethods = {};
      for (const order of orders) {
        if (!order.payments?.length) continue;
        for (const payment of order.payments) {
          const method = payment.type?.toString() ?? 'Unknown';
          const amount = this._parseDouble(payment.amount ?? 0);
          paymentMethods[method] = (paymentMethods[method] ?? 0) + amount;
        }
      }
      return paymentMethods;
    } catch (e) {
      console.error('[ReportDataService] Error getting payment breakdown:', e);
      return {};
    }
  }

  async getServiceTypeBreakdown({ startDate, endDate } = {}) {
    try {
      const orders = await this.getOrdersByDateRange({
        startDate: startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ?? new Date(),
        statuses: ['completed'],
      });

      const serviceTypes = {};
      for (const order of orders) {
        const serviceType = order.service_type ?? 'Unknown';
        const orderTotal = this._calculateOrderTotal(order);
        const discount = this._calculateOrderDiscount(order, orderTotal);
        const netTotal = orderTotal - discount;

        if (serviceTypes[serviceType]) {
          serviceTypes[serviceType].order_count += 1;
          serviceTypes[serviceType].revenue += netTotal;
        } else {
          serviceTypes[serviceType] = { service_type: serviceType, order_count: 1, revenue: netTotal };
        }
      }
      return serviceTypes;
    } catch (e) {
      console.error('[ReportDataService] Error getting service type breakdown:', e);
      return {};
    }
  }

  _calculateOrderTotal(order) {
    if (!order.products?.length) return 0;
    let total = 0;
    for (const product of order.products) {
      const qty = this._parseDouble(product.qty ?? 1);
      const price = this._parseDouble(product.selling_price ?? 0);
      total += price * qty;
      if (product.modifiers && Array.isArray(product.modifiers)) {
        for (const modifier of product.modifiers) {
          total += this._parseDouble(modifier.singlePrice ?? 0) * this._parseDouble(modifier.qty ?? 1);
        }
      }
    }
    return total;
  }

  _calculateOrderDiscount(order, orderTotal) {
    try {
      if (!order.discount) return 0;
      const parts = order.discount.split(',');
      if (parts.length !== 2) return 0;
      const value = parseFloat(parts[0]) || 0;
      const type = parts[1].toLowerCase();
      if (type === 'percentage') return (orderTotal * value) / 100;
      if (type === 'fixed') return Math.min(value, orderTotal);
      return 0;
    } catch (_) { return 0; }
  }

  _parseDouble(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  }

  async _getCategoryName(categoryUuid) {
    try {
      return await this._db.categories.getCategoryNameByUuid(categoryUuid) ?? 'Unknown';
    } catch (_) { return 'Unknown'; }
  }
}

export const reportDataService = new ReportDataService();
