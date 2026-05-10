// ignore_for_file: depend_on_referenced_packages, avoid_print, constant_identifier_names

import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/core/utils/helpers/current_location.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/others/supabase_result_model.dart';
import 'package:hse_pos/app/models/others/sync_progress.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logging/logging.dart';

class CategoriesService {
  // Constants
  static const String _TABLE = 'location_categories';
  static const int _DEFAULT_BATCH_SIZE = 1000;
  static const Duration _CONNECTION_TIMEOUT = Duration(seconds: 30);

  // Services and clients
  final SupabaseClient _supabase = Supabase.instance.client;
  final Logger _logger = Logger('CategoriesService');
  final Connectivity _connectivity = Connectivity();

  // Cache for connectivity status to reduce redundant checks
  DateTime? _lastConnectivityCheck;
  bool? _lastConnectivityStatus;
  static const Duration _connectivityCacheDuration = Duration(seconds: 5);

  /// Checks if internet connection is available with caching for performance
  Future<bool> _isInternetAvailable() async {
    // Use cached result if available and recent
    final now = DateTime.now();
    if (_lastConnectivityCheck != null &&
        _lastConnectivityStatus != null &&
        now.difference(_lastConnectivityCheck!) < _connectivityCacheDuration) {
      return _lastConnectivityStatus!;
    }

    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      final bool isConnected = connectivityResult.any(
        (result) =>
            result == ConnectivityResult.wifi ||
            result == ConnectivityResult.mobile ||
            result == ConnectivityResult.ethernet ||
            result == ConnectivityResult.vpn,
      );

      // Cache the result
      _lastConnectivityCheck = now;
      _lastConnectivityStatus = isConnected;

      return isConnected;
    } catch (e) {
      _logger.severe('Error checking internet connectivity: $e');
      // Don't cache errors to allow retries
      return false;
    }
  }

  /// Executes a Supabase query with timeout and error handling
  Future<SupabaseResult> _executeQuery(Future<dynamic> Function() query) async {
    if (!await _isInternetAvailable()) {
      return SupabaseResult(
        success: false,
        error: 'No internet connection',
        data: [],
      );
    }

    try {
      final response = await query().timeout(
        _CONNECTION_TIMEOUT,
        onTimeout: () {
          throw TimeoutException(
            'Database operation timed out after $_CONNECTION_TIMEOUT',
          );
        },
      );
      return SupabaseResult(success: true, data: response);
    } on PostgrestException catch (e) {
      _logger.severe('Supabase PostgrestException: ${e.code} - ${e.message}');
      return SupabaseResult(
        success: false,
        error: 'Database error: ${e.message}',
      );
    } on TimeoutException catch (e) {
      _logger.severe('Query timeout: $e');
      return SupabaseResult(
        success: false,
        error: 'Operation timed out. Please try again.',
      );
    } catch (e) {
      _logger.severe('Error executing query: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Insert a new category
  Future<SupabaseResult> insertCategory(
    Map<String, dynamic> categoryData,
  ) async {
    return _executeQuery(() async {
      print(categoryData);

      _validateCategoryData(categoryData);

      final uuid = categoryData['uuid'];

      // --- Check if category with same UUID already exists ---
      if (uuid != null) {
        final existing = await _supabase
            .from(_TABLE)
            .select()
            .eq('uuid', uuid)
            .maybeSingle();

        if (existing != null) {
          // RETURN PLAIN DATA → executeQuery will wrap into SupabaseResult
          return {
            'message': 'Category already exists',
            'category': existing,
            'skipped': true,
          };
        }
      }

      // --- Insert new category ---
      final inserted = await _supabase
          .from(_TABLE)
          .insert(categoryData)
          .select()
          .single();

      return {
        'message': 'Category inserted',
        'category': inserted,
        'skipped': false,
      };
    });
  }

  /// Update an existing category
  Future<SupabaseResult> updateCategory(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Category UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      _validateCategoryData(updateData);
      return await _supabase
          .from(_TABLE)
          .update(updateData)
          .eq('uuid', uuid)
          .select()
          .single();
    });
  }

  /// Delete a category by UUID
  Future<SupabaseResult> deleteCategory(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Category UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      await _supabase.from(_TABLE).delete().eq('uuid', uuid);
      return 'Category deleted successfully';
    });
  }

  /// Get a category by UUID
  Future<SupabaseResult> getCategoryByUUID(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Category UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      return await _supabase.from(_TABLE).select().eq('uuid', uuid).single();
    });
  }

  /// Get all categories
  Future<SupabaseResult> getAllCategories() async {
    return _executeQuery(() async {
      return await _supabase.from(_TABLE).select();
    });
  }

  /// Get categories by location
  Future<SupabaseResult> getCategoriesByLocation(String location) async {
    if (location.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Location ID cannot be empty',
      );
    }

    return _executeQuery(() async {
      return await _supabase.from(_TABLE).select().eq('location_id', location);
    });
  }

  /// Get categories of a location with pagination
  Future<SupabaseResult> getAllCategoriesOfLocation({
    int limit = _DEFAULT_BATCH_SIZE,
    int offset = 0,
    int? locationId,
  }) async {
    if (locationId == null) {
      return SupabaseResult(success: false, error: 'Location ID is required');
    }

    return _executeQuery(() async {
      final query = _supabase
          .from(_TABLE)
          .select()
          .eq('location_id', locationId.toString())
          .range(offset, offset + limit - 1);

      return await query;
    });
  }

  /// Get count of categories for a location
  Future<int> _getCategoryCount(int locationId) async {
    try {
      final countResult = await _supabase
          .from(_TABLE)
          .select()
          .eq('location_id', locationId)
          .limit(1)
          .count(CountOption.exact);

      return countResult.count;
    } catch (e) {
      _logger.warning('Failed to get category count: $e');
      return 0;
    }
  }

  /// Validate category data before operations
  void _validateCategoryData(Map<String, dynamic> data) {
    if (data['name'] != null && (data['name'] as String).isEmpty) {
      throw const FormatException('Category name cannot be empty');
    }
  }

  /// Main entry point for syncing categories
  Stream<SyncProgress> syncAllCategoriesFromSupabase() async* {
    yield* syncCategoriesInIsolate();
  }

  /// Sync categories in the background with proper error handling
  Stream<SyncProgress> syncCategoriesInIsolate() async* {
    const int batchSize = _DEFAULT_BATCH_SIZE;
    int offset = 0;
    bool hasMore = true;
    int progress = 0;
    int totalCount = 0;
    final List<String> errors = [];

    try {
      // Get current location ID

      final locationId = getLocationId();

      if (locationId == null) {
        yield SyncProgress(0, 0, [
          'No Location Found - Please Login Merchant Again',
        ]);
        return;
      }

      // First, get total count to provide accurate progress reporting
      totalCount = await _getCategoryCount(locationId);

      // If no categories exist, return early with success
      if (totalCount == 0) {
        yield SyncProgress(0, 0, []);
        return;
      }

      // Initial progress report with correct total
      yield SyncProgress(progress, totalCount, errors);

      // Fetch and process data in batches
      while (hasMore) {
        final dynamicList = await getAllCategoriesOfLocation(
          limit: batchSize,
          offset: offset,
          locationId: locationId,
        );

        if (dynamicList.success && dynamicList.data != null) {
          final dataList = dynamicList.data as List;
          final List<CategoriesTableData> categoriesToSave = [];

          // Process each category in the batch
          for (var json in dataList) {
            try {
              // Remove unnecessary fields
              if (json.containsKey('name_embedding')) {
                json.remove('name_embedding');
              }

              // Create table data object
              final map = {
                'uuid': json['uuid'] ?? '',
                'name': json['name'] ?? '',
                'location_id': json['location_id'] ?? '',
                'button_height': json['button_height'] ?? 130,
                'button_width': json['button_width'] ?? 130,
                'font_size': json['font_size'] ?? 16,
                'id': json['id'] ?? 0,
                'created_at':
                    json['created_at'] ?? DateTime.now().toIso8601String(),
                'version': json['version'] ?? 0,
                'text_color': json['text_color'] ?? '',
                'background_color': json['background_color'] ?? '',
                'index': json['index'] ?? 0,
                'printers': json['printers'] ?? [],
              };

              if (json['parent_uuid'] != null) {
                map['parent_uuid'] = json['parent_uuid'];
              }

              final category = CategoriesTableData.fromJson(map);

              // Add to batch insert list
              categoriesToSave.add(category);
            } catch (e) {
              errors.add(
                'Error parsing category: ${json['name'] ?? 'Unknown'}, reason: $e',
              );
            }
          }

          // Batch save categories for better performance
          if (categoriesToSave.isNotEmpty) {
            try {
              await database.categoriesRepository.createOrUpdateAll(
                categoriesToSave,
              );
              progress += categoriesToSave.length;
            } catch (e) {
              errors.add('Error bulk saving categories: $e');
            }
          }

          // Report progress after processing the batch
          yield SyncProgress(progress, totalCount, errors);

          // Check if there's more data to fetch
          hasMore = dataList.length == batchSize;
          offset += batchSize;
        } else {
          errors.add(
            'API response failed: ${dynamicList.error ?? "Unknown error"}',
          );
          hasMore = false;
        }
      }
    } on AuthException catch (e) {
      errors.add('Authentication error: ${e.message}');
    } catch (e) {
      errors.add('Unexpected error: $e');
    } finally {
      // Final progress report
      yield SyncProgress(
        progress,
        totalCount > 0 ? totalCount : progress,
        errors,
      );
    }
  }
}
