// Simple basket item for reference
// ignore_for_file: avoid_print

import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/promotion_model/promotion_model.dart';
import 'package:hse_pos/app/repos/promotion_repository/promotion_repository.dart';

class PromotionService {
  final PromotionRepository _promotionRepository = PromotionRepository(
    locator<TestDatabase>(),
  );
  // Cache active promotions for performance
  static List<PromotionModel>? _cachedPromotions;
  static DateTime? _cacheTime;
  static const _cacheDuration = Duration(minutes: 5);

  // Get all active promotions (with caching)
  Future<List<PromotionModel>> getActivePromotions({
    bool forceRefresh = false,
  }) async {
    if (!forceRefresh &&
        _cachedPromotions != null &&
        _cacheTime != null &&
        DateTime.now().difference(_cacheTime!) < _cacheDuration) {
      return _cachedPromotions!;
    }

    _cachedPromotions = await _promotionRepository.getActive();
    _cacheTime = DateTime.now();
    return _cachedPromotions!;
  }

  static void clearCache() {
    _cachedPromotions = null;
    _cacheTime = null;
  }

  /// Check promotions when product is added to basket
  /// Returns list of applicable/potential promotions
  Future<List<PromotionCheckResult>> checkProductPromotions({
    required String productId,
    required List<Map<String, dynamic>> currentBasket,
  }) async {
    final results = <PromotionCheckResult>[];

    try {
      // Get promotions for this product
      final promotions = await _promotionRepository.getForProduct(productId);
      if (promotions.isEmpty) return results;

      print(promotions.first.name);

      // Find current qty in basket
      final basketItem = currentBasket.firstWhere(
        (item) => item['uuid'] == productId,
        orElse: () => {},
      );

      print(basketItem['qty']);
      final currentQty = (double.tryParse(basketItem['qty'].toString()) ?? 0)
          .toInt();

      print(currentQty);

      for (final promo in promotions) {
        if (!promo.isValid) continue;

        final isEligible = currentQty >= promo.minQuantity;
        final canBeEligible = currentQty < promo.minQuantity;

        if (isEligible || canBeEligible) {
          results.add(
            PromotionCheckResult(
              isEligible: isEligible,
              canBeEligible: canBeEligible,
              promotion: promo,
              currentQty: currentQty,
              requiredQty: promo.minQuantity,
              suggestionMessage: _buildSuggestionMessage(promo, currentQty),
            ),
          );
        }
      }

      // Sort by priority
      results.sort(
        (a, b) => b.promotion.priority.compareTo(a.promotion.priority),
      );
    } catch (e) {
      print('Error checking promotions: $e');
    }

    return results;
  }

  /// Build user-friendly suggestion message
  static String _buildSuggestionMessage(PromotionModel promo, int currentQty) {
    final needed = promo.minQuantity - currentQty;
    if (needed <= 0) {
      return '🎉 ${promo.benefitText} applied!';
    }

    final itemText = needed == 1 ? '1 more item' : '$needed more items';

    switch (promo.type) {
      case PromotionType.percentDiscount:
        return 'Add $itemText to get ${promo.discountPercent?.toStringAsFixed(0)}% OFF!';
      case PromotionType.flatDiscount:
        return 'Add $itemText to get Rs.${promo.discountAmount?.toStringAsFixed(0)} OFF!';
      case PromotionType.freeItem:
        return 'Add $itemText to get ${promo.freeProductQty ?? 1} item FREE!';
      case PromotionType.buyOneGetOne:
        return 'Add $itemText to get 1 FREE!';
      case PromotionType.buyXGetYPercent:
        return 'Add $itemText to get ${promo.discountPercent?.toStringAsFixed(0)}% OFF on all!';
      case PromotionType.buyXGetYPercentOnZ:
        return 'Add $itemText to get ${promo.discountPercent?.toStringAsFixed(0)}% OFF on ${promo.discountOnItems ?? 1} item!';
      case PromotionType.bundleDeal:
        return 'Add $itemText for Bundle Deal!';
    }
  }

  /// Apply promotion to basket and calculate discount
  static Future<AppliedPromotion?> applyPromotion({
    required PromotionModel promotion,
    required List<Map<String, dynamic>> basket,
    required String triggerProductId,
  }) async {
    try {
      // Find the product in basket
      final item = basket.firstWhere(
        (i) => i['uuid'] == triggerProductId,
        orElse: () => throw Exception('Product not in basket'),
      );

      if (item['qty'] < promotion.minQuantity) {
        return null; // Not eligible
      }

      double discountAmount = 0;
      List<FreeItemResult>? freeItems;
      String message = '';

      switch (promotion.type) {
        case PromotionType.percentDiscount:
          discountAmount =
              (item['selling_price'] * item['qty']) *
              (promotion.discountPercent! / 100);
          message =
              '${promotion.discountPercent?.toStringAsFixed(0)}% OFF applied!';
          break;

        case PromotionType.flatDiscount:
          discountAmount = promotion.discountAmount!;
          message = 'Rs.${promotion.discountAmount?.toStringAsFixed(0)} OFF!';
          break;

        case PromotionType.freeItem:
          freeItems = [
            FreeItemResult(
              productId: promotion.freeProductId ?? triggerProductId,
              quantity: promotion.freeProductQty ?? 1,
            ),
          ];
          message = '${promotion.freeProductQty ?? 1} FREE item added!';
          break;

        case PromotionType.buyOneGetOne:
          // Buy 1 get 1 - free items equal to purchased qty
          final freeQty = item['qty'];
          freeItems = [
            FreeItemResult(productId: triggerProductId, quantity: freeQty),
          ];
          message = '$freeQty FREE items added!';
          break;

        case PromotionType.buyXGetYPercent:
          discountAmount =
              (item['selling_price'] * item['qty']) *
              (promotion.discountPercent! / 100);
          message =
              '${promotion.discountPercent?.toStringAsFixed(0)}% OFF on all!';
          break;

        case PromotionType.buyXGetYPercentOnZ:
          // Apply discount only on X items
          final discountQty = promotion.discountOnItems ?? 1;
          discountAmount =
              (item['selling_price'] * discountQty) *
              (promotion.discountPercent! / 100);
          message =
              '${promotion.discountPercent?.toStringAsFixed(0)}% OFF on $discountQty item(s)!';
          break;

        case PromotionType.bundleDeal:
          discountAmount = promotion.discountAmount ?? 0;
          message = 'Bundle Deal applied!';
          break;
      }

      return AppliedPromotion(
        promotion: promotion,
        discountAmount: discountAmount,
        freeItems: freeItems,
        message: message,
      );
    } catch (e) {
      print('Error applying promotion: $e');
      return null;
    }
  }

  /// Get best promotion for a product (highest benefit)
  Future<PromotionCheckResult?> getBestPromotion({
    required String productId,
    required List<Map<String, dynamic>> basket,
  }) async {
    final results = await checkProductPromotions(
      productId: productId,
      currentBasket: basket,
    );

    print(results);

    if (results.isEmpty) return null;

    // First check eligible ones
    final eligible = results.where((r) => r.isEligible).toList();
    if (eligible.isNotEmpty) return eligible.first;

    // Then potential ones (sorted by qty needed)
    final potential = results.where((r) => r.canBeEligible).toList();
    potential.sort((a, b) => a.qtyNeeded.compareTo(b.qtyNeeded));
    return potential.isNotEmpty ? potential.first : null;
  }

  /// Calculate total discount for entire basket
  static Future<double> calculateBasketDiscount({
    required List<Map<String, dynamic>> basket,
    required List<AppliedPromotion> appliedPromotions,
  }) async {
    double total = 0;
    for (final applied in appliedPromotions) {
      total += applied.discountAmount;
    }
    return total;
  }

  // CRUD operations wrapper
  Future<bool> createPromotion(PromotionModel promotion) async {
    clearCache();
    return await _promotionRepository.insert(promotion);
  }

  Future<bool> updatePromotion(PromotionModel promotion) async {
    clearCache();
    return await _promotionRepository.updatePromotion(promotion);
  }

  Future<bool> deletePromotion(String id) async {
    clearCache();
    return await _promotionRepository.deletePromotion(id);
  }

  Future<List<PromotionModel>> getAllPromotions() async {
    return await _promotionRepository.getAll();
  }

  Future<PromotionModel?> getPromotionById(String id) async {
    return await _promotionRepository.getById(id);
  }
}
