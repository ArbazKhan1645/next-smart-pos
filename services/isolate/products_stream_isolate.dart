// product_stream_service_v2.dart
// Production-grade service for 50k-100k+ products
// Uses compute() isolate for heavy processing, indexed maps for O(1) filtering

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/models/products_model/products_model.dart';

/// Indexed product data structure for fast lookups
class IndexedProductData {
  final List<ProductModel> products;
  final Map<String, ProductModel> byUuid;
  final Map<String, List<ProductModel>> byCategory;
  final Map<String, ProductModel> byBarcode;

  const IndexedProductData({
    required this.products,
    required this.byUuid,
    required this.byCategory,
    required this.byBarcode,
  });

  factory IndexedProductData.empty() => const IndexedProductData(
    products: [],
    byUuid: {},
    byCategory: {},
    byBarcode: {},
  );
}

/// Message for isolate processing
class _ProcessMessage {
  final List<Map<String, dynamic>> productsJson;
  final Set<String> existingUuids;

  const _ProcessMessage(this.productsJson, this.existingUuids);
}

/// Result from isolate processing
class _ProcessResult {
  final List<ProductModel> products;
  final Map<String, ProductModel> byUuid;
  final Map<String, List<ProductModel>> byCategory;
  final Map<String, ProductModel> byBarcode;
  final Map<String, ProductModel> bySku;
  final int addedCount;
  final int updatedCount;

  const _ProcessResult({
    required this.products,
    required this.byUuid,
    required this.byCategory,
    required this.byBarcode,
    required this.bySku,
    required this.addedCount,
    required this.updatedCount,
  });
}

class ProductStreamService extends GetxService {
  static ProductStreamService get to => Get.find();

  // ============================================
  // STATE
  // ============================================

  // Main indexed data
  IndexedProductData _indexedData = IndexedProductData.empty();

  // Observable for GetX reactivity (UI binds to this)
  final RxList<ProductModel> _products = <ProductModel>[].obs;

  // Status indicators
  final Rx<Exception?> _error = Rx<Exception?>(null);
  final RxBool _isLoading = false.obs;
  final RxBool _isProcessing = false.obs;
  final RxInt _productCount = 0.obs;

  // Stream management
  StreamSubscription<List<ProductModel>>? _streamSubscription;
  bool _isInitialized = false;

  // Debouncing
  Timer? _debounceTimer;
  List<ProductModel>? _pendingProducts;
  static const _debounceDelay = Duration(milliseconds: 200);

  // Processing queue
  bool _isComputeRunning = false;
  List<ProductModel>? _queuedProducts;

  // ============================================
  // PUBLIC GETTERS
  // ============================================

  List<ProductModel> get products => _indexedData.products;
  RxList<ProductModel> get observableProducts => _products;
  Exception? get error => _error.value;
  bool get isLoading => _isLoading.value;
  bool get isProcessing => _isProcessing.value;
  bool get isReady => _isInitialized && !_isProcessing.value;
  int get productCount => _productCount.value;

  // ============================================
  // INITIALIZATION
  // ============================================

  Future<ProductStreamService> init() async {
    _isInitialized = false;
    _error.value = null;
    return this;
  }

  Future<void> oninitialize(Stream<List<ProductModel>> stream) async {
    await cleanupResources();

    try {
      debugPrint('[ProductStream] Initializing for large dataset...');
      _isLoading.value = true;

      _streamSubscription = stream.listen(
        _onProductsReceived,
        onError: _onStreamError,
        onDone: _onStreamDone,
        cancelOnError: false,
      );

      _isInitialized = true;
    } catch (e) {
      debugPrint('[ProductStream] Init failed: $e');
      _error.value = Exception('Failed to initialize: $e');
      _isInitialized = false;
      rethrow;
    }
  }

  // ============================================
  // STREAM HANDLING
  // ============================================

  void _onProductsReceived(List<ProductModel> newProducts) {
    _pendingProducts = newProducts;

    _debounceTimer?.cancel();
    _debounceTimer = Timer(_debounceDelay, () {
      if (_pendingProducts != null) {
        _scheduleProcessing(_pendingProducts!);
        _pendingProducts = null;
      }
    });
  }

  void _scheduleProcessing(List<ProductModel> products) {
    if (_isComputeRunning) {
      _queuedProducts = products;
      debugPrint('[ProductStream] Queued ${products.length} products');
      return;
    }
    _processInBackground(products);
  }

  // ============================================
  // BACKGROUND PROCESSING
  // ============================================

  Future<void> _processInBackground(List<ProductModel> newProducts) async {
    if (_isComputeRunning) return;

    _isComputeRunning = true;
    _isProcessing.value = true;

    final stopwatch = Stopwatch()..start();

    try {
      debugPrint(
        '[ProductStream] Processing ${newProducts.length} products...',
      );

      // Convert to JSON for isolate (ProductModel must be serializable)
      // If your model has toJson, use it. Otherwise pass directly.
      final productsJson = newProducts.map((p) => p.toJson()).toList();
      final existingUuids = _indexedData.byUuid.keys.toSet();

      // Process in isolate
      final result = await compute(
        _processProductsIsolate,
        _ProcessMessage(productsJson, existingUuids),
      );

      // Update state
      _indexedData = IndexedProductData(
        products: result.products,
        byUuid: result.byUuid,
        byCategory: result.byCategory,
        byBarcode: result.byBarcode,
      );

      _productCount.value = result.products.length;

      // Update observable (single assignment, not individual updates)
      _products.assignAll(result.products);

      stopwatch.stop();
      debugPrint(
        '[ProductStream] ✓ ${result.products.length} products in ${stopwatch.elapsedMilliseconds}ms '
        '(+${result.addedCount} new, ~${result.updatedCount} updated)',
      );

      _isLoading.value = false;
      _error.value = null;
    } catch (e, stack) {
      debugPrint('[ProductStream] Processing error: $e');
      debugPrint('$stack');
      _error.value = Exception('Processing error: $e');
    } finally {
      _isComputeRunning = false;
      _isProcessing.value = false;

      // Process queued
      if (_queuedProducts != null) {
        final queued = _queuedProducts!;
        _queuedProducts = null;
        Future.microtask(() => _scheduleProcessing(queued));
      }
    }
  }

  /// Runs in isolate - heavy lifting here
  static _ProcessResult _processProductsIsolate(_ProcessMessage message) {
    final existingUuids = message.existingUuids;
    int addedCount = 0;
    int updatedCount = 0;

    // Build all indexes in one pass
    final products = <ProductModel>[];
    final byUuid = <String, ProductModel>{};
    final byCategory = <String, List<ProductModel>>{};
    final byBarcode = <String, ProductModel>{};
    final bySku = <String, ProductModel>{};

    for (final json in message.productsJson) {
      try {
        final product = ProductModel.fromJson(json);
        final uuid = product.uuid ?? product.id.toString();

        // Track changes
        if (existingUuids.contains(uuid)) {
          updatedCount++;
        } else {
          addedCount++;
        }

        products.add(product);
        byUuid[uuid] = product;

        // Category index
        final categoryId = product.category_uuid;
        if (categoryId != null && categoryId.isNotEmpty) {
          byCategory.putIfAbsent(categoryId, () => []).add(product);
        }

        // Barcode index
        final barcode = product.barcode;
        if (barcode != null && barcode.isNotEmpty) {
          byBarcode[barcode] = product;
        }
      } catch (e) {
        // Skip invalid products
        debugPrint('Skip invalid product: $e');
      }
    }

    return _ProcessResult(
      products: products,
      byUuid: byUuid,
      byCategory: byCategory,
      byBarcode: byBarcode,
      bySku: bySku,
      addedCount: addedCount,
      updatedCount: updatedCount,
    );
  }

  // ============================================
  // FAST O(1) LOOKUPS
  // ============================================

  /// Get products by category - O(1)
  List<ProductModel> getProductsByCategory(String categoryId) {
    if (categoryId.isEmpty) return const [];
    return _indexedData.byCategory[categoryId] ?? const [];
  }

  /// Get product by UUID - O(1)
  ProductModel? getProductByUuid(String uuid) {
    return _indexedData.byUuid[uuid];
  }

  /// Get product by barcode - O(1)
  ProductModel? getProductByBarcode(String barcode) {
    return _indexedData.byBarcode[barcode];
  }

  /// Get all categories that have products
  List<String> get categoryIds => _indexedData.byCategory.keys.toList();

  /// Product count for category - O(1)
  int getProductCountForCategory(String categoryId) {
    return _indexedData.byCategory[categoryId]?.length ?? 0;
  }

  // ============================================
  // SEARCH
  // ============================================

  /// Sync search - good for <10k filtered results
  List<ProductModel> searchProducts(
    String query, {
    String? categoryId,
    int limit = 100,
  }) {
    if (query.isEmpty && categoryId == null) {
      return _indexedData.products.take(limit).toList();
    }

    final lowerQuery = query.toLowerCase();

    // Use category index if provided
    final source = (categoryId != null && categoryId.isNotEmpty)
        ? (_indexedData.byCategory[categoryId] ?? <ProductModel>[])
        : _indexedData.products;

    if (query.isEmpty) {
      return source.take(limit).toList();
    }

    final results = <ProductModel>[];
    for (final product in source) {
      if (results.length >= limit) break;

      if ((product.name.toLowerCase().contains(lowerQuery)) ||
          (product.barcode?.contains(query) ?? false)) {
        results.add(product);
      }
    }

    return results;
  }

  /// Async search for very large searches
  Future<List<ProductModel>> searchProductsAsync(
    String query, {
    int limit = 100,
  }) async {
    if (query.isEmpty) {
      return _indexedData.products.take(limit).toList();
    }

    return compute(
      _searchIsolate,
      _SearchMessage(
        productsJson: _indexedData.products.map((p) => p.toJson()).toList(),
        query: query,
        limit: limit,
      ),
    );
  }

  static List<ProductModel> _searchIsolate(_SearchMessage msg) {
    final lowerQuery = msg.query.toLowerCase();
    final results = <ProductModel>[];

    for (final json in msg.productsJson) {
      if (results.length >= msg.limit) break;

      final product = ProductModel.fromJson(json);
      if ((product.name.toLowerCase().contains(lowerQuery)) ||
          (product.barcode?.contains(msg.query) ?? false)) {
        results.add(product);
      }
    }

    return results;
  }

  // ============================================
  // PAGINATION
  // ============================================

  List<ProductModel> getProductsPaginated({
    required String categoryId,
    required int page,
    required int pageSize,
  }) {
    final all = getProductsByCategory(categoryId);
    final start = page * pageSize;
    if (start >= all.length) return const [];
    final end = (start + pageSize).clamp(0, all.length);
    return all.sublist(start, end);
  }

  int getTotalPages(String categoryId, int pageSize) {
    return (getProductCountForCategory(categoryId) / pageSize).ceil();
  }

  // ============================================
  // REALTIME SINGLE UPDATES
  // ============================================

  void upsertProduct(ProductModel product) {
    final uuid = product.uuid ?? product.id.toString();
    final oldProduct = _indexedData.byUuid[uuid];

    // Update indexes
    final newByUuid = Map<String, ProductModel>.from(_indexedData.byUuid);
    newByUuid[uuid] = product;

    final newByCategory = Map<String, List<ProductModel>>.from(
      _indexedData.byCategory.map(
        (k, v) => MapEntry(k, List<ProductModel>.from(v)),
      ),
    );

    // Handle category change
    if (oldProduct != null &&
        oldProduct.category_uuid != product.category_uuid) {
      final oldCat = oldProduct.category_uuid ?? '';
      if (newByCategory.containsKey(oldCat)) {
        newByCategory[oldCat]!.removeWhere((p) => p.uuid == uuid);
      }
    }

    final newCat = product.category_uuid ?? '';
    if (newCat.isNotEmpty) {
      newByCategory.putIfAbsent(newCat, () => []);
      final idx = newByCategory[newCat]!.indexWhere((p) => p.uuid == uuid);
      if (idx >= 0) {
        newByCategory[newCat]![idx] = product;
      } else {
        newByCategory[newCat]!.add(product);
      }
    }

    final newByBarcode = Map<String, ProductModel>.from(_indexedData.byBarcode);
    if (product.barcode?.isNotEmpty ?? false) {
      newByBarcode[product.barcode!] = product;
    }

    final newProducts = List<ProductModel>.from(_indexedData.products);
    final idx = newProducts.indexWhere((p) => p.uuid == uuid);
    if (idx >= 0) {
      newProducts[idx] = product;
    } else {
      newProducts.add(product);
    }

    _indexedData = IndexedProductData(
      products: newProducts,
      byUuid: newByUuid,
      byCategory: newByCategory,
      byBarcode: newByBarcode,
    );

    _productCount.value = newProducts.length;

    // Update observable
    if (idx >= 0) {
      _products[idx] = product;
    } else {
      _products.add(product);
    }
  }

  void removeProduct(String uuid) {
    final product = _indexedData.byUuid[uuid];
    if (product == null) return;

    final newByUuid = Map<String, ProductModel>.from(_indexedData.byUuid)
      ..remove(uuid);

    final newByCategory = Map<String, List<ProductModel>>.from(
      _indexedData.byCategory.map(
        (k, v) => MapEntry(k, List<ProductModel>.from(v)),
      ),
    );
    final cat = product.category_uuid ?? '';
    if (newByCategory.containsKey(cat)) {
      newByCategory[cat]!.removeWhere((p) => p.uuid == uuid);
    }

    final newByBarcode = Map<String, ProductModel>.from(_indexedData.byBarcode);
    if (product.barcode != null) newByBarcode.remove(product.barcode);

    final newProducts = _indexedData.products
        .where((p) => p.uuid != uuid)
        .toList();

    _indexedData = IndexedProductData(
      products: newProducts,
      byUuid: newByUuid,
      byCategory: newByCategory,
      byBarcode: newByBarcode,
    );

    _productCount.value = newProducts.length;
    _products.removeWhere((p) => p.uuid == uuid);
  }

  // ============================================
  // CLEANUP
  // ============================================

  void _onStreamError(Object error, StackTrace stack) {
    debugPrint('[ProductStream] Error: $error');
    _error.value = Exception('$error');
    _isLoading.value = false;
  }

  void _onStreamDone() {
    debugPrint('[ProductStream] Stream done');
    _isLoading.value = false;
  }

  Future<void> cleanupResources() async {
    _debounceTimer?.cancel();
    _pendingProducts = null;
    _queuedProducts = null;

    await _streamSubscription?.cancel();
    _streamSubscription = null;

    _isInitialized = false;
    _isLoading.value = false;
    _isProcessing.value = false;
  }

  Future<void> onDispoSeCall() async {
    await cleanupResources();
  }

  Future<void> fullReset() async {
    await cleanupResources();
    _indexedData = IndexedProductData.empty();
    _products.clear();
    _productCount.value = 0;
  }

  @override
  void onClose() {
    cleanupResources();
    super.onClose();
  }
}

class _SearchMessage {
  final List<Map<String, dynamic>> productsJson;
  final String query;
  final int limit;
  const _SearchMessage({
    required this.productsJson,
    required this.query,
    required this.limit,
  });
}
