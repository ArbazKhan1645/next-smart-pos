// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:math';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/core/utils/helpers/current_location.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/others/supabase_result_model.dart';
import 'package:hse_pos/app/models/others/sync_progress.dart';
import 'package:hse_pos/app/services/app/app_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:logging/logging.dart';

class StaffsService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final String _table = 'staffs';
  final _appService = AppService.instance;
  final Logger _logger = Logger('StaffsService');
  // Cache connectivity status and last check time
  bool _lastConnectivityStatus = false;
  DateTime _lastConnectivityCheck = DateTime.now().subtract(
    const Duration(seconds: 30),
  );

  // Check internet with caching to reduce redundant checks
  Future<bool> _isInternetAvailable() async {
    // Only check connectivity if the last check was more than 5 seconds ago
    final now = DateTime.now();
    if (now.difference(_lastConnectivityCheck).inSeconds < 5) {
      return _lastConnectivityStatus;
    }

    try {
      final connectivityResult = await Connectivity().checkConnectivity();
      _lastConnectivityStatus = connectivityResult.any(
        (result) =>
            result == ConnectivityResult.wifi ||
            result == ConnectivityResult.mobile ||
            result == ConnectivityResult.ethernet ||
            result == ConnectivityResult.vpn,
      );
      _lastConnectivityCheck = now;
      return _lastConnectivityStatus;
    } catch (e) {
      _logger.severe('Error checking internet connectivity: $e');
      _lastConnectivityStatus = false;
      _lastConnectivityCheck = now;
      return false;
    }
  }

  Future<SupabaseResult> _executeQuery(Future<dynamic> Function() query) async {
    if (!await _isInternetAvailable()) {
      return SupabaseResult(
        success: false,
        error: 'No internet connection',
        data: [],
      );
    }
    try {
      final response = await query();
      return SupabaseResult(success: true, data: response);
    } on PostgrestException catch (e) {
      _logger.severe('Supabase error executing query: ${e.message}');
      return SupabaseResult(success: false, error: e.message);
    } on TimeoutException catch (e) {
      _logger.severe('Timeout error executing query: $e');
      return SupabaseResult(
        success: false,
        error: 'Operation timed out. Please try again.',
      );
    } catch (e) {
      _logger.severe('Error executing query: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  Future<SupabaseResult> insertStaffs(Map<String, dynamic> staffsData) async {
    return _executeQuery(() async {
      return await _supabase.from(_table).insert(staffsData).select().single();
    });
  }

  Future<SupabaseResult> updateStaffs(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    return _executeQuery(() async {
      return await _supabase
          .from(_table)
          .update(updateData)
          .eq('uuid', uuid)
          .select()
          .single();
    });
  }

  Future<SupabaseResult> deleteStaffs(String uuid) async {
    return _executeQuery(() async {
      await _supabase.from(_table).delete().eq('uuid', uuid);
      return 'staffs deleted successfully';
    });
  }

  Future<SupabaseResult> getStaffsByUUID(String uuid) async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select().eq('uuid', uuid).single();
    });
  }

  Future<SupabaseResult> getAllStaffs() async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select();
    });
  }

  Future<SupabaseResult> getStaffsByLocation(String location) async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select().eq('location_id', location);
    });
  }

  Stream<SyncProgress> syncAllStaffsFromSupabase() async* {
    yield* syncAllStaffsFromSupabases();
  }

  // Optimized staffs count method with timeout and error handling
  Future<int> getStaffsCount(int locationId) async {
    try {
      if (!await _isInternetAvailable()) {
        _logger.warning('No internet connection when getting staffs count');
        return 0;
      }

      final response = await _appService.supabaseClient
          .from(_table)
          .select()
          .eq('location_id', locationId)
          .limit(1)
          .count(CountOption.exact)
          .timeout(
            const Duration(seconds: 15),
          ); // Add timeout to prevent hanging

      return response.count;
    } on TimeoutException {
      _logger.severe('Timeout getting staffs count for location $locationId');
      return -1;
    } catch (e) {
      _logger.severe('Error getting staffs count: $e');
      return -1;
    }
  }

  // Optimized main function to sync staffs with enhanced error handling and connectivity checks
  Stream<SyncProgress> syncAllStaffsFromSupabases() async* {
    // Configure initial sync parameters
    const int initialBatchSize = 500;
    const int maxBatchSize = 1000;
    const int minBatchSize = 50;
    int batchSize = initialBatchSize;
    int offset = 0;
    int processedCount = 0;
    int totalCount = 0;
    final List<String> errors = [];
    bool isSyncCancelled = false;

    // Add connectivity listener
    StreamSubscription<List<ConnectivityResult>>? connectivitySubscription;

    try {
      // Setup connectivity listener to detect connection drops during sync
      connectivitySubscription = Connectivity().onConnectivityChanged.listen((
        results,
      ) {
        final bool hasInternet = results.any(
          (result) =>
              result == ConnectivityResult.wifi ||
              result == ConnectivityResult.mobile ||
              result == ConnectivityResult.ethernet ||
              result == ConnectivityResult.vpn,
        );

        if (!hasInternet) {
          isSyncCancelled = true;
          _logger.warning(
            'Internet connection lost during sync - marking for cancellation',
          );
        }
      });

      // Check for location ID
      final int? locationId = getLocationId();
      if (locationId == null) {
        yield SyncProgress(0, 0, [
          'No Location Found - Please Login Merchant Again',
        ]);
        return;
      }

      // Validate internet connection before starting
      if (!await _isInternetAvailable()) {
        yield SyncProgress(0, 0, [
          'No internet connection available. Please check your network and try again.',
        ]);
        return;
      }

      // Get total count with retry mechanism
      for (int attempt = 1; attempt <= 3; attempt++) {
        totalCount = await getStaffsCount(locationId);
        if (totalCount > 0) break;

        // If failed and not the last attempt, wait before retrying
        if (attempt < 3) {
          await Future.delayed(Duration(seconds: attempt));
          // Check connectivity before retry
          if (!await _isInternetAvailable()) {
            yield SyncProgress(0, 0, [
              'Lost internet connection while getting staffs count',
            ]);
            return;
          }
        }
      }

      if (totalCount == -1) {
        yield SyncProgress(0, 0, [
          'No staffs found for location $locationId - Internal server timed out or no internet connection',
        ]);
        return;
      }

      if (totalCount <= 0) {
        yield SyncProgress(0, 0, [
          'No staffs found for location $locationId - No staffs available on the Datbase',
        ]);
        return;
      }

      // Progress update
      yield SyncProgress(0, totalCount, []);

      // Use dynamic batching for optimal performance
      int consecutiveSuccesses = 0;
      int consecutiveFailures = 0;

      // Main sync loop
      while (offset < totalCount && !isSyncCancelled) {
        // Check internet connectivity before each batch
        if (!await _isInternetAvailable()) {
          errors.add(
            'Internet connection lost at staffs ${offset + 1}. Sync paused.',
          );
          yield SyncProgress(processedCount, totalCount, errors);
          return;
        }

        try {
          _logger.info(
            'Fetching batch of $batchSize staffs starting at offset $offset',
          );

          // Fetch data with timeout to prevent hanging
          final response = await _appService.supabaseClient
              .from('staffs')
              .select()
              .eq('location_id', locationId.toString())
              .range(offset, offset + batchSize - 1)
              .timeout(const Duration(seconds: 20));

          _logger.info('Fetching staffs $response');

          if (response.isEmpty) {
            _logger.info('No more staffs returned from server');
            break;
          }

          // Process staffs in memory-efficient way
          final List<Staffs> staffsList = [];
          for (var json in response) {
            try {
              _logger.info('Parsing staff: $json');

              if (json.containsKey('name_embedding')) {
                json.remove('name_embedding');
              }

              staffsList.add(
                Staffs(
                  id: json['id'] as int?,
                  uuid: json['uuid']?.toString() ?? '',
                  number: json['number']?.toString() ?? '',
                  created_at: DateTime.tryParse(json['created_at'] ?? ''),
                  updated_at:
                      json['updated_at'] != null
                          ? DateTime.tryParse(json['updated_at'])
                          : null,
                  version: json['version'] as int?,
                  first_name: json['first_name']?.toString() ?? '',
                  last_name: json['last_name']?.toString() ?? '',
                  email: json['email']?.toString() ?? '',
                  phone: json['phone']?.toString() ?? '',
                  merchant_id: json['merchant_id'] as int?,
                  role_uuid: json['role_uuid']?.toString() ?? '',
                  location_id: json['location_id'] as int?,
                  is_active: json['is_active'] == true,
                  is_quick_login: json['is_quick_login'] == true,
                  is_logout_after_sale: json['is_logout_after_sale'] == true,
                  is_cash_drawer: json['is_cash_drawer'] == true,
                  is_super_user: json['is_super_user'] == true,
                  is_training_staff:
                      json['is_training_staff'] == true ||
                      json['is_Training_staff'] ==
                          true, // fix inconsistent key casing
                  is_show_driver: json['is_show_driver'] == true,
                  is_waiter: json['is_waiter'] == true,
                  password: json['password']?.toString() ?? '',
                  pin: json['pin']?.toString() ?? '',
                  is_engineer: json['is_engineer'] == true,
                ),
              );
            } catch (e) {
              _logger.warning('Failed to parse staff. Error: $e');
              _logger.warning('Offending JSON: $json');
            }
          }

          _logger.info('Fetching staffs ${staffsList.length}');

          // Save to database in smaller chunks to prevent UI blocking
          const int dbChunkSize = 100;
          for (int i = 0; i < staffsList.length; i += dbChunkSize) {
            final int end =
                (i + dbChunkSize < staffsList.length)
                    ? i + dbChunkSize
                    : staffsList.length;
            final List<Staffs> chunk = staffsList.sublist(i, end);

            try {
              await database.staffsRepository.createOrUpdateAll(chunk);
              processedCount += chunk.length;

              // Provide more frequent progress updates
              if (i + dbChunkSize >= staffsList.length) {
                yield SyncProgress(processedCount, totalCount, errors);
              }
            } catch (dbError) {
              errors.add(
                'Database Error at offset ${offset + i}: ${dbError.toString().substring(0, 100)}...',
              );
              yield SyncProgress(processedCount, totalCount, errors);
            }

            // Yield to the UI thread
            await Future.delayed(Duration.zero);
          }

          // Adjust batch size dynamically based on success
          consecutiveSuccesses++;
          consecutiveFailures = 0;
          if (consecutiveSuccesses >= 3 && batchSize < maxBatchSize) {
            batchSize = min(maxBatchSize, batchSize * 2);
            consecutiveSuccesses = 0;
          }

          offset += batchSize;

          // Small delay between batches to prevent overwhelming the server and allow UI updates
          await Future.delayed(const Duration(milliseconds: 100));
        } catch (apiError) {
          consecutiveFailures++;
          consecutiveSuccesses = 0;

          // Log detailed error for debugging
          _logger.severe('API Error at offset $offset: ${apiError.toString()}');

          // Add user-friendly error
          String errorMessage;
          if (apiError is TimeoutException) {
            errorMessage = 'Request timed out';
          } else if (apiError is PostgrestException) {
            errorMessage = 'Database error: ${apiError.message}';
          } else {
            errorMessage = apiError.toString().substring(
              0,
              min(100, apiError.toString().length),
            );
          }

          errors.add('API Error (Offset $offset): $errorMessage');
          yield SyncProgress(processedCount, totalCount, errors);

          // Reduce batch size after failure to handle potentially problematic data
          if (consecutiveFailures >= 2 && batchSize > minBatchSize) {
            batchSize = max(minBatchSize, batchSize ~/ 2);
          }

          // Wait before retrying
          await Future.delayed(Duration(seconds: min(5, consecutiveFailures)));

          // Check if we should continue or abort based on failure count
          if (consecutiveFailures >= 5) {
            errors.add('Aborting sync after 5 consecutive failures');
            break;
          }
        }
      }

      if (isSyncCancelled) {
        errors.add('Sync cancelled due to internet connection loss');
      }
    } catch (e) {
      _logger.severe('Unexpected error during sync: $e');
      errors.add('Unexpected Error: ${e.toString()}');
    } finally {
      // Clean up connectivity listener
      await connectivitySubscription?.cancel();

      // Final progress update
      yield SyncProgress(processedCount, totalCount, errors);

      _logger.info(
        'Sync completed: Processed $processedCount out of $totalCount staffs with ${errors.length} errors',
      );
    }
  }
}
