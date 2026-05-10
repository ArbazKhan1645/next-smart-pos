// isolate_handler_complete.dart
import 'dart:async';
import 'dart:isolate';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:logging/logging.dart';

class IsolateMessage {
  final String operation;
  final Map<String, dynamic> data;
  final SendPort? replyPort;

  IsolateMessage({required this.operation, required this.data, this.replyPort});
}

class IsolateConfig {
  final SendPort sendPort;
  final String supabaseUrl;
  final String supabaseAnon;
  final String tableName;
  final bool requiresLocationFilter;
  final bool hasInternet;

  IsolateConfig({
    required this.sendPort,
    required this.supabaseUrl,
    required this.supabaseAnon,
    required this.tableName,
    required this.requiresLocationFilter,
    required this.hasInternet,
  });
}

class SupabaseIsolateHandler {
  static late String _supabaseUrl;
  static late String _supabaseAnon;
  static late String _tableName;
  static late bool _requiresLocationFilter;
  static final Logger _logger = Logger('SupabaseIsolateHandler');
  static late http.Client _httpClient;
  static const Duration _CONNECTION_TIMEOUT = Duration(seconds: 30);

  static void isolateEntryPoint(IsolateConfig config) async {
    // Setup configuration
    _supabaseUrl = config.supabaseUrl;
    _supabaseAnon = config.supabaseAnon;
    _tableName = config.tableName;
    _requiresLocationFilter = config.requiresLocationFilter;
    _httpClient = http.Client();

    // Setup message listener
    final receivePort = ReceivePort();
    config.sendPort.send(receivePort.sendPort);

    await for (final message in receivePort) {
      if (message is IsolateMessage) {
        await _handleMessage(message);
      }
    }
  }

  static Future<void> _handleMessage(IsolateMessage message) async {
    try {
      dynamic result;

      switch (message.operation) {
        case 'insert':
          result = await _insertRecord(message.data);
          break;
        case 'update':
          result = await _updateRecord(
            message.data['uuid'] as String,
            message.data['updateData'] as Map<String, dynamic>,
          );
          break;
        case 'upsert':
          result = await _upsertRecord(
            message.data['uuid'] as String,
            message.data['data'] as Map<String, dynamic>,
          );
          break;
        case 'delete':
          result = await _deleteRecord(message.data['uuid'] as String);
          break;
        case 'deleteCondition':
          result = await _deleteConditionRecord(
            message.data['key'] as String,
            message.data['val'] as String,
          );
          break;
        case 'deleteWithConditions':
          result = _deleteWithConditions(
            message.data['conditions'] as Map<String, dynamic>,
          );
          break;
        case 'getByUuid':
          result = await _getByUuid(message.data['uuid'] as String);
          break;
        case 'getAll':
          result = await _getAllRecords(
            limit: message.data['limit'] as int? ?? 1000,
            offset: message.data['offset'] as int? ?? 0,
            locationId: message.data['locationId'] as int?,
          );
          break;
        case 'syncBatch':
          result = await _syncBatch(
            message.data['offset'] as int,
            message.data['limit'] as int,
            message.data['locationId'] as int?,
          );
          break;
        case 'getCount':
          result = await _getRecordsCount(message.data['locationId'] as int?);
          break;
      }

      if (message.replyPort != null) {
        message.replyPort!.send({'success': true, 'data': result});
      }
    } catch (e) {
      _logger.severe('Isolate operation error: $e');
      if (message.replyPort != null) {
        message.replyPort!.send({'success': false, 'error': e.toString()});
      }
    }
  }

  // Helper function to make HTTP requests with timeout
  static Future<dynamic> _makeRequest({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    final uri = Uri.parse(
      '$_supabaseUrl/rest/v1/$endpoint',
    ).replace(queryParameters: queryParams);

    final headers = {
      'apikey': _supabaseAnon,
      'Authorization': 'Bearer $_supabaseAnon',
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    http.Response response;

    try {
      switch (method) {
        case 'GET':
          response = await _httpClient
              .get(uri, headers: headers)
              .timeout(_CONNECTION_TIMEOUT);
          break;
        case 'POST':
          response = await _httpClient
              .post(uri, headers: headers, body: json.encode(body))
              .timeout(_CONNECTION_TIMEOUT);
          break;
        case 'PATCH':
          response = await _httpClient
              .patch(uri, headers: headers, body: json.encode(body))
              .timeout(_CONNECTION_TIMEOUT);
          break;
        case 'DELETE':
          response = await _httpClient
              .delete(uri, headers: headers)
              .timeout(_CONNECTION_TIMEOUT);
          break;
        default:
          throw Exception('Unsupported HTTP method: $method');
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (response.body.isEmpty) return null;
        return json.decode(response.body);
      } else {
        throw Exception(
          'Request failed: ${response.statusCode} - ${response.body}',
        );
      }
    } on TimeoutException {
      throw Exception(
        'Database operation timed out after $_CONNECTION_TIMEOUT',
      );
    } catch (e) {
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _insertRecord(
    Map<String, dynamic> data,
  ) async {
    final result = await _makeRequest(
      method: 'POST',
      endpoint: _tableName,
      body: data,
    );
    return {'success': true};
  }

  static Future<Map<String, dynamic>> _updateRecord(
    String uuid,
    Map<String, dynamic> updateData,
  ) async {
    final result = await _makeRequest(
      method: 'PATCH',
      endpoint: _tableName,
      body: updateData,
      queryParams: {'uuid': 'eq.$uuid'},
    );
    return result is List ? result.first : result;
  }

  static Future<Map<String, dynamic>> _upsertRecord(
    String uuid,
    Map<String, dynamic> data,
  ) async {
    print('Upserting record with UUID2: $uuid');
    // Check if exists
    final existingResult = await _makeRequest(
      method: 'GET',
      endpoint: _tableName,
      queryParams: {'uuid': 'eq.$uuid', 'select': 'uuid'},
    );

    final exists = existingResult is List && existingResult.isNotEmpty;



    if (exists) {
      // Update
      final result = await _makeRequest(
        method: 'PATCH',
        endpoint: _tableName,
        body: data,
        queryParams: {'uuid': 'eq.$uuid'},
      );
      return result is List ? result.first : result;
    } else {
      // Insert - add uuid if not in data
      if (!data.containsKey('uuid')) {
        data['uuid'] = uuid;
      }

      final result = await _makeRequest(
        method: 'POST',
        endpoint: _tableName,
        body: data,
      );

      print(result);
      return result is List ? result.first : result;
    }
  }

  static Future<bool> _deleteRecord(String uuid) async {
    await _makeRequest(
      method: 'DELETE',
      endpoint: _tableName,
      queryParams: {'uuid': 'eq.$uuid'},
    );
    return true;
  }

  static Future<bool> _deleteConditionRecord(String key, String val) async {
    await _makeRequest(
      method: 'DELETE',
      endpoint: _tableName,
      queryParams: {key: 'eq.$val'},
    );
    return true;
  }

  static Future<void> _deleteWithConditions(
    Map<String, dynamic> conditions,
  ) async {
    final Map<String, String> queryParams = {};
    conditions.forEach((key, value) {
      queryParams[key] = 'eq.$value';
    });

    await _makeRequest(
      method: 'DELETE',
      endpoint: _tableName,
      queryParams: queryParams,
    );
  }

  static Future<Map<String, dynamic>> _getByUuid(String uuid) async {
    final result = await _makeRequest(
      method: 'GET',
      endpoint: _tableName,
      queryParams: {'uuid': 'eq.$uuid'},
    );
    return result is List && result.isNotEmpty ? result.first : {};
  }

  static Future<List<dynamic>> _getAllRecords({
    required int limit,
    required int offset,
    int? locationId,
  }) async {
    final Map<String, String> queryParams = {
      'limit': limit.toString(),
      'offset': offset.toString(),
    };

    if (_requiresLocationFilter && locationId != null) {
      queryParams['location_id'] = 'eq.$locationId';
    }

    // Add filter for ext_orders table to only get SMART_POS records
    if (_tableName == 'ext_orders') {
      queryParams['sale_channel_type'] = 'eq.SMART_POS';
    }

    final result = await _makeRequest(
      method: 'GET',
      endpoint: _tableName,
      queryParams: queryParams,
    );

    return result is List ? result : [];
  }

  static Future<int> _getRecordsCount(int? locationId) async {
    final Map<String, String> queryParams = {'select': 'count', 'limit': '1'};

    if (_requiresLocationFilter && locationId != null) {
      queryParams['location_id'] = 'eq.$locationId';
    }

    // Add filter for ext_orders table to only count SMART_POS records
    if (_tableName == 'ext_orders') {
      queryParams['sale_channel_type'] = 'eq.SMART_POS';
    }

    // For count, we need to add a different header
    final uri = Uri.parse(
      '$_supabaseUrl/rest/v1/$_tableName',
    ).replace(queryParameters: queryParams);

    final headers = {
      'apikey': _supabaseAnon,
      'Authorization': 'Bearer $_supabaseAnon',
      'Prefer': 'count=exact',
    };

    try {
      final response = await _httpClient
          .get(uri, headers: headers)
          .timeout(_CONNECTION_TIMEOUT);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        // Get count from Content-Range header
        final contentRange = response.headers['content-range'];
        if (contentRange != null) {
          final parts = contentRange.split('/');
          if (parts.length == 2) {
            return int.tryParse(parts[1]) ?? 0;
          }
        }
        return 0;
      } else {
        return 0;
      }
    } catch (e) {
      _logger.warning('Failed to get count: $e');
      return 0;
    }
  }

  static Future<Map<String, dynamic>> _syncBatch(
    int offset,
    int limit,
    int? locationId,
  ) async {
    final records = await _getAllRecords(
      limit: limit,
      offset: offset,
      locationId: locationId,
    );

    // Process DateTime fields AND apply table-specific conditions
    for (var record in records) {
      if (record is Map<String, dynamic>) {
        _processDateTimeFields(record);
      }
    }

    return {'records': records, 'hasMore': records.length == limit};
  }

  static void _processDateTimeFields(Map<String, dynamic> json) {
    final dateFields = [
      'updated_at',
      'created_at',
      'operation_at',
      'status_timestamp',
      'ticket_status_timestamp',
      'deleted_at',
    ];

    for (final field in dateFields) {
      if (json.containsKey(field)) {
        final rawValue = json[field];
        if (rawValue is String) {
          try {
            json[field] = DateTime.parse(rawValue).toIso8601String();
          } catch (_) {
            try {
              final fixed = rawValue.replaceFirst(' ', 'T');
              json[field] = DateTime.parse(fixed).toIso8601String();
            } catch (_) {
              json[field] = null;
            }
          }
        } else if (rawValue is int) {
          json[field] = DateTime.fromMillisecondsSinceEpoch(
            rawValue,
          ).toIso8601String();
        } else if (rawValue is! DateTime) {
          json[field] = null;
        }
      }
    }

    // IMPORTANT: Table-specific conditions (YOUR ORIGINAL LOGIC)
    if (_tableName == 'ext_orders') {
      json.remove('id');
      json.remove('discount');

      // Add any other order-specific processing here
    }

    // You can add more table-specific conditions here
    // Example:
    // if (_tableName == 'customers') {
    //   // customer specific processing
    // }
    // if (_tableName == 'products') {
    //   // product specific processing
    // }
  }
}
