import { BehaviorSubject } from '../behaviorSubject.js';
import { authService } from '../authService.js';

class BatchService {
  constructor() {
    this.activeBatch = new BehaviorSubject(null);
    this.currentBatchStats = new BehaviorSubject(null);

    this._db = null;
    this._midnightCheckTimer = null;
    this._midnightDailyTimer = null;
  }

  async init(db) {
    this._db = db;
    await this.initializeBatchSystem();
    this._startMidnightCheckTimer();
    return this;
  }

  dispose() {
    clearTimeout(this._midnightCheckTimer);
    clearInterval(this._midnightDailyTimer);
  }

  async initializeBatchSystem() {
    try {
      const locationId = authService.selectedLocation.value?.id;
      if (!locationId) return;

      const existingBatch = await this._db.batchReports.getActiveBatchReport(String(locationId));

      if (existingBatch) {
        this.activeBatch.add(existingBatch);

        if (this._shouldAutoCloseBatch(existingBatch.start_date)) {
          await this._autoCloseBatch(existingBatch);
          await this._createNewBatch();
        }
      } else {
        await this._createNewBatch();
      }
    } catch (e) {
      console.error('[BatchService] Error initializing batch system:', e);
    }
  }

  async _createNewBatch() {
    try {
      const locationId = authService.selectedLocation.value?.id;
      const terminalId = authService.selectedTerminal.value?.id;
      if (!locationId || !terminalId) return false;

      const uuid = crypto.randomUUID();
      const now = new Date();
      const batchName = `Batch ${this._formatDate(now)}`;

      const newBatch = {
        uuid,
        batch_name: batchName,
        start_date: now.toISOString(),
        status: 'ACTIVE',
        location_id: String(locationId),
        terminal_id: String(terminalId),
        total_sales: 0.0,
        total_cost: 0.0,
        gross_profit: 0.0,
        net_profit: 0.0,
        total_orders: 0,
        total_items_sold: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      await this._db.batchReports.createBatchReport(newBatch);
      this.activeBatch.add(newBatch);
      return true;
    } catch (e) {
      console.error('[BatchService] Error creating new batch:', e);
      return false;
    }
  }

  async startNewBatch() {
    try {
      if (this.activeBatch.value?.status === 'ACTIVE') {
        const closed = await this.closeBatch(this.activeBatch.value.uuid);
        if (!closed) return false;
      }
      return await this._createNewBatch();
    } catch (e) {
      console.error('[BatchService] Error starting new batch:', e);
      return false;
    }
  }

  async closeBatch(uuid) {
    try {
      const stats = await this.calculateBatchStats(uuid);
      if (!stats) return false;

      const totalItems = stats.topProducts.reduce((sum, p) => sum + p.quantitySold, 0);

      const success = await this._db.batchReports.closeBatchReport(uuid, {
        totalSales: stats.grossSales,
        totalCost: 0.0,
        grossProfit: stats.grossSales,
        netProfit: stats.netSales,
        totalOrders: stats.totalOrders,
        totalItemsSold: totalItems,
        categoryBreakdown: this._convertCategoryStatsToMap(stats.categoryStats),
        productBreakdown: this._convertTopProductsToMap(stats.topProducts),
        paymentMethodBreakdown: stats.paymentMethodBreakdown,
        serviceTypeBreakdown: stats.serviceTypeBreakdown,
      });

      if (success) {
        const current = this.activeBatch.value;
        if (current) {
          this.activeBatch.add({ ...current, status: 'CLOSED', end_date: new Date().toISOString(), closed_at: new Date().toISOString() });
        }
      }

      return success;
    } catch (e) {
      console.error('[BatchService] Error closing batch:', e);
      return false;
    }
  }

  async _autoCloseBatch(batch) {
    try {
      await this.closeBatch(batch.uuid);
    } catch (e) {
      console.error('[BatchService] Error auto-closing batch:', e);
    }
  }

  _shouldAutoCloseBatch(batchStartDate) {
    const start = new Date(batchStartDate);
    const now = new Date();
    return start.getFullYear() !== now.getFullYear() ||
      start.getMonth() !== now.getMonth() ||
      start.getDate() !== now.getDate();
  }

  _startMidnightCheckTimer() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this._midnightCheckTimer = setTimeout(async () => {
      await this._onMidnightReached();
      this._midnightDailyTimer = setInterval(() => this._onMidnightReached(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  async _onMidnightReached() {
    try {
      if (this.activeBatch.value?.status === 'ACTIVE') {
        await this._autoCloseBatch(this.activeBatch.value);
        await this._createNewBatch();
      }
    } catch (e) {
      console.error('[BatchService] Error handling midnight batch closure:', e);
    }
  }

  async calculateBatchStats(batchUuid) {
    try {
      const batch = await this._db.batchReports.getBatchReportByUuid(batchUuid);
      if (!batch) return null;

      const allOrders = await this._db.extOrders.getAllOrders();

      const batchStart = new Date(batch.start_date ?? Date.now());
      const batchEnd = batch.end_date ? new Date(batch.end_date) : null;

      const batchOrders = allOrders.filter(order => {
        const orderDate = new Date(order.created_at ?? Date.now());
        return orderDate > batchStart && (batch.status === 'ACTIVE' || !batchEnd || orderDate < batchEnd);
      });

      let grossSales = 0, discounts = 0, refunds = 0;
      let totalOrders = batchOrders.length;
      let completedOrders = 0, refundedOrders = 0, voidedOrders = 0, canceledOrders = 0;

      const paymentMethodBreakdown = {};
      const serviceTypeBreakdown = {};
      const hourlyOrderCount = {};
      const hourlySales = {};
      const categoryStats = {};
      const productDataMap = {};

      for (const order of batchOrders) {
        let orderTotal = 0;

        if (order.products) {
          for (const product of order.products) {
            const qty = this._parseDouble(product.qty ?? 1.0);
            const price = this._parseDouble(product.selling_price ?? 0.0);
            orderTotal += price * qty;

            const productUuid = product.uuid?.toString() ?? '';
            const productName = product.name ?? 'Unknown';
            const categoryUuid = product.category_uuid?.toString();

            if (productUuid) {
              if (productDataMap[productUuid]) {
                productDataMap[productUuid].quantitySold += qty;
                productDataMap[productUuid].revenue += price * qty;
              } else {
                productDataMap[productUuid] = {
                  productUuid, productName, quantitySold: qty, revenue: price * qty, categoryUuid,
                };
              }
            }

            if (categoryUuid) {
              if (categoryStats[categoryUuid]) {
                categoryStats[categoryUuid].itemsSold += qty;
                categoryStats[categoryUuid].revenue += price * qty;
                categoryStats[categoryUuid].orderCount += 1;
              } else {
                const categoryName = await this._getCategoryName(categoryUuid);
                categoryStats[categoryUuid] = {
                  categoryUuid, categoryName, itemsSold: qty, revenue: price * qty, orderCount: 1,
                };
              }
            }
          }
        }

        if (order.discount) {
          const discountValue = this._parseDiscount(order.discount, orderTotal);
          discounts += discountValue;
          orderTotal -= discountValue;
        }

        grossSales += orderTotal;

        const status = (order.last_status ?? '').toLowerCase();
        if (status === 'completed') completedOrders++;
        else if (status === 'refund') { refundedOrders++; refunds += orderTotal; }
        else if (status === 'voided') voidedOrders++;
        else if (status === 'canceled') canceledOrders++;

        const serviceType = order.service_type ?? 'Unknown';
        serviceTypeBreakdown[serviceType] = (serviceTypeBreakdown[serviceType] ?? 0) + orderTotal;

        if (order.payments) {
          for (const payment of order.payments) {
            const method = payment.type?.toString() ?? 'Unknown';
            const amount = this._parseDouble(payment.amount ?? 0);
            paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] ?? 0) + amount;
          }
        }

        const orderDate = new Date(order.created_at ?? Date.now());
        const hour = `${String(orderDate.getHours()).padStart(2, '0')}:00`;
        hourlyOrderCount[hour] = (hourlyOrderCount[hour] ?? 0) + 1;
        hourlySales[hour] = (hourlySales[hour] ?? 0) + orderTotal;
      }

      const topProducts = Object.values(productDataMap).sort((a, b) => b.revenue - a.revenue).slice(0, 20);
      const netSales = grossSales - discounts - refunds;
      const averageOrderValue = totalOrders > 0 ? grossSales / totalOrders : 0;

      return {
        batchUuid, grossSales, netSales, discounts, refunds, tax: 0,
        totalOrders, completedOrders, refundedOrders, voidedOrders, canceledOrders,
        averageOrderValue, paymentMethodBreakdown, serviceTypeBreakdown,
        hourlyOrderCount, hourlySales, topProducts, categoryStats,
        calculatedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error('[BatchService] Error calculating batch stats:', e);
      return null;
    }
  }

  async updateBatchStats() {
    try {
      if (!this.activeBatch.value || this.activeBatch.value.status !== 'ACTIVE') return;

      const stats = await this.calculateBatchStats(this.activeBatch.value.uuid);
      if (!stats) return;

      this.currentBatchStats.add(stats);
      const totalItems = stats.topProducts.reduce((sum, p) => sum + p.quantitySold, 0);

      await this._db.batchReports.updateBatchReportStats(this.activeBatch.value.uuid, {
        totalSales: stats.grossSales,
        totalCost: 0,
        grossProfit: stats.grossSales,
        netProfit: stats.netSales,
        totalOrders: stats.totalOrders,
        totalItemsSold: totalItems,
      });
    } catch (e) {
      console.error('[BatchService] Error updating batch stats:', e);
    }
  }

  async getBatchHistory({ startDate, endDate, locationId } = {}) {
    try {
      const locId = locationId ?? String(authService.selectedLocation.value?.id ?? '');
      const start = startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ?? new Date();
      return await this._db.batchReports.getBatchReportsByDateRange({ startDate: start, endDate: end, locationId: locId });
    } catch (e) {
      console.error('[BatchService] Error getting batch history:', e);
      return [];
    }
  }

  async getBatchByUuid(uuid) {
    try {
      return await this._db.batchReports.getBatchReportByUuid(uuid);
    } catch (e) {
      console.error('[BatchService] Error getting batch by UUID:', e);
      return null;
    }
  }

  _parseDouble(value) {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    return 0;
  }

  _parseDiscount(discount, total) {
    try {
      if (!discount) return 0;
      const parts = discount.split(',');
      if (parts.length !== 2) return 0;
      const value = parseFloat(parts[0]) || 0;
      const type = parts[1].toLowerCase();
      if (type === 'percentage') return (total * value) / 100;
      if (type === 'fixed') return Math.min(value, total);
      return 0;
    } catch (_) { return 0; }
  }

  async _getCategoryName(categoryUuid) {
    try {
      return await this._db.categories.getCategoryNameByUuid(categoryUuid) ?? 'Unknown';
    } catch (_) { return 'Unknown'; }
  }

  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  _convertCategoryStatsToMap(categoryStats) {
    const result = {};
    for (const [key, val] of Object.entries(categoryStats)) {
      result[key] = { name: val.categoryName, items_sold: val.itemsSold, revenue: val.revenue, order_count: val.orderCount };
    }
    return result;
  }

  _convertTopProductsToMap(products) {
    const result = {};
    products.forEach((p, i) => {
      result[p.productUuid] = { name: p.productName, quantity_sold: p.quantitySold, revenue: p.revenue, rank: i + 1 };
    });
    return result;
  }
}

export const batchService = new BatchService();
