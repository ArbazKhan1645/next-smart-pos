// generic_supabase_service_fixed.dart
import 'dart:async';
import 'dart:isolate';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hse_pos/app/core/utils/helpers/current_location.dart';
import 'package:hse_pos/app/models/others/supabase_result_model.dart';
import 'package:hse_pos/app/models/others/sync_progress.dart';
import 'package:hse_pos/app/services/supabase/generic_supabase_service/isolate.dart';
import 'package:hse_pos/main.dart';
import 'package:logging/logging.dart';

typedef FromJsonConverter<T> = T Function(Map<String, dynamic> json);
typedef RepositoryBulkSave<T> = Future<void> Function(List<T> items);

class GenericSupabaseService<T> {
  static const int _DEFAULT_BATCH_SIZE = 1000;

  final Logger _logger;
  final String _tableName;
  final bool _requiresLocationFilter;
  final FromJsonConverter<T> _fromJson;
  final RepositoryBulkSave<T> _repositorySaveAll;
  final Connectivity _connectivity = Connectivity();

  // Isolate related
  Isolate? _isolate;
  SendPort? _isolateSendPort;
  bool _isInitialized = false;

  // Cache for connectivity
  DateTime? _lastConnectivityCheck;
  bool? _lastConnectivityStatus;
  static const Duration _connectivityCacheDuration = Duration(seconds: 5);

  GenericSupabaseService({
    required String tableName,
    required bool requiresLocationFilter,
    required FromJsonConverter<T> fromJson,
    required RepositoryBulkSave<T> repositorySaveAll,
  }) : _tableName = tableName,
       _requiresLocationFilter = requiresLocationFilter,
       _fromJson = fromJson,
       _repositorySaveAll = repositorySaveAll,

       _logger = Logger('GenericSupabaseServiceFixed_$tableName');

  /// Check internet connectivity (in main isolate)
  Future<bool> _isInternetAvailable() async {
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

      _lastConnectivityCheck = now;
      _lastConnectivityStatus = isConnected;

      return isConnected;
    } catch (e) {
      _logger.severe('Error checking internet connectivity: $e');
      return false;
    }
  }

  /// Initialize isolate for database operations
  Future<void> initializeIsolate() async {
    if (_isInitialized) return;

    try {
      final hasInternet = await _isInternetAvailable();
      final receivePort = ReceivePort();

      _isolate = await Isolate.spawn(
        SupabaseIsolateHandler.isolateEntryPoint,
        IsolateConfig(
          sendPort: receivePort.sendPort,
          supabaseUrl: currentEnv.supabaseUrl,
          supabaseAnon: currentEnv.supabaseAnon,
          tableName: _tableName,
          requiresLocationFilter: _requiresLocationFilter,
          hasInternet: hasInternet,
        ),
      );

      _isolateSendPort = await receivePort.first;
      _isInitialized = true;
      _logger.info('Isolate initialized successfully for $_tableName');
    } catch (e) {
      _logger.severe('Failed to initialize isolate: $e');
      throw Exception('Failed to initialize database service: $e');
    }
  }

  /// Send message to isolate and wait for response
  Future<Map<String, dynamic>> _sendToIsolate(
    String operation,
    Map<String, dynamic> data,
  ) async {
    // Check internet before sending to isolate
    if (!await _isInternetAvailable()) {
      return {'success': false, 'error': 'No internet connection'};
    }

    if (!_isInitialized) {
      await initializeIsolate();
    }

    final responsePort = ReceivePort();
    _isolateSendPort!.send(
      IsolateMessage(
        operation: operation,
        data: data,
        replyPort: responsePort.sendPort,
      ),
    );

    final response = await responsePort.first as Map<String, dynamic>;
    responsePort.close();

    return response;
  }

  /// Insert a new record
  Future<SupabaseResult> insertRecord(Map<String, dynamic> data) async {
    try {
      final response = await _sendToIsolate('insert', data);

      if (response['success']) {
        return SupabaseResult(success: true, data: response['data']);
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Insert error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Update an existing record
  Future<SupabaseResult> updateRecord(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    if (uuid.isEmpty) {
      return SupabaseResult(success: false, error: 'UUID cannot be empty');
    }

    try {
      final response = await _sendToIsolate('update', {
        'uuid': uuid,
        'updateData': updateData,
      });

      if (response['success']) {
        return SupabaseResult(success: true, data: response['data']);
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Update error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Upsert a record
  Future<SupabaseResult> upsertRecord(
    String uuid,
    Map<String, dynamic> data,
  ) async {
    print('Upserting record with UUID: $uuid');
    if (uuid.isEmpty) {
      return SupabaseResult(success: false, error: 'UUID cannot be empty');
    }

    try {
      final response = await _sendToIsolate('upsert', {
        'uuid': uuid,
        'data': data,
      });

      if (response['success']) {
        return SupabaseResult(success: true, data: response['data']);
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Upsert error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Delete a record by UUID
  Future<SupabaseResult> deleteRecord(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(success: false, error: 'UUID cannot be empty');
    }

    try {
      final response = await _sendToIsolate('delete', {'uuid': uuid});

      if (response['success']) {
        return SupabaseResult(
          success: true,
          data: 'Record deleted successfully',
        );
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Delete error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Delete records with conditions
  Future<SupabaseResult> deleteRecordsWithConditions(
    Map<String, dynamic> conditions,
  ) async {
    if (conditions.isEmpty) {
      return SupabaseResult(
        success: false,
        error: 'Conditions cannot be empty',
      );
    }

    try {
      final response = await _sendToIsolate('deleteWithConditions', {
        'conditions': conditions,
      });

      if (response['success']) {
        return SupabaseResult(
          success: true,
          data: 'Records deleted successfully',
        );
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Delete with conditions error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Get a record by UUID
  Future<SupabaseResult> getRecordByUUID(String uuid) async {
    if (uuid.isEmpty) {
      return SupabaseResult(success: false, error: 'UUID cannot be empty');
    }

    try {
      final response = await _sendToIsolate('getByUuid', {'uuid': uuid});

      if (response['success']) {
        return SupabaseResult(success: true, data: response['data']);
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Get by UUID error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Get all records with pagination
  Future<SupabaseResult> getAllRecords({
    int limit = _DEFAULT_BATCH_SIZE,
    int offset = 0,
    int? locationId,
  }) async {
    if (_requiresLocationFilter && locationId == null) {
      return SupabaseResult(success: false, error: 'Location ID is required');
    }

    try {
      final response = await _sendToIsolate('getAll', {
        'limit': limit,
        'offset': offset,
        'locationId': locationId,
      });

      if (response['success']) {
        return SupabaseResult(success: true, data: response['data']);
      } else {
        return SupabaseResult(success: false, error: response['error']);
      }
    } catch (e) {
      _logger.severe('Get all records error: $e');
      return SupabaseResult(success: false, error: e.toString());
    }
  }

  /// Sync records in background with isolate
  Stream<SyncProgress> syncRecordsInIsolate() async* {
    const int batchSize = _DEFAULT_BATCH_SIZE;
    int offset = 0;
    bool hasMore = true;
    int progress = 0;
    int totalCount = 0;
    final List<String> errors = [];

    try {
      // Check internet first
      if (!await _isInternetAvailable()) {
        yield SyncProgress(0, 0, ['No internet connection']);
        return;
      }

      if (!_isInitialized) {
        await initializeIsolate();
      }

      int? locationId;
      if (_requiresLocationFilter) {
        locationId = getLocationId();

        if (locationId == null) {
          yield SyncProgress(0, 0, [
            'No Location Found - Please Login Merchant Again',
          ]);
          return;
        }
      }

      // Process in batches
      while (hasMore) {
        final response = await _sendToIsolate('syncBatch', {
          'offset': offset,
          'limit': batchSize,
          'locationId': locationId,
        });

        if (response['success']) {
          final batchData = response['data'];
          final records = batchData['records'] as List;
          hasMore = batchData['hasMore'] as bool;

          if (records.isNotEmpty) {
            final List<T> recordsToSave = [];

            for (var json in records) {
              try {
                if (json is Map<String, dynamic>) {
                  // Parse DateTime fields from ISO strings
                  final dateFields = [
                    'updated_at',
                    'created_at',
                    'operation_at',
                    'status_timestamp',
                    'ticket_status_timestamp',
                    'deleted_at',
                  ];

                  for (final field in dateFields) {
                    if (json[field] is String) {
                      try {
                        json[field] = DateTime.parse(json[field]);
                      } catch (_) {
                        json[field] = null;
                      }
                    }
                  }

                  final record = _fromJson(json);
                  recordsToSave.add(record);
                }
              } catch (e) {
                errors.add('Error parsing record: $e');
              }
            }

            // Save to local database
            if (recordsToSave.isNotEmpty) {
              try {
                await _repositorySaveAll(recordsToSave);
                progress += recordsToSave.length;
              } catch (e) {
                errors.add('Error saving records locally: $e');
              }
            }

            // Update total count estimate
            if (totalCount == 0 && !hasMore) {
              totalCount = progress;
            } else if (totalCount == 0) {
              totalCount = progress + batchSize; // Estimate
            }

            yield SyncProgress(progress, totalCount, errors);
          }

          offset += batchSize;
        } else {
          errors.add('Sync batch failed: ${response['error']}');
          hasMore = false;
        }
      }
    } catch (e) {
      errors.add('Sync error: $e');
    } finally {
      yield SyncProgress(
        progress,
        totalCount > 0 ? totalCount : progress,
        errors,
      );
    }
  }

  /// Dispose isolate when done
  void dispose() {
    _isolate?.kill(priority: Isolate.immediate);
    _isolate = null;
    _isolateSendPort = null;
    _isInitialized = false;
    _logger.info('Isolate disposed for $_tableName');
  }
}
