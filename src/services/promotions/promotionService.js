const CACHE_DURATION_MS = 5 * 60 * 1000;

export const PromotionType = Object.freeze({
  PERCENT_DISCOUNT: 'percentDiscount',
  FLAT_DISCOUNT: 'flatDiscount',
  FREE_ITEM: 'freeItem',
  BUY_ONE_GET_ONE: 'buyOneGetOne',
  BUY_X_GET_Y_PERCENT: 'buyXGetYPercent',
  BUY_X_GET_Y_PERCENT_ON_Z: 'buyXGetYPercentOnZ',
  BUNDLE_DEAL: 'bundleDeal',
});

class PromotionService {
  constructor() {
    this._db = null;
    this._cachedPromotions = null;
    this._cacheTime = null;
  }

  async init(db) {
    this._db = db;
    return this;
  }

  async getActivePromotions({ forceRefresh = false } = {}) {
    if (!forceRefresh && this._cachedPromotions && this._cacheTime &&
      (Date.now() - this._cacheTime) < CACHE_DURATION_MS) {
      return this._cachedPromotions;
    }
    this._cachedPromotions = await this._db.promotions.getActive();
    this._cacheTime = Date.now();
    return this._cachedPromotions;
  }

  clearCache() {
    this._cachedPromotions = null;
    this._cacheTime = null;
  }

  async checkProductPromotions({ productId, currentBasket }) {
    const results = [];

    try {
      const promotions = await this._db.promotions.getForProduct(productId);
      if (!promotions.length) return results;

      const basketItem = currentBasket.find(item => item.uuid === productId) ?? {};
      const currentQty = parseInt(basketItem.qty ?? 0, 10) || 0;

      for (const promo of promotions) {
        if (!this._isPromoValid(promo)) continue;

        const isEligible = currentQty >= promo.min_quantity;
        const canBeEligible = currentQty < promo.min_quantity;

        if (isEligible || canBeEligible) {
          results.push({
            isEligible,
            canBeEligible,
            promotion: promo,
            currentQty,
            requiredQty: promo.min_quantity,
            qtyNeeded: Math.max(0, promo.min_quantity - currentQty),
            suggestionMessage: this._buildSuggestionMessage(promo, currentQty),
          });
        }
      }

      results.sort((a, b) => b.promotion.priority - a.promotion.priority);
    } catch (e) {
      console.error('[PromotionService] Error checking promotions:', e);
    }

    return results;
  }

  _isPromoValid(promo) {
    if (!promo.is_active) return false;
    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) return false;
    if (promo.end_date && new Date(promo.end_date) < now) return false;
    return true;
  }

  _buildSuggestionMessage(promo, currentQty) {
    const needed = promo.min_quantity - currentQty;
    if (needed <= 0) return `${promo.name} applied!`;

    const itemText = needed === 1 ? '1 more item' : `${needed} more items`;

    switch (promo.type) {
      case PromotionType.PERCENT_DISCOUNT:
        return `Add ${itemText} to get ${promo.discount_percent?.toFixed(0)}% OFF!`;
      case PromotionType.FLAT_DISCOUNT:
        return `Add ${itemText} to get Rs.${promo.discount_amount?.toFixed(0)} OFF!`;
      case PromotionType.FREE_ITEM:
        return `Add ${itemText} to get ${promo.free_product_qty ?? 1} item FREE!`;
      case PromotionType.BUY_ONE_GET_ONE:
        return `Add ${itemText} to get 1 FREE!`;
      case PromotionType.BUY_X_GET_Y_PERCENT:
        return `Add ${itemText} to get ${promo.discount_percent?.toFixed(0)}% OFF on all!`;
      case PromotionType.BUY_X_GET_Y_PERCENT_ON_Z:
        return `Add ${itemText} to get ${promo.discount_percent?.toFixed(0)}% OFF on ${promo.discount_on_items ?? 1} item!`;
      case PromotionType.BUNDLE_DEAL:
        return `Add ${itemText} for Bundle Deal!`;
      default:
        return `Add ${itemText} to unlock promotion!`;
    }
  }

  static applyPromotion({ promotion, basket, triggerProductId }) {
    try {
      const item = basket.find(i => i.uuid === triggerProductId);
      if (!item) return null;
      if ((item.qty ?? 0) < promotion.min_quantity) return null;

      let discountAmount = 0;
      let freeItems = null;
      let message = '';

      switch (promotion.type) {
        case PromotionType.PERCENT_DISCOUNT:
          discountAmount = (item.selling_price * item.qty) * (promotion.discount_percent / 100);
          message = `${promotion.discount_percent?.toFixed(0)}% OFF applied!`;
          break;

        case PromotionType.FLAT_DISCOUNT:
          discountAmount = promotion.discount_amount;
          message = `Rs.${promotion.discount_amount?.toFixed(0)} OFF!`;
          break;

        case PromotionType.FREE_ITEM:
          freeItems = [{ productId: promotion.free_product_id ?? triggerProductId, quantity: promotion.free_product_qty ?? 1 }];
          message = `${promotion.free_product_qty ?? 1} FREE item added!`;
          break;

        case PromotionType.BUY_ONE_GET_ONE:
          freeItems = [{ productId: triggerProductId, quantity: item.qty }];
          message = `${item.qty} FREE items added!`;
          break;

        case PromotionType.BUY_X_GET_Y_PERCENT:
          discountAmount = (item.selling_price * item.qty) * (promotion.discount_percent / 100);
          message = `${promotion.discount_percent?.toFixed(0)}% OFF on all!`;
          break;

        case PromotionType.BUY_X_GET_Y_PERCENT_ON_Z: {
          const discountQty = promotion.discount_on_items ?? 1;
          discountAmount = (item.selling_price * discountQty) * (promotion.discount_percent / 100);
          message = `${promotion.discount_percent?.toFixed(0)}% OFF on ${discountQty} item(s)!`;
          break;
        }

        case PromotionType.BUNDLE_DEAL:
          discountAmount = promotion.discount_amount ?? 0;
          message = 'Bundle Deal applied!';
          break;
      }

      return { promotion, discountAmount, freeItems, message };
    } catch (e) {
      console.error('[PromotionService] Error applying promotion:', e);
      return null;
    }
  }

  async getBestPromotion({ productId, basket }) {
    const results = await this.checkProductPromotions({ productId, currentBasket: basket });
    if (!results.length) return null;

    const eligible = results.filter(r => r.isEligible);
    if (eligible.length) return eligible[0];

    const potential = results.filter(r => r.canBeEligible).sort((a, b) => a.qtyNeeded - b.qtyNeeded);
    return potential.length ? potential[0] : null;
  }

  static calculateBasketDiscount({ basket, appliedPromotions }) {
    return appliedPromotions.reduce((total, applied) => total + applied.discountAmount, 0);
  }

  // CRUD wrappers
  async createPromotion(promotion) {
    this.clearCache();
    return await this._db.promotions.insert(promotion);
  }

  async updatePromotion(promotion) {
    this.clearCache();
    return await this._db.promotions.updatePromotion(promotion);
  }

  async deletePromotion(id) {
    this.clearCache();
    return await this._db.promotions.deletePromotion(id);
  }

  async getAllPromotions() {
    return await this._db.promotions.getAll();
  }

  async getPromotionById(id) {
    return await this._db.promotions.getById(id);
  }
}

export const promotionService = new PromotionService();
