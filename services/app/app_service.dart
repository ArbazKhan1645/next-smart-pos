// ignore_for_file: avoid_print

import 'package:get/get.dart';
import 'package:hse_pos/app/services/internet_connectivity/internet_connectivity_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:file_picker/file_picker.dart';
import 'package:hse_pos/main.dart';
import 'package:hse_pos/app/core/utils/helpers/logger.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hse_pos/app/services/update_service.dart';
import 'package:hse_pos/app/modules/update/update_dialog.dart';

class AppService extends GetxService {
  late final UpdateService _updateService;
  late final SupabaseClient _supabaseClient;
  static AppService get instance => Get.find<AppService>();
  late final InternetConnectivityService _internetConnectivityService;
  late final SharedPreferences _sharedPreferences;
  late final FlutterSecureStorage _secureStorage;

  Future<AppService> init() async {
    await _initializeServices();
    return this;
  }

  Future<void> _initializeServices() async {
    try {
      _internetConnectivityService = await Get.putAsync(
        () => InternetConnectivityService().init(),
      );
      await _initializeSupabase();
      _updateService = Get.put(UpdateService());

      _sharedPreferences = await SharedPreferences.getInstance();
      _secureStorage = const FlutterSecureStorage();
      await _loadEnvFile();
    } catch (e, stackTrace) {
      AppLogger.error("Initialization Error: $e", stackTrace: stackTrace);
    }
  }

  Future<void> _initializeSupabase() async {
    try {
      await Supabase.initialize(
        url: currentEnv.supabaseUrl,
        anonKey: currentEnv.supabaseAnon,
        realtimeClientOptions: const RealtimeClientOptions(
          logLevel: RealtimeLogLevel.info,
        ),
      );
      _supabaseClient = Supabase.instance.client;
    } catch (e, stackTrace) {
      AppLogger.error(
        "Failed to initialize Supabase: $e",
        stackTrace: stackTrace,
      );
    }
  }

  Future<void> _loadEnvFile() async {
    try {
      await dotenv.load(fileName: ".env");
    } catch (e, stackTrace) {
      AppLogger.warning("Failed to load .env file: $e", stackTrace: stackTrace);
    }
  }

  Future<void> checkForUpdates() async {
    try {
      final update = await _updateService.checkForUpdate();
      if (update != null) {
        Get.dialog(UpdateDialog(update: update));
      }
    } catch (e, stack) {
      AppLogger.error("Check for updates failed: $e", stackTrace: stack);
    }
  }

  Future<FilePickerResult?> pickFile({
    FileType type = FileType.any,
    bool allowMultiple = false,
    List<String>? allowedExtensions,
  }) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: type,
        allowMultiple: allowMultiple,
        allowedExtensions: allowedExtensions,
      );
      if (result != null) {
        AppLogger.info("File(s) picked: ${result.paths}");
      } else {
        AppLogger.warning("File picking cancelled by user.");
      }
      return result;
    } catch (e, stackTrace) {
      AppLogger.error("Error picking file: $e", stackTrace: stackTrace);
      return null;
    }
  }

  SharedPreferences get sharedPreferences => _sharedPreferences;
  FlutterSecureStorage get secureStorage => _secureStorage;
  String? getEnv(String key) => dotenv.env[key];
  SupabaseClient get supabaseClient => _supabaseClient;
  InternetConnectivityService get internetConnectivityService =>
      _internetConnectivityService;
}
