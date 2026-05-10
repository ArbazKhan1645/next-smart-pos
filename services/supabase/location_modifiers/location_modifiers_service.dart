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

class LocationModifiersService {
  // Constants
  static const String _TABLE = 'location_modifiers';
  static const int _DEFAULT_BATCH_SIZE = 1000;
  static const Duration _CONNECTION_TIMEOUT = Duration(seconds: 30);

  // Services and clients
  final SupabaseClient _supabase = Supabase.instance.client;
  final Logger _logger = Logger('LocationModifiersService');
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

  /// Insert a new Location Modifier
  Future<SupabaseResult> insertLocationModifier(
    Map<String, dynamic> locationModifierData,
  ) async {
    return _executeQuery(() async {
      return await _supabase
          .from(_TABLE)
          .insert(locationModifierData)
          .select()
          .single();
    });
  }

  /// Update an existing Location Modifier
  Future<SupabaseResult> updateLocationModifier(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Location Modifier UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      return await _supabase
          .from(_TABLE)
          .update(updateData)
          .eq('uuid', uuid)
          .select()
          .single();
    });
  }

  /// Delete a Location Modifier by UUID
  Future<SupabaseResult> deleteLocationModifier(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Location Modifier UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      await _supabase.from(_TABLE).delete().eq('uuid', uuid);
      return 'Location Modifier deleted successfully';
    });
  }

  /// Get a Location Modifier by UUID
  Future<SupabaseResult> getLocationModifiersByUUID(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Location Modifier UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      return await _supabase.from(_TABLE).select().eq('uuid', uuid).single();
    });
  }

  /// Get Location Modifier  with pagination
  Future<SupabaseResult> getAllLocationModifier({
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

  /// Get count of Location Modifier
  Future<int> _getLocationModifierCount(int locationId) async {
    try {
      final countResult = await _supabase
          .from(_TABLE)
          .select()
          .eq('location_id', locationId.toString())
          .limit(1)
          .count(CountOption.exact);

      return countResult.count;
    } catch (e) {
      _logger.warning('Failed to get Location Modifier count: $e');
      return 0;
    }
  }

  /// Main entry point for syncing Location Modifier

  /// Sync LocationModifier in the background with proper error handling
  Stream<SyncProgress> syncLocationModifierInIsolate() async* {
    const int batchSize = _DEFAULT_BATCH_SIZE;
    int offset = 0;
    bool hasMore = true;
    int progress = 0;
    int totalCount = 0;
    final List<String> errors = [];

    try {
      final locationId = getLocationId();

      if (locationId == null) {
        yield SyncProgress(0, 0, [
          'No Location Found - Please Login Merchant Again',
        ]);
        return;
      }
      // First, get total count to provide accurate progress reporting
      totalCount = await _getLocationModifierCount(locationId);

      // If no LocationModifier exist, return early with success
      if (totalCount == 0) {
        yield SyncProgress(0, 0, []);
        return;
      }

      // Initial progress report with correct total
      yield SyncProgress(progress, totalCount, errors);

      // Fetch and process data in batches
      while (hasMore) {
        final dynamicList = await getAllLocationModifier(
          limit: batchSize,
          offset: offset,
          locationId: locationId,
        );

        if (dynamicList.success && dynamicList.data != null) {
          final dataList = dynamicList.data as List;
          final List<LocationModifiers> locationModifierModelToSave = [];

          // Process each Location Modifier in the batch
          for (var json in dataList) {
            try {
              // Create table data object
              final locationModifierModel = LocationModifiers.fromJson(json);

              // Add to batch insert list
              locationModifierModelToSave.add(locationModifierModel);
            } catch (e) {
              errors.add(
                'Error parsing Location Modifier: ${json['name'] ?? 'Unknown'}, reason: $e',
              );
            }
          }

          // Batch save Location Modifier for better performance
          if (locationModifierModelToSave.isNotEmpty) {
            try {
              await database.locationModifiersRepository.createOrUpdateAll(
                locationModifierModelToSave,
              );
              progress += locationModifierModelToSave.length;
            } catch (e) {
              errors.add('Error bulk saving Location Modifier: $e');
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
