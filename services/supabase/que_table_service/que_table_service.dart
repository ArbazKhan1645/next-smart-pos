// ignore_for_file: depend_on_referenced_packages

import 'dart:async';
import 'dart:collection';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/repos/ext_query_repo/ext_query_repo.dart';
import 'package:hse_pos/app/services/app/app_service.dart';
import 'package:hse_pos/app/services/auth/auth_service.dart';
import 'package:supabase/supabase.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:logging/logging.dart';

enum SyncStatus { pending, syncing, success, failed, defective }

class SyncResult {
  final bool success;
  final String? error;
  final SyncStatus status;
  final int processedCount;
  final int failedCount;
  final int defectiveCount;

  SyncResult({
    required this.success,
    this.error,
    required this.status,
    this.processedCount = 0,
    this.failedCount = 0,
    this.defectiveCount = 0,
  });
}

class QueTableSupaBaseService {
  final SupabaseClient supabaseClient = AppService.instance.supabaseClient;
  final Logger _logger = Logger('QueTableSupaBaseService');
  final ExtQueryRepository _extQueryRepository = ExtQueryRepository(database);

  // Auto-sync configuration
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 5);
  static const Duration autoSyncInterval = Duration(minutes: 5);

  // Status tracking
  final RxBool _isSyncing = false.obs;
  final Rx<SyncStatus> _syncStatus = SyncStatus.pending.obs;

  bool get isSyncing => _isSyncing.value;
  SyncStatus get syncStatus => _syncStatus.value;

  QueTableSupaBaseService() {
    _startAutoSync();
  }

  // Auto-sync functionality
  void _startAutoSync() {
    Timer.periodic(autoSyncInterval, (timer) {
      if (!_isSyncing.value) {
        syncQuesInitial(isAutoSync: true);
      }
    });
  }

  // Enhanced connectivity check with timeout
  Future<bool> _checkInternetConnectivity({
    Duration timeout = const Duration(seconds: 10),
  }) async {
    try {
      final results = await Connectivity().checkConnectivity().timeout(timeout);
      final hasInternet = results.firstWhere(
        (result) =>
            result == ConnectivityResult.mobile ||
            result == ConnectivityResult.wifi ||
            result == ConnectivityResult.ethernet,
        orElse: () => ConnectivityResult.none,
      );
      return hasInternet != ConnectivityResult.none;
    } catch (e) {
      _logger.warning('Connectivity check failed: $e');
      return false;
    }
  }

  // Enhanced create with retry mechanism
  Future<List<Map<String, dynamic>>> create({
    required String tableName,
    required Map<String, dynamic> values,
    int retryAttempt = 0,
  }) async {
    try {
      if (!await _checkInternetConnectivity()) {
        throw NetworkException('No internet connection available');
      }

      values.remove('index');
      final response = await supabaseClient
          .from(tableName)
          .insert(values)
          .select()
          .timeout(const Duration(seconds: 30));

      if (response.isEmpty) {
        _logger.warning(
          'Create operation returned empty response for $tableName',
        );
        return [];
      }

      _logger.info('Successfully created record in $tableName');
      return response;
    } on NetworkException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.severe(
        'Failed to create record in $tableName: $e',
        e,
        stackTrace,
      );

      if (retryAttempt < maxRetryAttempts && _shouldRetry(e)) {
        _logger.info(
          'Retrying create operation (attempt ${retryAttempt + 1}/$maxRetryAttempts)',
        );
        await Future.delayed(retryDelay);
        return create(
          tableName: tableName,
          values: values,
          retryAttempt: retryAttempt + 1,
        );
      }

      rethrow;
    }
  }

  // Enhanced update with retry mechanism
  Future<List<Map<String, dynamic>>> update({
    required String tableName,
    required String columnName,
    required dynamic columnValue,
    required Map<String, dynamic> values,
    int retryAttempt = 0,
  }) async {
    try {
      if (!await _checkInternetConnectivity()) {
        throw NetworkException('No internet connection available');
      }

      final response = await supabaseClient
          .from(tableName)
          .update(values)
          .eq(columnName, columnValue)
          .select()
          .timeout(const Duration(seconds: 30));

      if (response.isEmpty) {
        _logger.warning(
          'Update operation returned empty response for $tableName',
        );
        return [];
      }

      _logger.info('Successfully updated record in $tableName');
      return response;
    } on NetworkException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.severe(
        'Failed to update record in $tableName: $e',
        e,
        stackTrace,
      );

      if (retryAttempt < maxRetryAttempts && _shouldRetry(e)) {
        _logger.info(
          'Retrying update operation (attempt ${retryAttempt + 1}/$maxRetryAttempts)',
        );
        await Future.delayed(retryDelay);
        return update(
          tableName: tableName,
          columnName: columnName,
          columnValue: columnValue,
          values: values,
          retryAttempt: retryAttempt + 1,
        );
      }

      rethrow;
    }
  }

  // Enhanced delete with retry mechanism
  Future<bool> delete({
    required String tableName,
    required String columnName,
    required dynamic columnValue,
    int retryAttempt = 0,
  }) async {
    try {
      if (!await _checkInternetConnectivity()) {
        throw NetworkException('No internet connection available');
      }

      await supabaseClient
          .from(tableName)
          .delete()
          .eq(columnName, columnValue)
          .select()
          .timeout(const Duration(seconds: 30));

      _logger.info('Successfully deleted record from $tableName');
      return true;
    } on NetworkException {
      rethrow;
    } catch (e, stackTrace) {
      _logger.severe(
        'Failed to delete record from $tableName: $e',
        e,
        stackTrace,
      );

      if (retryAttempt < maxRetryAttempts && _shouldRetry(e)) {
        _logger.info(
          'Retrying delete operation (attempt ${retryAttempt + 1}/$maxRetryAttempts)',
        );
        await Future.delayed(retryDelay);
        return delete(
          tableName: tableName,
          columnName: columnName,
          columnValue: columnValue,
          retryAttempt: retryAttempt + 1,
        );
      }

      rethrow;
    }
  }

  // Determine if error is retryable
  bool _shouldRetry(dynamic error) {
    if (error is NetworkException) return false;
    if (error.toString().contains('timeout')) return true;
    if (error.toString().contains('network')) return false;
    if (error.toString().contains('connection')) return false;
    if (error.toString().contains('auth')) return false;
    if (error.toString().contains('permission')) return false;
    return true; // Retry unknown errors
  }

  // Enhanced sync with comprehensive error handling and status tracking
  Future<SyncResult> syncQuesInitial({bool isAutoSync = false}) async {
    if (_isSyncing.value) {
      _logger.info('Sync already in progress, skipping...');
      return SyncResult(
        success: false,
        error: 'Sync already in progress',
        status: SyncStatus.syncing,
      );
    }

    _isSyncing.value = true;
    _syncStatus.value = SyncStatus.syncing;

    int processedCount = 0;
    int failedCount = 0;
    int defectiveCount = 0;

    try {
      // Validate required data
      final authService = Get.find<AuthService>();
      final merchant = authService.authMerchantBehaviorSubject.value;
      final location = authService.selectedLocationBehaviorSubject.value;
      final terminal = authService.selectedTerminalBehaviorSubject.value;

      if (merchant?.uuid == null ||
          location?.id == null ||
          terminal?.id == null) {
        throw ValidationException(
          'Required data (merchant, location, or terminal) is missing',
        );
      }

      // Get non-defective records only
      final foundQues = await _extQueryRepository
          .getAllNonDefectiveQuesRecords();
      if (foundQues.isEmpty) {
        _logger.info('No records found in cache for syncing');
        _syncStatus.value = SyncStatus.success;
        return SyncResult(success: true, status: SyncStatus.success);
      }

      // Check connectivity
      if (!await _checkInternetConnectivity()) {
        throw NetworkException('No internet connection available');
      }

      _logger.info('${foundQues.length} records found for syncing');

      // Sort by creation date
      foundQues.sort((a, b) {
        if (a.created_at == null && b.created_at == null) return 0;
        if (a.created_at == null) return 1;
        if (b.created_at == null) return -1;
        return a.created_at!.compareTo(b.created_at!);
      });

      // Process records with controlled concurrency
      final semaphore = Semaphore(3); // Limit concurrent operations
      final futures = foundQues.map(
        (record) => semaphore.acquire(() async {
          try {
            await _processRecord(record);
            processedCount++;
          } on NetworkException {
            failedCount++;
            // Don't mark as defective for network issues
            rethrow;
          } catch (e) {
            failedCount++;
            // Mark as defective for other errors
            await _extQueryRepository.markRecordAsDefective(
              record.uuid.toString(),
            );
            defectiveCount++;
            _logger.warning('Marked record ${record.uuid} as defective: $e');
          }
        }),
      );

      await Future.wait(futures, eagerError: false);

      _syncStatus.value = SyncStatus.success;
      final result = SyncResult(
        success: true,
        status: SyncStatus.success,
        processedCount: processedCount,
        failedCount: failedCount,
        defectiveCount: defectiveCount,
      );

      if (!isAutoSync) {
        _showSyncResultNotification(result);
      }

      return result;
    } on NetworkException catch (e) {
      _logger.warning('Network error during sync: $e');
      _syncStatus.value = SyncStatus.failed;
      return SyncResult(
        success: false,
        error: e.message,
        status: SyncStatus.failed,
        processedCount: processedCount,
        failedCount: failedCount,
        defectiveCount: defectiveCount,
      );
    } catch (e, stackTrace) {
      _logger.severe('Failed to sync records: $e', e, stackTrace);
      _syncStatus.value = SyncStatus.failed;
      return SyncResult(
        success: false,
        error: e.toString(),
        status: SyncStatus.failed,
        processedCount: processedCount,
        failedCount: failedCount,
        defectiveCount: defectiveCount,
      );
    } finally {
      _isSyncing.value = false;
    }
  }

  // Process individual record
  Future<void> _processRecord(EXTQueryModel record) async {
    final operation = await _extQueryRepository.fetchRelatedRecord(
      record.entity.toString(),
      record.entity_id.toString(),
    );

    if (operation == null) {
      throw DataException(
        'Related record not found for entity: ${record.entity}, id: ${record.entity_id}',
      );
    }

    // Clean operation data
    operation.remove('deleted_at');
    operation.remove('id');
    operation.remove('operation_at');

    switch (record.operation) {
      case 'create':
        final res = await create(
          tableName: record.entity.toString(),
          values: operation,
        );
        if (res.isNotEmpty) {
          await updateDbLocal(record.entity.toString(), res);
          await _extQueryRepository.deleteRecord(record.uuid.toString());
          _logger.info('Successfully created ${record.entity} in Supabase');
        }
        break;

      case 'update':
        final res = await update(
          tableName: record.entity.toString(),
          columnName: 'uuid',
          columnValue: record.entity_id,
          values: operation,
        );
        if (res.isNotEmpty) {
          await updateDbLocal(record.entity.toString(), res);
          await _extQueryRepository.deleteRecord(record.uuid.toString());
          _logger.info('Successfully updated ${record.entity} in Supabase');
        }
        break;

      case 'delete':
        final res = await delete(
          tableName: record.entity.toString(),
          columnName: 'uuid',
          columnValue: record.entity_id,
        );
        if (res) {
          await _extQueryRepository.deleteRecord(record.uuid.toString());
          _logger.info('Successfully deleted ${record.entity} in Supabase');
        }
        break;

      default:
        throw ValidationException('Unknown operation: ${record.operation}');
    }
  }

  // Show result notification
  void _showSyncResultNotification(SyncResult result) {
    if (result.success) {
      if (result.processedCount > 0) {
        Get.snackbar(
          'Sync Complete',
          'Successfully synced ${result.processedCount} records${result.defectiveCount > 0 ? ' (${result.defectiveCount} marked as defective)' : ''}',
          backgroundColor: Colors.green.withOpacity(0.1),
          colorText: Colors.green[800],
          icon: Icon(Icons.check_circle, color: Colors.green[800]),
          duration: const Duration(seconds: 3),
        );
      } else {
        Get.snackbar(
          'Already Synced',
          'All records are up to date',
          backgroundColor: Colors.blue.withOpacity(0.1),
          colorText: Colors.blue[800],
          icon: Icon(Icons.cloud_done, color: Colors.blue[800]),
          duration: const Duration(seconds: 2),
        );
      }
    }
  }

  // Reset defective records (for manual intervention)
  Future<void> resetDefectiveRecords() async {
    await _extQueryRepository.resetDefectiveRecords();
    _logger.info('All defective records have been reset');
  }

  // Update local database after successful sync
  Future<void> updateDbLocal(
    String entity,
    List<Map<String, dynamic>> res,
  ) async {
    if (res.isEmpty) return;

    try {
      switch (entity) {
        case 'location_products':
          await database.productsRepository.createOrUpdateAll([
            Product.fromJson(res.first),
          ]);
          break;
        case 'customers':
          await database.customersRepository.createOrUpdateAll([
            customers.fromJson(res.first),
          ]);
          break;
        case 'location_categories':
          await database.categoriesRepository.createOrUpdateAll([
            CategoriesTableData.fromJson(res.first),
          ]);
          break;
        case 'ext_display_level_categories':
          await database.displayLevelCategoriesRepository.createOrUpdateAll([
            DisplayLevelCategories.fromJson(res.first),
          ]);
          break;
        case 'services':
          await database.serviceRepository.createOrUpdateAll([
            Service.fromJson(res.first),
          ]);
          break;
        case 'modifier_group':
          await database.modifiersGroupRepository.createOrUpdateAll([
            ModifierGroups.fromJson(res.first),
          ]);
          break;
        case 'location_modifiers':
          await database.locationModifiersRepository.createOrUpdateAll([
            LocationModifiers.fromJson(res.first),
          ]);
          break;
        case 'ext_orders':
          await database.extOrdersRepository.createOrUpdateAll([
            ExtOrders.fromJson(res.first),
          ]);
          break;
        case 'modifier_display_levels_location':
          await database.modifierDisplayLevelsLocationsRepository
              .createOrUpdateAll([
                ModifierDisplayLevelsLocations.fromJson(res.first),
              ]);
          break;
        default:
          _logger.warning('Unknown entity: $entity. Skipping local update.');
          break;
      }
    } catch (e, stackTrace) {
      _logger.severe(
        'Failed to update local database for $entity: $e',
        e,
        stackTrace,
      );
      rethrow;
    }
  }
}

// Custom exceptions for better error handling
class NetworkException implements Exception {
  final String message;
  NetworkException(this.message);

  @override
  String toString() => 'NetworkException: $message';
}

class ValidationException implements Exception {
  final String message;
  ValidationException(this.message);

  @override
  String toString() => 'ValidationException: $message';
}

class DataException implements Exception {
  final String message;
  DataException(this.message);

  @override
  String toString() => 'DataException: $message';
}

// Semaphore for controlling concurrency
class Semaphore {
  final int maxCount;
  int _currentCount = 0;
  final Queue<Completer<void>> _waitQueue = Queue<Completer<void>>();

  Semaphore(this.maxCount);

  Future<T> acquire<T>(Future<T> Function() operation) async {
    while (_currentCount >= maxCount) {
      final completer = Completer<void>();
      _waitQueue.add(completer);
      await completer.future;
    }

    _currentCount++;
    try {
      return await operation();
    } finally {
      _currentCount--;
      if (_waitQueue.isNotEmpty) {
        final completer = _waitQueue.removeFirst();
        completer.complete();
      }
    }
  }
}
