// ignore_for_file: depend_on_referenced_packages, avoid_print, constant_identifier_names

import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';

import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/others/supabase_result_model.dart';
import 'package:hse_pos/app/models/others/sync_progress.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logging/logging.dart';

class UnitsService {
  // Constants
  static const String _TABLE = 'units';
  static const int _DEFAULT_BATCH_SIZE = 1000;
  static const Duration _CONNECTION_TIMEOUT = Duration(seconds: 30);

  // Services and clients
  final SupabaseClient _supabase = Supabase.instance.client;
  final Logger _logger = Logger('UnitsService');
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

  /// Insert a new Unit
  Future<SupabaseResult> insertUnit(Map<String, dynamic> unitsData) async {
    return _executeQuery(() async {
      return await _supabase.from(_TABLE).insert(unitsData).select().single();
    });
  }

  /// Update an existing Unit
  Future<SupabaseResult> updateUnits(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'units UUID cannot be empty',
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

  /// Delete a units by UUID
  Future<SupabaseResult> deleteunits(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'units UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      await _supabase.from(_TABLE).delete().eq('uuid', uuid);
      return 'units deleted successfully';
    });
  }

  /// Get a units by UUID
  Future<SupabaseResult> getUnitssByUUID(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'units UUID cannot be empty',
      );
    }

    return _executeQuery(() async {
      return await _supabase.from(_TABLE).select().eq('uuid', uuid).single();
    });
  }

  /// Get Units  with pagination
  Future<SupabaseResult> getAllUnits({
    int limit = _DEFAULT_BATCH_SIZE,
    int offset = 0,
  }) async {
    return _executeQuery(() async {
      final query = _supabase
          .from(_TABLE)
          .select()
          .range(offset, offset + limit - 1);

      return await query;
    });
  }

  /// Get count of Units
  Future<int> _getUnitsCount() async {
    try {
      final countResult = await _supabase
          .from(_TABLE)
          .select()
          .limit(1)
          .count(CountOption.exact);

      return countResult.count;
    } catch (e) {
      _logger.warning('Failed to get Units count: $e');
      return 0;
    }
  }

  /// Main entry point for syncing Units
  Stream<SyncProgress> syncAllunitsFromSupabase() async* {
    yield* syncunitsInIsolate();
  }

  /// Sync Units in the background with proper error handling
  Stream<SyncProgress> syncunitsInIsolate() async* {
    const int batchSize = _DEFAULT_BATCH_SIZE;
    int offset = 0;
    bool hasMore = true;
    int progress = 0;
    int totalCount = 0;
    final List<String> errors = [];

    try {
      // First, get total count to provide accurate progress reporting
      totalCount = await _getUnitsCount();

      // If no Units exist, return early with success
      if (totalCount == 0) {
        yield SyncProgress(0, 0, []);
        return;
      }

      // Initial progress report with correct total
      yield SyncProgress(progress, totalCount, errors);

      // Fetch and process data in batches
      while (hasMore) {
        final dynamicList = await getAllUnits(limit: batchSize, offset: offset);

        if (dynamicList.success && dynamicList.data != null) {
          final dataList = dynamicList.data as List;
          final List<Unit> unitsToSave = [];

          // Process each Unit in the batch
          for (var json in dataList) {
            try {
              // Create table data object
              final units = Unit.fromJson(json);

              // Add to batch insert list
              unitsToSave.add(units);
            } catch (e) {
              errors.add(
                'Error parsing Units: ${json['name'] ?? 'Unknown'}, reason: $e',
              );
            }
          }

          // Batch save Units for better performance
          if (unitsToSave.isNotEmpty) {
            try {
              await database.unitsRepository.createOrUpdateAll(unitsToSave);
              progress += unitsToSave.length;
            } catch (e) {
              errors.add('Error bulk saving Units: $e');
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
