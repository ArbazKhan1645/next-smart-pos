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

class ProductsService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final String _table = 'location_products';
  final _appService = AppService.instance;
  final Logger _logger = Logger('ProductsService');
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

  Future<SupabaseResult> insertProduct(Map<String, dynamic> productData) async {
    // Pass a closure that returns plain data (Map or row), NOT SupabaseResult.
    return _executeQuery(() async {
      final uuid = productData['uuid'];

      // If UUID provided, check for an existing record
      if (uuid != null) {
        final existing = await _supabase
            .from(_table)
            .select()
            .eq('uuid', uuid)
            .maybeSingle();

        if (existing != null) {
          // Return a plain map describing the result. _executeQuery will wrap this map
          // into SupabaseResult(success: true, data: <this map>).
          return {
            'message': 'Product already exists',
            'product': existing,
            'skipped': true,
          };
        }
      }

      // Not found or no UUID provided -> insert and return the inserted row
      final inserted = await _supabase
          .from(_table)
          .insert(productData)
          .select()
          .single();

      return {
        'message': 'Product inserted',
        'product': inserted,
        'skipped': false,
      };
    });
  }

  Future<SupabaseResult> updateProduct(
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

  Future<SupabaseResult> deleteProduct(String uuid) async {
    return _executeQuery(() async {
      await _supabase.from(_table).delete().eq('uuid', uuid);
      return 'Product deleted successfully';
    });
  }

  Future<SupabaseResult> getProductByUUID(String uuid) async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select().eq('uuid', uuid).single();
    });
  }

  Future<SupabaseResult> getAllProducts() async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select();
    });
  }

  Future<SupabaseResult> getProductsByLocation(String location) async {
    return _executeQuery(() async {
      return await _supabase.from(_table).select().eq('location_id', location);
    });
  }

  Stream<SyncProgress> syncAllProductsFromSupabase() async* {
    yield* syncAllProductsFromSupabases();
  }

  // Optimized product count method with timeout and error handling
  Future<int> getProductCount(int locationId) async {
    try {
      if (!await _isInternetAvailable()) {
        _logger.warning('No internet connection when getting product count');
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
      _logger.severe('Timeout getting product count for location $locationId');
      return -1;
    } catch (e) {
      _logger.severe('Error getting product count: $e');
      return -1;
    }
  }

  Stream<SyncProgress> syncAllProductsFromSupabases() async* {
    // Configure initial sync parameters
    const int initialBatchSize = 500;

    int batchSize = initialBatchSize;
    int processedCount = 0;
    int totalCount = 0;
    final List<String> errors = [];
    bool isSyncCancelled = false;

    // Track IDs of products fetched from Supabase
    final Set<String> fetchedProductIds = {};

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
        totalCount = await getProductCount(locationId);
        if (totalCount > 0) break;

        // If failed and not the last attempt, wait before retrying
        if (attempt < 3) {
          await Future.delayed(Duration(seconds: attempt));
          // Check connectivity before retry
          if (!await _isInternetAvailable()) {
            yield SyncProgress(0, 0, [
              'Lost internet connection while getting product count',
            ]);
            return;
          }
        }
      }

      if (totalCount == -1) {
        yield SyncProgress(0, 0, []);
        return;
      }

      if (totalCount <= 0) {
        yield SyncProgress(0, 0, []);
        return;
      }

      yield SyncProgress(
        0,
        totalCount,
        [],
        additionalInfo: 'Getting product IDs from server...',
      );

      // Use a smaller batch size for IDs to prevent timeouts
      const int idBatchSize = 1000;
      int idOffset = 0;

      while (idOffset < totalCount && !isSyncCancelled) {
        try {
          final response = await _appService.supabaseClient
              .from('location_products')
              .select('id') // Only select IDs in this phase
              .eq('location_id', locationId.toString())
              .range(idOffset, idOffset + idBatchSize - 1)
              .timeout(const Duration(seconds: 15));

          if (response.isEmpty) break;

          for (var item in response) {
            fetchedProductIds.add(item['id'].toString());
          }

          idOffset += idBatchSize;

          yield SyncProgress(
            0,
            totalCount,
            [],
            additionalInfo:
                'Found ${fetchedProductIds.length}/$totalCount product IDs',
          );

          await Future.delayed(const Duration(milliseconds: 50));
        } catch (e) {
          _logger.warning('Error fetching product IDs batch: $e');
          // Continue despite errors - we'll handle missing products later
        }
      }

      // Second pass: Sync products in small batches with retries for each individual product
      yield SyncProgress(
        0,
        totalCount,
        [],
        additionalInfo: 'Starting product sync...',
      );

      // Reset for main sync loop
      int offset = 0;
      int retryCount = 0;
      const int maxRetries = 3;

      // Use a smaller batch size for the main sync to reduce chance of errors
      batchSize = 500;

      while (offset < totalCount &&
          !isSyncCancelled &&
          retryCount <= maxRetries) {
        // Check internet connectivity before each batch
        if (!await _isInternetAvailable()) {
          errors.add(
            'Internet connection lost at product ${offset + 1}. Sync paused.',
          );
          yield SyncProgress(processedCount, totalCount, errors);
          return;
        }

        try {
          // Fetch data with timeout
          final response = await _appService.supabaseClient
              .from('location_products')
              .select()
              .eq('location_id', locationId.toString())
              .range(offset, offset + batchSize - 1)
              .timeout(const Duration(seconds: 20));

          if (response.isEmpty) {
            break;
          }

          // Process and save products one by one to ensure each is tracked
          for (var json in response) {
            try {
              // Remove large embedding data to reduce memory usage
              if (json.containsKey('name_embedding')) {
                json.remove('name_embedding');
              }

              final Product product = Product.fromJson(json);
              final String productId = product.id.toString();

              // Save each product individually with retry mechanism
              bool savedSuccessfully = false;
              for (
                int attempt = 0;
                attempt < 3 && !savedSuccessfully;
                attempt++
              ) {
                try {
                  // Use a transaction to ensure atomicity
                  await database.transaction(() async {
                    await database.productsRepository.createOrUpdate(product);
                  });
                  savedSuccessfully = true;
                } catch (saveError) {
                  _logger.warning(
                    'Save attempt $attempt failed for product $productId: $saveError',
                  );
                  await Future.delayed(
                    Duration(milliseconds: 100 * (attempt + 1)),
                  );
                }
              }

              if (savedSuccessfully) {
                processedCount++;
              } else {
                errors.add(
                  'Failed to save product $productId after 3 attempts',
                );
              }
            } catch (e) {
              _logger.warning(
                'Failed to process product: ${e.toString().substring(0, 100)}...',
              );
            }
          }

          // Update progress
          yield SyncProgress(
            processedCount,
            totalCount,
            errors,
            additionalInfo: 'Synced $processedCount/$totalCount products',
          );

          offset += batchSize;

          // Reset retry count on successful batch
          retryCount = 0;

          // Small delay between batches
          await Future.delayed(const Duration(milliseconds: 100));
        } catch (apiError) {
          retryCount++;
          _logger.severe('API Error at offset $offset: ${apiError.toString()}');

          final String errorMessage = apiError is TimeoutException
              ? 'Request timed out'
              : apiError.toString().substring(
                  0,
                  min(100, apiError.toString().length),
                );

          errors.add('API Error (Offset $offset): $errorMessage');
          yield SyncProgress(processedCount, totalCount, errors);

          // Wait before retrying
          await Future.delayed(Duration(seconds: retryCount));
        }
      }

      // Third pass: Verify all products were saved and process any that were missed
      if (!isSyncCancelled && fetchedProductIds.isNotEmpty) {
        yield SyncProgress(
          processedCount,
          totalCount,
          errors,
          additionalInfo: 'Verifying all products were synced...',
        );

        // Get IDs of products actually in the database
        final List<String> savedProductIds = await database.productsRepository
            .getAllProductIds();
        final Set<String> savedProductIdSet = Set.from(savedProductIds);

        // Find products that weren't saved
        final Set<String> missingProductIds = fetchedProductIds.difference(
          savedProductIdSet,
        );

        // If there are missing products, fetch and save them individually
        if (missingProductIds.isNotEmpty) {
          yield SyncProgress(
            processedCount,
            totalCount,
            errors,
            additionalInfo:
                'Syncing ${missingProductIds.length} missing products...',
          );

          // Process missing products in small batches
          final List<String> missingProductIdsList = missingProductIds.toList();
          const int recoveryBatchSize = 200;

          for (
            int i = 0;
            i < missingProductIdsList.length;
            i += recoveryBatchSize
          ) {
            if (isSyncCancelled) break;

            final int end = min(
              i + recoveryBatchSize,
              missingProductIdsList.length,
            );
            final List<String> idBatch = missingProductIdsList.sublist(i, end);

            // Fetch each missing product individually for maximum reliability

            try {
              final ids = idBatch;
              final idFilter = ids.map((id) => 'id.eq.$id').join(',');

              final response = await Supabase.instance.client
                  .from('location_products')
                  .select()
                  .or(idFilter)
                  .timeout(const Duration(seconds: 10));
              if (response.isNotEmpty) {
                for (var json in response) {
                  // Remove large embedding data
                  if (json.containsKey('name_embedding')) {
                    json.remove('name_embedding');
                  }

                  final Product product = Product.fromJson(json);

                  // Save with transaction and retry
                  bool savedSuccessfully = false;
                  for (
                    int attempt = 0;
                    attempt < 3 && !savedSuccessfully;
                    attempt++
                  ) {
                    try {
                      await database.transaction(() async {
                        await database.productsRepository.createOrUpdate(
                          product,
                        );
                      });
                      savedSuccessfully = true;
                      processedCount++;
                    } catch (saveError) {
                      await Future.delayed(
                        Duration(milliseconds: 200 * (attempt + 1)),
                      );
                    }
                  }
                }
              }
            } catch (e) {
              _logger.warning('Failed to recover missing product for $idBatch');
            }

            // Update progress periodically
            if (i % 10 == 0 || i == missingProductIdsList.length - 1) {
              yield SyncProgress(
                processedCount,
                totalCount,
                errors,
                additionalInfo:
                    'Recovered ${i + 1}/${missingProductIdsList.length} missing products',
              );
            }

            await Future.delayed(const Duration(milliseconds: 50));
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

      // Clear memory
      fetchedProductIds.clear();

      // Final verification
      final int finalLocalCount = await database.productsRepository
          .getTotalProductsCount("0");

      yield SyncProgress(
        finalLocalCount,
        totalCount,
        errors,
        additionalInfo:
            'Sync completed: $finalLocalCount out of $totalCount products stored locally',
      );
    }
  }
}
