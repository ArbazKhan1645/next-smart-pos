// lib/app/services/printing/hardware_printer_service.dart

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
import 'package:flutter_thermal_printer/utils/printer.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/services/printing/test_receipt.dart';

// Import your files
// import 'package:hse_pos/app/services/printing/sunmi_print.dart';

/// Hardware Printer Service - Manages physical printer discovery and connections
///
/// Responsibilities:
/// - Discover available printers (USB, Bluetooth, Network, Sunmi)
/// - Maintain list of connected printers
/// - Handle printer connection/disconnection events
/// - Provide printer status information
class HardwarePrinterService extends GetxService {
  // Printer lists
  final RxList<Printer> _printers = <Printer>[].obs;
  final RxList<Printer> _usbPrinters = <Printer>[].obs;
  final RxList<Printer> _bluetoothPrinters = <Printer>[].obs;
  final RxList<Printer> _networkPrinters = <Printer>[].obs;

  // State
  final RxBool _isDiscovering = false.obs;
  final RxBool _isSunmiAvailable = false.obs;
  final RxString _status = 'Ready'.obs;
  final Rx<Printer?> _selectedPrinter = Rx<Printer?>(null);

  // Stream subscriptions
  StreamSubscription? _printerStreamSubscription;
  Timer? _discoveryRefreshTimer;

  // Getters
  RxList<Printer> get printers => _printers;
  RxList<Printer> get usbPrinters => _usbPrinters;
  RxList<Printer> get bluetoothPrinters => _bluetoothPrinters;
  RxList<Printer> get networkPrinters => _networkPrinters;
  bool get isDiscovering => _isDiscovering.value;
  bool get isSunmiAvailable => _isSunmiAvailable.value;
  String get status => _status.value;
  Printer? get selectedPrinter => _selectedPrinter.value;

  // Singleton
  static HardwarePrinterService get to => Get.find<HardwarePrinterService>();

  /// Initialize the service
  Future<HardwarePrinterService> init() async {
    debugPrint('🖨️ Initializing HardwarePrinterService...');

    // Check for Sunmi printer
    await _checkSunmiPrinter();

    // Start printer discovery
    await discoverPrinters();

    // Set up auto-refresh
    _startAutoRefresh();

    debugPrint('✅ HardwarePrinterService initialized');
    return this;
  }

  @override
  void onClose() {
    _printerStreamSubscription?.cancel();
    _discoveryRefreshTimer?.cancel();
    super.onClose();
  }

  // ============================================
  // Discovery
  // ============================================

  /// Discover all available printers
  Future<void> discoverPrinters() async {
    if (_isDiscovering.value) {
      debugPrint('⚠️ Discovery already in progress');
      return;
    }

    try {
      _isDiscovering.value = true;
      _status.value = 'Discovering printers...';
      debugPrint('🔍 Starting printer discovery...');

      // Clear existing non-Sunmi printers
      _printers.removeWhere((p) => p.vendorId != 'Sunmi');
      _usbPrinters.clear();
      _bluetoothPrinters.clear();
      _networkPrinters.clear();

      // Discover USB printers
      await _discoverUSBPrinters();

      // Discover Bluetooth printers (if enabled)
      // await _discoverBluetoothPrinters();

      // Discover Network printers (if configured)
      // await _discoverNetworkPrinters();

      _updateStatus();
      debugPrint('✅ Discovery complete. Found ${_printers.length} printers');
    } catch (e) {
      _status.value = 'Discovery error: ${e.toString()}';
      debugPrint('❌ Discovery error: $e');
    } finally {
      _isDiscovering.value = false;
    }
  }

  /// Discover USB connected printers
  Future<void> _discoverUSBPrinters() async {
    try {
      debugPrint('🔌 Discovering USB printers...');

      // Start scanning for USB printers
      await FlutterThermalPrinter.instance.getPrinters(
        connectionTypes: [ConnectionType.USB],
      );

      // Cancel existing subscription
      await _printerStreamSubscription?.cancel();

      // Listen to printer stream
      _printerStreamSubscription = FlutterThermalPrinter.instance.devicesStream
          .listen(
            (List<Printer> discoveredPrinters) {
              _handleDiscoveredPrinters(discoveredPrinters);
            },
            onError: (error) {
              debugPrint('❌ Printer stream error: $error');
            },
          );

      // Wait a bit for printers to be discovered
      await Future.delayed(const Duration(seconds: 2));
    } catch (e) {
      debugPrint('❌ USB discovery error: $e');
    }
  }

  /// Handle discovered printers from stream
  void _handleDiscoveredPrinters(List<Printer> discoveredPrinters) {
    for (final printer in discoveredPrinters) {
      // Skip if already in list
      if (_printers.any((p) => _isSamePrinter(p, printer))) {
        continue;
      }

      // Skip invalid printers
      if (printer.name == null || printer.name!.isEmpty) {
        continue;
      }

      // Add to appropriate list based on connection type
      switch (printer.connectionType) {
        case ConnectionType.USB:
          _usbPrinters.add(printer);
          break;
        case ConnectionType.BLE:
          _bluetoothPrinters.add(printer);
          break;
        case ConnectionType.NETWORK:
          _networkPrinters.add(printer);
          break;
        default:
          break;
      }

      // Add to main list
      _printers.add(printer);
      debugPrint(
        '📥 Found printer: ${printer.name} (${printer.connectionType})',
      );
    }

    _updateStatus();
  }

  /// Check for Sunmi built-in printer
  Future<void> _checkSunmiPrinter() async {
    try {
      debugPrint('🔍 Checking for Sunmi printer...');

      _isSunmiAvailable.value =
          await UnifiedPrinterService.isSunmiPrinterSupported();

      if (_isSunmiAvailable.value) {
        _addSunmiPrinter();
        debugPrint('✅ Sunmi printer detected');
      } else {
        debugPrint('ℹ️ Sunmi printer not available');
      }
    } catch (e) {
      debugPrint('⚠️ Sunmi check error: $e');
      _isSunmiAvailable.value = false;
    }
  }

  /// Add Sunmi printer to the list
  void _addSunmiPrinter() {
    // Check if already added
    if (_printers.any((p) => p.vendorId == 'Sunmi')) {
      return;
    }

    final sunmiPrinter = Printer(
      name: 'Sunmi Built-in Printer',
      address: 'sunmi_internal',
      vendorId: 'Sunmi',
      isConnected: true,
      connectionType: ConnectionType.USB, // Treat as USB for simplicity
    );

    _printers.add(sunmiPrinter);
    debugPrint('📥 Added Sunmi printer');
  }

  // ============================================
  // Printer Selection & Connection
  // ============================================

  /// Select a printer as the current printer
  void selectPrinter(Printer printer) {
    _selectedPrinter.value = printer;
    debugPrint('✅ Selected printer: ${printer.name}');
  }

  /// Clear printer selection
  void clearSelection() {
    _selectedPrinter.value = null;
  }

  /// Find a printer by name (partial match)
  Printer? findPrinterByName(String name) {
    if (name.isEmpty) return null;

    final nameLower = name.toLowerCase();

    // Check for Sunmi
    if (nameLower.contains('sunmi')) {
      return _printers.firstWhereOrNull((p) => p.vendorId == 'Sunmi');
    }

    // Try exact match first
    var printer = _printers.firstWhereOrNull(
      (p) => p.name?.toLowerCase() == nameLower,
    );

    if (printer != null) return printer;

    // Try partial match
    printer = _printers.firstWhereOrNull(
      (p) => p.name?.toLowerCase().contains(nameLower) ?? false,
    );

    return printer;
  }

  /// Find printer by address
  Printer? findPrinterByAddress(String address) {
    if (address.isEmpty) return null;

    return _printers.firstWhereOrNull((p) => p.address == address);
  }

  /// Check if a specific printer is available
  bool isPrinterAvailable(String name) {
    return findPrinterByName(name) != null;
  }

  // ============================================
  // Printer Information
  // ============================================

  /// Get printer status
  Future<PrinterStatus> getPrinterStatus(Printer printer) async {
    try {
      if (printer.vendorId == 'Sunmi') {
        return await _getSunmiStatus();
      }

      // For other printers, check if still in discovered list
      final isAvailable = _printers.any((p) => _isSamePrinter(p, printer));

      if (!isAvailable) {
        return PrinterStatus.disconnected;
      }

      return printer.isConnected == true
          ? PrinterStatus.ready
          : PrinterStatus.disconnected;
    } catch (e) {
      return PrinterStatus.error;
    }
  }

  /// Get Sunmi printer status
  Future<PrinterStatus> _getSunmiStatus() async {
    try {
      final details = await UnifiedPrinterService.getPrinterDetails();

      if (details['error'] != null) {
        return PrinterStatus.error;
      }

      if (details['canInitialize'] == true) {
        return PrinterStatus.ready;
      }

      return PrinterStatus.disconnected;
    } catch (e) {
      return PrinterStatus.error;
    }
  }

  /// Get all printers as a list of printer info
  List<PrinterInfo> getAllPrinterInfo() {
    return _printers.map((p) => PrinterInfo.fromPrinter(p)).toList();
  }

  // ============================================
  // Printing
  // ============================================

  /// Print raw data to a printer
  /// Print raw data to a printer
  Future<bool> printData(Printer printer, List<int> data) async {
    try {
      // 🔍 DEBUG: Print raw bytes info
      debugPrint('═══════════════════════════════════════════════════');
      debugPrint('🖨️ PRINT DEBUG - Printer: ${printer.name}');
      debugPrint('📊 Data length: ${data.length} bytes');
      debugPrint('═══════════════════════════════════════════════════');

      // 🔍 DEBUG: Show raw bytes (hex format)
      debugPrint('📦 Raw Bytes (HEX):');
      final hexString = data
          .map((b) => b.toRadixString(16).padLeft(2, '0'))
          .join(' ');
      // Print in chunks of 48 chars for readability
      for (int i = 0; i < hexString.length; i += 48) {
        final end = (i + 48 < hexString.length) ? i + 48 : hexString.length;
        debugPrint('   ${hexString.substring(i, end)}');
      }

      // 🔍 DEBUG: Try to decode as text (readable parts)
      debugPrint('📝 Decoded Text (readable parts):');
      final textContent = String.fromCharCodes(
        data.where((b) => b >= 32 && b < 127), // printable ASCII only
      );
      debugPrint('   $textContent');

      // 🔍 DEBUG: Show ESC/POS commands
      debugPrint('⚙️ ESC/POS Commands detected:');
      _debugESCPOSCommands(data);

      debugPrint('═══════════════════════════════════════════════════');

      if (printer.vendorId == 'Sunmi') {
        return await _printToSunmi(data);
      }

      await FlutterThermalPrinter.instance.printData(printer, data);
      return true;
    } catch (e) {
      debugPrint('❌ Print error: $e');
      return false;
    }
  }

  /// Debug helper to identify ESC/POS commands
  void _debugESCPOSCommands(List<int> data) {
    for (int i = 0; i < data.length; i++) {
      if (data[i] == 0x1B) {
        // ESC
        if (i + 1 < data.length) {
          final cmd = data[i + 1];
          switch (cmd) {
            case 0x40:
              debugPrint('   [$i] ESC @ - Initialize printer');
              break;
            case 0x61:
              debugPrint('   [$i] ESC a - Alignment: ${data[i + 2]}');
              break;
            case 0x45:
              debugPrint('   [$i] ESC E - Bold: ${data[i + 2]}');
              break;
            case 0x21:
              debugPrint('   [$i] ESC ! - Print mode: ${data[i + 2]}');
              break;
            case 0x64:
              debugPrint('   [$i] ESC d - Feed ${data[i + 2]} lines');
              break;
          }
        }
      } else if (data[i] == 0x1D) {
        // GS
        if (i + 1 < data.length) {
          final cmd = data[i + 1];
          switch (cmd) {
            case 0x56:
              debugPrint('   [$i] GS V - Cut paper');
              break;
            case 0x21:
              debugPrint('   [$i] GS ! - Character size');
              break;
            case 0x6B:
              debugPrint('   [$i] GS k - Print barcode');
              break;
          }
        }
      } else if (data[i] == 0x0A) {
        debugPrint('   [$i] LF - Line feed');
      }
    }
  }

  /// Print to Sunmi printer
  Future<bool> _printToSunmi(List<int> data) async {
    try {
      // Use your Sunmi print implementation
      printSunmiTestReceipt();
      return true;
    } catch (e) {
      debugPrint('❌ Sunmi print error: $e');
      return false;
    }
  }

  /// Print test page
  Future<bool> printTestPage(Printer printer) async {
    try {
      List<int> bytes = [];

      bytes = await createTestReceipt();

      return await printData(printer, bytes);
    } catch (e) {
      debugPrint('❌ Test print error: $e');
      return false;
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  /// Check if two printers are the same
  bool _isSamePrinter(Printer a, Printer b) {
    if (a.address != null && b.address != null) {
      return a.address == b.address;
    }
    return a.name == b.name && a.connectionType == b.connectionType;
  }

  /// Update status message
  void _updateStatus() {
    if (_printers.isEmpty) {
      _status.value = 'No printers found';
    } else {
      _status.value = 'Found ${_printers.length} printer(s)';
    }
  }

  /// Start auto-refresh timer
  void _startAutoRefresh() {
    _discoveryRefreshTimer = Timer.periodic(
      const Duration(minutes: 1),
      (_) => _refreshPrinters(),
    );
  }

  /// Refresh printer list
  Future<void> _refreshPrinters() async {
    if (_isDiscovering.value) return;

    debugPrint('🔄 Auto-refreshing printers...');

    // Check Sunmi availability
    await _checkSunmiPrinter();

    // Refresh USB printers
    await _discoverUSBPrinters();
  }

  /// Manual refresh
  Future<void> refresh() async {
    await discoverPrinters();
  }
}

// ============================================
// Supporting Classes
// ============================================

/// Printer status enum
enum PrinterStatus { ready, disconnected, busy, error, unknown }

/// Printer info for UI display
class PrinterInfo {
  final String name;
  final String? address;
  final String connectionType;
  final bool isConnected;
  final bool isSunmi;

  PrinterInfo({
    required this.name,
    this.address,
    required this.connectionType,
    required this.isConnected,
    required this.isSunmi,
  });

  factory PrinterInfo.fromPrinter(Printer printer) {
    return PrinterInfo(
      name: printer.name ?? 'Unknown',
      address: printer.address,
      connectionType: printer.connectionType?.name ?? 'unknown',
      isConnected: printer.isConnected ?? false,
      isSunmi: printer.vendorId == 'Sunmi',
    );
  }
}

/// Unified Printer Service for Sunmi detection
/// (Move this to its own file in your project)
class UnifiedPrinterService {
  static bool? _isSunmiSupported;

  static Future<bool> isSunmiPrinterSupported() async {
    if (_isSunmiSupported != null) return _isSunmiSupported!;

    try {
      final details = await getPrinterDetails();

      final serialNumber = details['serialNumber'] as String?;
      final printerVersion = details['printerVersion'] as String?;
      final bindResult = details['bindResult'] as bool?;
      final canInitialize = details['canInitialize'] as bool?;

      if (_isNotSunmiDevice(serialNumber, printerVersion)) {
        _isSunmiSupported = false;
        return false;
      }

      if (bindResult != true || canInitialize != true) {
        _isSunmiSupported = false;
        return false;
      }

      _isSunmiSupported = true;
      return true;
    } catch (e) {
      debugPrint('Sunmi detection error: $e');
      _isSunmiSupported = false;
      return false;
    }
  }

  static bool _isNotSunmiDevice(String? serialNumber, String? printerVersion) {
    final invalidValues = ['NOT FOUND', '', 'null', 'undefined', 'unknown'];
    return invalidValues.contains(serialNumber?.toLowerCase()) ||
        invalidValues.contains(printerVersion?.toLowerCase());
  }

  static Future<Map<String, dynamic>> getPrinterDetails() async {
    try {
      // Use your Sunmi printer library
      // final bindResult = await SunmiPrinter.bindingPrinter();
      // final serialNumber = await SunmiPrinter.serialNumber();
      // ...

      return {
        'bindResult': false,
        'serialNumber': 'NOT FOUND',
        'printerVersion': 'NOT FOUND',
        'paperSize': 0,
        'canInitialize': false,
      };
    } catch (e) {
      return {'error': e.toString()};
    }
  }
}
