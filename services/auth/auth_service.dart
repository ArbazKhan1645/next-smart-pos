// ignore_for_file: unused_field, avoid_print

import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/core/utils/helpers/encrypt.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/terminal_models/terminal_model.dart';
import 'package:uuid/uuid.dart';
import 'package:hse_pos/app/models/country_model/country_model.dart';
import 'package:hse_pos/app/models/location_model/location_model.dart';
import 'package:hse_pos/app/models/merchant_model/merchant_model.dart';
import 'package:hse_pos/app/services/app/app_service.dart';
import 'package:rxdart/rxdart.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService extends GetxService {
  static AuthService get instance => Get.find<AuthService>();
  late final AppService _appService;
  late final BehaviorSubject<MerchantModel?> _authMerchantBehaviorSubject;
  late final BehaviorSubject<LocationModel?> _selectedLocationBehaviorSubject;
  late final BehaviorSubject<CountryModel?>
  _selectedLocationCountryBehaviorSubject;
  late final BehaviorSubject<TerminalModel?> _selectedTerminalBehaviorSubject;
  late final BehaviorSubject<SaleChannels?> _activeSaleChannelFound;
  late final BehaviorSubject<String?> _selectedThemeRouteBehaviorSubject;
  late final BehaviorSubject<bool> _isLoadingBehaviorSubject;
  late final BehaviorSubject<String?> _errorBehaviorSubject;
  late final BehaviorSubject<List<ConnectivityResult>>
  _connectivityBehaviorSubject;
  final List<StreamSubscription> _subscriptions = [];
  final SupabaseClient _supabaseClient = Supabase.instance.client;

  BehaviorSubject<MerchantModel?> get authMerchantBehaviorSubject =>
      _authMerchantBehaviorSubject;
  BehaviorSubject<LocationModel?> get selectedLocationBehaviorSubject =>
      _selectedLocationBehaviorSubject;
  BehaviorSubject<CountryModel?> get selectedLocationCountryBehaviorSubject =>
      _selectedLocationCountryBehaviorSubject;
  BehaviorSubject<TerminalModel?> get selectedTerminalBehaviorSubject =>
      _selectedTerminalBehaviorSubject;
  BehaviorSubject<SaleChannels?> get activeSaleChannelFound =>
      _activeSaleChannelFound;
  BehaviorSubject<String?> get selectedThemeRouteBehaviorSubject =>
      _selectedThemeRouteBehaviorSubject;
  BehaviorSubject<bool> get isLoadingBehaviorSubject =>
      _isLoadingBehaviorSubject;
  BehaviorSubject<String?> get errorBehaviorSubject => _errorBehaviorSubject;
  BehaviorSubject<List<ConnectivityResult>> get connectivityBehaviorSubject =>
      _connectivityBehaviorSubject;

  Future<AuthService> init(AppService appService) async {
    _appService = appService;
    _authMerchantBehaviorSubject = BehaviorSubject<MerchantModel?>.seeded(null);
    _selectedLocationBehaviorSubject = BehaviorSubject<LocationModel?>.seeded(
      null,
    );
    _selectedLocationCountryBehaviorSubject =
        BehaviorSubject<CountryModel?>.seeded(null);
    _selectedTerminalBehaviorSubject = BehaviorSubject<TerminalModel?>.seeded(
      null,
    );
    _activeSaleChannelFound = BehaviorSubject<SaleChannels?>.seeded(null);
    _selectedThemeRouteBehaviorSubject = BehaviorSubject<String?>.seeded(null);
    _isLoadingBehaviorSubject = BehaviorSubject<bool>.seeded(false);
    _errorBehaviorSubject = BehaviorSubject<String?>.seeded(null);
    _connectivityBehaviorSubject =
        BehaviorSubject<List<ConnectivityResult>>.seeded([
          ConnectivityResult.none,
        ]);

    // Monitor connectivity changes
    _subscriptions.add(
      Connectivity().onConnectivityChanged.listen((
        List<ConnectivityResult> results,
      ) {
        _connectivityBehaviorSubject.add(results);
        if (results.contains(ConnectivityResult.none)) {
          _errorBehaviorSubject.add('No internet connection');
        } else {
          _errorBehaviorSubject.add(null);
        }
      }),
    );

    final connectivityResult = await Connectivity().checkConnectivity();
    _connectivityBehaviorSubject.add(connectivityResult);
    await _loadCachedData();
    return this;
  }

  Future<void> _loadCachedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      // Check if user is authenticated
      if (_supabaseClient.auth.currentUser != null) {
        // Load and decrypt merchant data
        final merchantJson = prefs.getString('merchant_data');
        if (merchantJson != null) {
          final decrypted = EncryptionHelper.decryptText(merchantJson);
          final merchantData = MerchantModel.fromJson(jsonDecode(decrypted));
          _authMerchantBehaviorSubject.add(merchantData);
        }

        // Load and decrypt location data
        final locationJson = prefs.getString('location_data');
        if (locationJson != null) {
          final decrypted = EncryptionHelper.decryptText(locationJson);
          final locationData = LocationModel.fromJson(jsonDecode(decrypted));
          _selectedLocationBehaviorSubject.add(locationData);
        }

        // Load and decrypt country data
        final countryJson = prefs.getString('country_data');
        if (countryJson != null) {
          final decrypted = EncryptionHelper.decryptText(countryJson);
          final countryData = CountryModel.fromJson(jsonDecode(decrypted));
          _selectedLocationCountryBehaviorSubject.add(countryData);
        }

        // Load and decrypt terminal data
        final terminalJson = prefs.getString('terminal_data');
        if (terminalJson != null) {
          final decrypted = EncryptionHelper.decryptText(terminalJson);
          final terminalData = TerminalModel.fromJson(jsonDecode(decrypted));
          _selectedTerminalBehaviorSubject.add(terminalData);
        }

        // Load and decrypt sale channel data
        final saleChannelJson = prefs.getString('sale_channel_data');
        if (saleChannelJson != null) {
          final decrypted = EncryptionHelper.decryptText(saleChannelJson);
          final saleChannelData = SaleChannels.fromJson(jsonDecode(decrypted));
          _activeSaleChannelFound.add(saleChannelData);
        }

        // Load and decrypt theme route data
        final themeRouteJson = prefs.getString('theme_route_data');
        if (themeRouteJson != null) {
          final decrypted = EncryptionHelper.decryptText(themeRouteJson);
          _selectedThemeRouteBehaviorSubject.add(decrypted);
        }
      }
    } catch (e) {
      _errorBehaviorSubject.add('Failed to load cached data: ${e.toString()}');
    }
  }

  Future<void> _saveCachedData() async {
    try {
      final prefs = await SharedPreferences.getInstance();

      if (_authMerchantBehaviorSubject.value != null) {
        final json = jsonEncode(_authMerchantBehaviorSubject.value!.toJson());
        await prefs.setString(
          'merchant_data',
          EncryptionHelper.encryptText(json),
        );
      }

      if (_selectedLocationBehaviorSubject.value != null) {
        final json = jsonEncode(
          _selectedLocationBehaviorSubject.value!.toJson(),
        );
        await prefs.setString(
          'location_data',
          EncryptionHelper.encryptText(json),
        );
      }

      if (_selectedLocationCountryBehaviorSubject.value != null) {
        final json = jsonEncode(
          _selectedLocationCountryBehaviorSubject.value!.toJson(),
        );
        await prefs.setString(
          'country_data',
          EncryptionHelper.encryptText(json),
        );
      }

      if (_selectedTerminalBehaviorSubject.value != null) {
        final json = jsonEncode(
          _selectedTerminalBehaviorSubject.value!.toJson(),
        );
        await prefs.setString(
          'terminal_data',
          EncryptionHelper.encryptText(json),
        );
      }

      if (_activeSaleChannelFound.value != null) {
        final json = jsonEncode(_activeSaleChannelFound.value!.toJson());
        await prefs.setString(
          'sale_channel_data',
          EncryptionHelper.encryptText(json),
        );
      }

      if (_selectedThemeRouteBehaviorSubject.value != null) {
        final raw = _selectedThemeRouteBehaviorSubject.value!;
        await prefs.setString(
          'theme_route_data',
          EncryptionHelper.encryptText(raw),
        );
      }
    } catch (e) {
      _errorBehaviorSubject.add('Failed to save cached data');
    }
  }

  Future<bool> signIn(String email, String password) async {
    if (_connectivityBehaviorSubject.value.contains(ConnectivityResult.none)) {
      _errorBehaviorSubject.add('No internet connection');
      return false;
    }

    try {
      _isLoadingBehaviorSubject.add(true);
      _errorBehaviorSubject.add(null);

      // Authenticate with Supabase
      final response = await _supabaseClient.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user == null) {
        _errorBehaviorSubject.add('Authentication failed');
        return false;
      }

      // Fetch merchant data
      final merchantData = await _fetchMerchantData(response.user!.email!);
      if (merchantData == null) {
        _errorBehaviorSubject.add('Failed to fetch merchant data');
        return false;
      }

      _authMerchantBehaviorSubject.add(merchantData);
      await _saveCachedData();
      return true;
    } catch (e) {
      _errorBehaviorSubject.add('Sign in failed: ${e.toString()}');
      return false;
    } finally {
      _isLoadingBehaviorSubject.add(false);
    }
  }

  Future<MerchantModel?> _fetchMerchantData(String email) async {
    try {
      final response =
          await _supabaseClient
              .from('merchants')
              .select()
              .eq('email', email)
              .single();

      return MerchantModel.fromJson(response);
    } catch (e) {
      _errorBehaviorSubject.add(
        'Failed to fetch merchant data: ${e.toString()}',
      );
      return null;
    }
  }

  Future<List<LocationModel>> fetchLocations() async {
    if (_connectivityBehaviorSubject.value.contains(ConnectivityResult.none)) {
      _errorBehaviorSubject.add('No internet connection');
      return [];
    }

    if (_authMerchantBehaviorSubject.value == null) {
      _errorBehaviorSubject.add('Merchant data not available');
      return [];
    }

    try {
      _isLoadingBehaviorSubject.add(true);
      _errorBehaviorSubject.add(null);

      final response = await _supabaseClient
          .from('locations')
          .select()
          .eq('merchant_id', _authMerchantBehaviorSubject.value!.id.toString());

      return (response as List)
          .map((item) => LocationModel.fromJson(item))
          .toList();
    } catch (e) {
      _errorBehaviorSubject.add('Failed to fetch locations: ${e.toString()}');
      return [];
    } finally {
      _isLoadingBehaviorSubject.add(false);
    }
  }

  Future<List<TerminalModel>> fetchTerminals() async {
    if (_connectivityBehaviorSubject.value.contains(ConnectivityResult.none)) {
      _errorBehaviorSubject.add('No internet connection');
      return [];
    }

    if (_selectedLocationBehaviorSubject.value == null) {
      _errorBehaviorSubject.add('Location not selected');
      return [];
    }

    try {
      _isLoadingBehaviorSubject.add(true);
      _errorBehaviorSubject.add(null);

      final response = await _supabaseClient
          .from('terminals')
          .select()
          .eq(
            'location_id',
            _selectedLocationBehaviorSubject.value!.id.toString(),
          );

      return (response as List)
          .map((item) => TerminalModel.fromJson(item))
          .where((terminal) => terminal.terminal_status_table_id == 1)
          .toList();
    } catch (e) {
      _errorBehaviorSubject.add('Failed to fetch terminals: ${e.toString()}');
      return [];
    } finally {
      _isLoadingBehaviorSubject.add(false);
    }
  }

  Future<List<SaleChannels>> fetchSaleChannels() async {
    if (_connectivityBehaviorSubject.value.contains(ConnectivityResult.none)) {
      _errorBehaviorSubject.add('No internet connection');
      return [];
    }

    try {
      _isLoadingBehaviorSubject.add(true);
      _errorBehaviorSubject.add(null);

      final response = await _supabaseClient.from('sale_channels').select();
      final activeresponse = await fetchActiveSaleChannels();
      if (activeresponse != 'Success') {
        _errorBehaviorSubject.add(activeresponse);
        return [];
      } else {
        return (response as List)
            .map((item) => SaleChannels.fromJson(item))
            .toList();
      }
    } catch (e) {
      _errorBehaviorSubject.add('Failed to fetch terminals: ${e.toString()}');
      return [];
    } finally {
      _isLoadingBehaviorSubject.add(false);
    }
  }

  Future<String?> activeSaleChannel(
    SaleChannels saleChannels, {
    bool dialogOpen = true,
  }) async {
    if (dialogOpen) {
      // Show confirmation dialog
      final confirmed = await Get.dialog<bool>(
        AlertDialog(
          title: const Text('Active Sale Channel'),
          content: const Text('Are you sure you want to activate Sale Channel?'),
          actions: [
            TextButton(
              onPressed: () => Get.back(result: false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Get.back(result: true),
              child: const Text('Confirm'),
            ),
          ],
        ),
      );

      if (confirmed != true) {
        return null;
      }
    }
    if (_selectedLocationBehaviorSubject.value == null) {
      return 'Location not selected';
    }
    const uuid = Uuid();
    final Map<String, dynamic> mapData = {
      'uuid': uuid.v4(),
      'created_at': DateTime.now().toIso8601String(),
      'version': 1,
      'location_id': _selectedLocationBehaviorSubject.value!.id.toString(),
      'sale_channel_id': saleChannels.id,
      'name': saleChannels.name,
      'is_active': true,
    };
    try {
      final response =
          await _supabaseClient
              .from('locations_and_sale_channels')
              .insert(mapData)
              .select();

      if (response.isEmpty) {
        return 'Supabase Error: inserting sale channel';
      } else {
        final activeresponse = await fetchActiveSaleChannels();
        return activeresponse; // success
      }
    } catch (e) {
      return 'Unexpected Error: $e'; // unexpected error
    }
  }

  Future<String?> deActiveSaleChannel(SaleChannels saleChannels) async {
    // Show confirmation dialog
    final confirmed = await Get.dialog<bool>(
      AlertDialog(
        title: const Text('De Activate Sale Channel'),
        content: const Text('Are you sure you want to De Activate Sale Channel?'),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return null;
    }

    try {
      final response =
          await _supabaseClient
              .from('locations_and_sale_channels')
              .delete()
              .eq('sale_channel_id', saleChannels.id.toString())
              .select();
      if (response.isEmpty) {
        return 'Supabase Error: de activating sale channel';
      } else {
        final activeresponse = await fetchActiveSaleChannels();
        return activeresponse; // success
      }
    } catch (e) {
      return 'Unexpected Error deactivate sale channel: $e'; // unexpected error
    }
  }

  Future<bool> isSaleChannelActive(int uuid) async {
    try {
      return database.locationsAndSaleChannelsRepository.existsByUuid(uuid);
    } on Exception catch (e) {
      print(e);
      return false;
    }
  }

  Future<String> fetchActiveSaleChannels() async {
    if (_selectedLocationBehaviorSubject.value == null) {
      return 'Location not selected';
    }

    try {
      if (_connectivityBehaviorSubject.value.contains(
        ConnectivityResult.none,
      )) {
        return 'No internet connection';
      }
      final response = await _supabaseClient
          .from('locations_and_sale_channels')
          .select()
          .eq(
            'location_id',
            _selectedLocationBehaviorSubject.value!.id.toString(),
          );

      final List<LocationsAndSaleChannels> locations =
          (response as List)
              .map((item) => LocationsAndSaleChannels.fromJson(item))
              .toList();
      await database.batch((batch) {
        batch.deleteAll(database.locationsAndSaleChannelsTable);
      });

      await database.locationsAndSaleChannelsRepository.createOrUpdateAll(
        locations,
      );
      return 'Success';
    } catch (e) {
      return 'Failed to fetch Active Sale Channels: ${e.toString()}';
    }
  }

  Future<dynamic> createTerminal() async {
    // Ensure _selectedLocationBehaviorSubject is not null
    final selectedLocation = _selectedLocationBehaviorSubject.value;
    if (selectedLocation == null) {
      Get.snackbar('Error', 'Location is not selected.');
      return;
    }

    // Show confirmation dialog
    final confirmed = await Get.dialog<bool>(
      AlertDialog(
        title: const Text('Create Terminal'),
        content: const Text('Are you sure you want to create a new terminal?'),
        actions: [
          TextButton(
            onPressed: () => Get.back(result: false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Get.back(result: true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirmed != true) {
      return false;
    }

    try {
      // Fetch all terminals in the selected location
      final response = await _supabaseClient
          .from('terminals')
          .select('name') // We need names to check for existing terminals
          .eq('location_id', selectedLocation.id.toString());

      // Extract existing terminal names and find the next available number
      final existingTerminals = List<String>.from(
        response.map((t) => t['name'] as String),
      );
      int nextNumber = 1;
      String newTerminalName;

      // Keep incrementing until we find a terminal name that doesn't exist
      do {
        newTerminalName = 'Terminal $nextNumber';
        nextNumber++;
      } while (existingTerminals.contains(newTerminalName));

      // Prepare the new terminal details
      final newTerminalData = {
        'name': newTerminalName,
        'uuid': const Uuid().v4(),
        'created_at': DateTime.now().toIso8601String(),
        'location_id': selectedLocation.id,
        'version': 0,
        'terminal_id': generateRandomTerminalId(),
        'terminal_status_table_id': 1,
      };

      // Insert new terminal into the database
      final insertResponse =
          await _supabaseClient
              .from('terminals')
              .insert(newTerminalData)
              .select();

      // Check if the insertion was successful
      if (insertResponse.isEmpty) {
        Get.snackbar('Error', 'Failed to create terminal.');
      } else {
        Get.snackbar('Success', '$newTerminalName created successfully');
      }
    } catch (e) {
      print('Error creating terminal: $e');
      Get.snackbar('Error', 'Failed to create terminal. Please try again.');
    }
  }

  String generateRandomTerminalId() {
    final random = Random();
    final randomNumber =
        random.nextInt(9000) + 1000; // ensures 4 digits (1000–9999)
    return 'TM-$randomNumber';
  }

  void selectLocation(LocationModel location) {
    _selectedLocationBehaviorSubject.add(location);
    _saveCachedData();
  }

  void selectSaleChannel(SaleChannels location) {
    _activeSaleChannelFound.add(location);

    _saveCachedData();
  }

  void selectThemeRoute(String route) {
    _selectedThemeRouteBehaviorSubject.add(route);
    _saveCachedData();
  }

  void selectTerminal(TerminalModel terminal) {
    _selectedTerminalBehaviorSubject.add(terminal);
    _saveCachedData();
  }

  Future<bool> isFullyActivated() async {
    if (_authMerchantBehaviorSubject.value == null) {
      showErrorSnackbar('Merchant is not authenticated.');
      return false;
    }

    if (_selectedLocationBehaviorSubject.value == null) {
      showErrorSnackbar('No location selected.');
      return false;
    }

    if (_selectedTerminalBehaviorSubject.value == null) {
      showErrorSnackbar('No terminal selected.');
      return false;
    }

    if (_activeSaleChannelFound.value == null) {
      showErrorSnackbar('No sale channel selected.');
      return false;
    }

    if (_selectedThemeRouteBehaviorSubject.value == null) {
      showErrorSnackbar('No theme route selected.');
      return false;
    }

    return true;
  }

  // Example snackbar function (you can modify it)
  void showErrorSnackbar(String message) {
    Get.snackbar(
      'Error',
      message,
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: Colors.red,
      colorText: Colors.white,
    );
  }

  Future<void> signOut() async {
    try {
      await _supabaseClient.auth.signOut();
      _authMerchantBehaviorSubject.add(null);
      _selectedLocationBehaviorSubject.add(null);
      _selectedLocationCountryBehaviorSubject.add(null);
      _selectedTerminalBehaviorSubject.add(null);
      _activeSaleChannelFound.add(null);
      _selectedThemeRouteBehaviorSubject.add(null);

      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      await TestDatabase.clearAllTables(database);
    } catch (e) {
      _errorBehaviorSubject.add('Sign out failed: ${e.toString()}');
    }
  }

  @override
  void onClose() {
    for (var subscription in _subscriptions) {
      subscription.cancel();
    }
    _authMerchantBehaviorSubject.close();
    _selectedLocationBehaviorSubject.close();
    _selectedLocationCountryBehaviorSubject.close();
    _selectedTerminalBehaviorSubject.close();
    _isLoadingBehaviorSubject.close();
    _errorBehaviorSubject.close();
    _connectivityBehaviorSubject.close();
    _activeSaleChannelFound.close();
    _selectedThemeRouteBehaviorSubject.close();
    super.onClose();
  }

  Future<String> foundSaleChannel(int salechannelId) async {
    try {
      if (_connectivityBehaviorSubject.value.contains(
        ConnectivityResult.none,
      )) {
        return 'No internet connection';
      }
      final response = await _supabaseClient
          .from('services')
          .select()
          .eq(
            'location_id',
            _selectedLocationBehaviorSubject.value!.id.toString(),
          )
          .eq('name', 'In Store');

      if (response.isEmpty) {
        return 'Not Found';
      }

      final List<Service> service =
          response.map((item) => Service.fromJson(item)).toList();

      // Filter based on salechannelId
      final found = service.any(
        (element) =>
            element.sale_channels?.any(
              (channel) => channel['id'] == salechannelId,
            ) ??
            false,
      );

      return found ? 'Found' : 'Not Found';
    } catch (e) {
      return 'Exception: ${e.toString()}';
    }
  }

  Future<String> insertSaleChannel(SaleChannels saleChannel) async {
    try {
      if (_connectivityBehaviorSubject.value.contains(
        ConnectivityResult.none,
      )) {
        return 'No internet connection';
      }
      // Insert default display level
      await _appService.supabaseClient.from('display_levels').insert({
        'title': 'Default',
        'location_id': _selectedLocationBehaviorSubject.value!.id.toString(),
      });

      if (_connectivityBehaviorSubject.value.contains(
        ConnectivityResult.none,
      )) {
        return 'No internet connection';
      }

      // Fetch inserted display level
      final displayLevel = await _appService.supabaseClient
          .from('display_levels')
          .select()
          .eq(
            'location_id',
            _selectedLocationBehaviorSubject.value!.id.toString(),
          );

      if (displayLevel.isEmpty) {
        return 'Error: Failed to fetch display level after insert.';
      }

      final List<Map<String, dynamic>> saleChannels = [
        {
          'id': saleChannel.id,
          'name': saleChannel.name,
          'uuid': saleChannel.uuid,
          'localId': null,
        },
      ];
      if (_connectivityBehaviorSubject.value.contains(
        ConnectivityResult.none,
      )) {
        return 'No internet connection';
      }

      // Insert service with sale channel
      final response =
          await _appService.supabaseClient.from('services').insert({
            'name': 'In Store',
            'location_id':
                _selectedLocationBehaviorSubject.value!.id.toString(),
            'service_type_id': 1,
            'icon_data': '0F66F',
            'display_level_uuid': displayLevel[0]['uuid'],
            'sale_channels': saleChannels,
          }).select();

      if (response.isEmpty) {
        return 'Error: Failed to insert service with sale channel.';
      }

      return 'Success';
    } catch (e) {
      return 'Exception: ${e.toString()}';
    }
  }

  // 1. Function to check if any staff exists for the current location
  Future<bool> hasStaffForCurrentLocation() async {
    if (_selectedLocationBehaviorSubject.value == null) {
      _errorBehaviorSubject.add('Location not selected');
      return false;
    }

    try {
      final response = await _supabaseClient
          .from('staffs')
          .select()
          .eq(
            'location_id',
            _selectedLocationBehaviorSubject.value!.id.toString(),
          )
          .limit(1);

      return response.isNotEmpty;
    } catch (e) {
      _errorBehaviorSubject.add('Failed to check staff: ${e.toString()}');
      return false;
    }
  }

  // 2. Function to insert default staff for the current location
  Future<bool> insertDefaultStaffForLocation() async {
    final selectedLocation = _selectedLocationBehaviorSubject.value;
    final merchant = _authMerchantBehaviorSubject.value;

    if (selectedLocation == null) {
      _errorBehaviorSubject.add('❌ Location not selected');
      return false;
    }

    if (merchant == null) {
      _errorBehaviorSubject.add('❌ Merchant not found');
      return false;
    }

    try {
      final authorities = List.generate(28, (index) => (75 + index).toString());

      await _appService.supabaseClient.from('roles').insert({
        'name': 'Admin',
        'location_id': selectedLocation.id,
        'authority_ids': authorities,
      });

      final roles = await _appService.supabaseClient
          .from('roles')
          .select()
          .eq('location_id', selectedLocation.id.toString());

      if (roles.isEmpty || roles[0]['uuid'] == null) {
        _errorBehaviorSubject.add('❌ Failed to fetch created role');
        return false;
      }

      final roleUuid = roles[0]['uuid'];

      print('👤 Inserting Admin staff with role_uuid: $roleUuid');

      final response =
          await _appService.supabaseClient.from('staffs').insert({
            'first_name': 'Admin',
            'last_name': 'Admin',
            'email': 'admin@gmail.com',
            'phone': '0000000',
            'pin': '1111',
            'role_uuid': roleUuid,
            'location_id': selectedLocation.id,
            'is_active': false,
            'merchant_id': merchant.id,
          }).select();

      final success = response.isNotEmpty;
      print(success ? '✅ Admin staff inserted' : '❌ Insert failed');

      return success;
    } catch (e, stack) {
      final message = '❌ Failed to insert staff: ${e.toString()}';
      print(message);
      print(stack);
      _errorBehaviorSubject.add(message);
      return false;
    }
  }

  // 3. Main function that checks and inserts if needed
  Future<void> ensureStaffExistsForLocation() async {
    if (_connectivityBehaviorSubject.value.contains(ConnectivityResult.none)) {
      _errorBehaviorSubject.add('No internet connection');
      return;
    }

    try {
      // First check if staff exists
      final staffExists = await hasStaffForCurrentLocation();

      if (!staffExists) {
        // If no staff exists, insert default staff
        final success = await insertDefaultStaffForLocation();

        if (success) {
          debugPrint('Default staff created successfully');
        } else {
          _errorBehaviorSubject.add('Failed to create default staff');
        }
      } else {
        debugPrint('Staff already exists for this location');
      }
    } catch (e) {
      _errorBehaviorSubject.add('Error ensuring staff exists: ${e.toString()}');
    } finally {
      _isLoadingBehaviorSubject.add(false);
    }
  }
}
