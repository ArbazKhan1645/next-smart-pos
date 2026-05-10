// import 'dart:async';
// import 'package:flutter/foundation.dart';
// import 'package:get/get.dart';
// import 'package:hse_pos/app/models/print_models/print_config_model.dart';
// import 'package:hse_pos/app/models/print_models/print_jobs_model.dart';
// import 'package:hse_pos/app/repos/print_jobs_repositry/print_jobs_repository.dart';
// import 'package:hse_pos/app/repos/printers_repository/printers_repository.dart';
// import 'package:hse_pos/app/services/printing/hardware_printing_service.dart';

// // Import your models and services
// // import '../models/print_job_model.dart';
// // import '../models/printer_config_model.dart';
// // import '../repos/print_jobs_repository.dart';
// // import '../repos/printers_repository.dart';
// // import 'hardware_printer_service.dart';
// // import 'print_job_queue_service.dart';
// // import 'receipt_generator_service.dart';

// /// Main Printing Service - Orchestrates all printing functionality
// /// Use this service as the main entry point for all printing operations
// class PrintingService extends GetxService {
//   static PrintingService get to => Get.find();

//   // ============================================================================
//   // Dependencies
//   // ============================================================================

//   late final HardwarePrinterService _hardwarePrinterService;
//   late final PrintJobQueueService _printJobQueueService;
//   late final ReceiptGeneratorService _receiptGeneratorService;
//   late final PrintersRepository _printersRepository;
//   late final PrintJobsRepository _printJobsRepository;

//   // Categories repository for getting printer assignments
//   // late final CategoriesRepository _categoriesRepository;

//   // ============================================================================
//   // State
//   // ============================================================================

//   final RxBool _isInitialized = false.obs;
//   final RxString _lastError = ''.obs;

//   // ============================================================================
//   // Getters
//   // ============================================================================

//   bool get isInitialized => _isInitialized.value;
//   String get lastError => _lastError.value;

//   HardwarePrinterService get hardwarePrinters => _hardwarePrinterService;
//   PrintJobQueueService get printQueue => _printJobQueueService;

//   // ============================================================================
//   // Lifecycle
//   // ============================================================================

//   Future<PrintingService> init({
//     required PrintersRepository printersRepository,
//     required PrintJobsRepository printJobsRepository,
//     // required CategoriesRepository categoriesRepository,
//   }) async {
//     try {
//       _printersRepository = printersRepository;
//       _printJobsRepository = printJobsRepository;
//       // _categoriesRepository = categoriesRepository;

//       // Initialize hardware printer service
//       _hardwarePrinterService = await Get.putAsync<HardwarePrinterService>(
//         () => HardwarePrinterService().init(),
//       );

//       // Initialize receipt generator service
//       _receiptGeneratorService = await Get.putAsync<ReceiptGeneratorService>(
//         () => ReceiptGeneratorService().init(),
//       );

//       // Initialize print job queue service
//       _printJobQueueService = await Get.putAsync<PrintJobQueueService>(
//         () => PrintJobQueueService().init(
//           printJobsRepository: _printJobsRepository,
//           printersRepository: _printersRepository,
//           hardwarePrinterService: _hardwarePrinterService,
//           receiptGeneratorService: _receiptGeneratorService,
//         ),
//       );

//       // Initialize default printers if needed
//       await _printersRepository.initializeDefaultPrinters();

//       _isInitialized.value = true;
//       debugPrint('PrintingService initialized successfully');
//       return this;
//     } catch (e) {
//       _lastError.value = 'Initialization failed: $e';
//       debugPrint('PrintingService initialization error: $e');
//       rethrow;
//     }
//   }

//   // ============================================================================
//   // Order Printing (Main Entry Point)
//   // ============================================================================

//   /// Print all required documents for a completed order
//   /// This is the main method to call when an order is completed
//   Future<PrintResult> printOrder({
//     required String orderUuid,
//     required String orderNumber,
//     required List<Map<String, dynamic>> products,
//     required String serviceType,
//     Map<String, dynamic>? customerData,
//     Map<String, dynamic>? locationData,
//     Map<String, dynamic>? paymentData,
//     double? total,
//     double? discount,
//     double? tax,
//     PrintJobPriority priority = PrintJobPriority.normal,
//   }) async {
//     if (!_isInitialized.value) {
//       return PrintResult.failure('Printing service not initialized');
//     }

//     try {
//       final jobs = await _printJobQueueService.createPrintJobsForOrder(
//         orderUuid: orderUuid,
//         orderNumber: orderNumber,
//         products: products,
//         serviceType: serviceType,
//         customerData: customerData,
//         locationData: locationData,
//         paymentData: paymentData,
//         total: total,
//         discount: discount,
//         tax: tax,
//         priority: priority,
//       );

//       return PrintResult.success(
//         message: 'Created ${jobs.length} print jobs',
//         jobIds: jobs.map((j) => j.uuid).toList(),
//       );
//     } catch (e) {
//       _lastError.value = 'Print order failed: $e';
//       debugPrint('Print order error: $e');
//       return PrintResult.failure(e.toString());
//     }
//   }

//   /// Print a receipt for an order
//   Future<PrintResult> printReceipt({
//     required String orderUuid,
//     required String orderNumber,
//     required List<Map<String, dynamic>> products,
//     String serviceType = 'in_store',
//     Map<String, dynamic>? customerData,
//     Map<String, dynamic>? locationData,
//     Map<String, dynamic>? paymentData,
//     double? total,
//     double? discount,
//     double? tax,
//     String? printerUuid,
//   }) async {
//     if (!_isInitialized.value) {
//       return PrintResult.failure('Printing service not initialized');
//     }

//     try {
//       // Get receipt printer
//       PrinterConfigModel? printer;
//       if (printerUuid != null) {
//         printer = await _printersRepository.getPrinterByUuid(printerUuid);
//       } else {
//         printer =
//             await _printersRepository.getDefaultPrinter(PrinterType.receipt);
//       }

//       if (printer == null) {
//         return PrintResult.failure('No receipt printer configured');
//       }

//       final jobData = PrintJobData(
//         orderUuid: orderUuid,
//         orderNumber: orderNumber,
//         serviceType: serviceType,
//         orderDate: DateTime.now(),
//         products: products,
//         customerUuid: customerData?['uuid'] as String?,
//         customerName:
//             '${customerData?['first_name'] ?? ''} ${customerData?['last_name'] ?? ''}'
//                 .trim(),
//         businessName: locationData?['business_name'] as String?,
//         businessAddress: locationData?['street_address'] as String?,
//         businessPhone: locationData?['telephone_number'] as String?,
//         businessEmail: locationData?['email'] as String?,
//         vatNumber: locationData?['vat_number'] as String?,
//         total: total,
//         discount: discount,
//         tax: tax,
//         paymentMethod: paymentData?['method'] as String?,
//         amountPaid: paymentData?['amount'] as double?,
//         change: paymentData?['change'] as double?,
//       );

//       final job = await _printJobQueueService.createPrintJob(
//         printerUuid: printer.uuid,
//         jobType: PrintJobType.receipt,
//         printData: jobData,
//         orderUuid: orderUuid,
//         orderNumber: orderNumber,
//         priority: PrintJobPriority.high,
//       );

//       return PrintResult.success(
//         message: 'Receipt print job created',
//         jobIds: [job.uuid],
//       );
//     } catch (e) {
//       _lastError.value = 'Print receipt failed: $e';
//       return PrintResult.failure(e.toString());
//     }
//   }

//   /// Print kitchen tickets for an order
//   Future<PrintResult> printKitchenTickets({
//     required String orderUuid,
//     required String orderNumber,
//     required List<Map<String, dynamic>> products,
//     String serviceType = 'in_store',
//     PrintJobPriority priority = PrintJobPriority.high,
//   }) async {
//     if (!_isInitialized.value) {
//       return PrintResult.failure('Printing service not initialized');
//     }

//     try {
//       final createdJobs = <String>[];

//       // Group products by category
//       final productsByCategory = _groupProductsByCategory(products);

//       for (final entry in productsByCategory.entries) {
//         final categoryUuid = entry.key;
//         final categoryProducts = entry.value;

//         // Get printers for this category from category settings
//         final printers = await _getPrintersForCategory(categoryUuid);

//         for (final printer in printers) {
//           if (printer.printerType != PrinterType.kitchen) continue;

//           final jobData = PrintJobData(
//             orderUuid: orderUuid,
//             orderNumber: orderNumber,
//             serviceType: serviceType,
//             orderDate: DateTime.now(),
//             products: categoryProducts,
//             categoryUuid: categoryUuid,
//             categoryName: categoryProducts.first['category_name'] as String?,
//           );

//           final job = await _printJobQueueService.createPrintJob(
//             printerUuid: printer.uuid,
//             jobType: PrintJobType.kitchenTicket,
//             printData: jobData,
//             orderUuid: orderUuid,
//             orderNumber: orderNumber,
//             priority: priority,
//           );

//           createdJobs.add(job.uuid);
//         }
//       }

//       if (createdJobs.isEmpty) {
//         return PrintResult.failure('No kitchen printers configured for products');
//       }

//       return PrintResult.success(
//         message: 'Created ${createdJobs.length} kitchen ticket jobs',
//         jobIds: createdJobs,
//       );
//     } catch (e) {
//       _lastError.value = 'Print kitchen tickets failed: $e';
//       return PrintResult.failure(e.toString());
//     }
//   }

//   /// Print a product label
//   Future<PrintResult> printLabel({
//     required Map<String, dynamic> product,
//     int copies = 1,
//     String? printerUuid,
//   }) async {
//     if (!_isInitialized.value) {
//       return PrintResult.failure('Printing service not initialized');
//     }

//     try {
//       PrinterConfigModel? printer;
//       if (printerUuid != null) {
//         printer = await _printersRepository.getPrinterByUuid(printerUuid);
//       } else {
//         printer =
//             await _printersRepository.getDefaultPrinter(PrinterType.label);
//       }

//       if (printer == null) {
//         return PrintResult.failure('No label printer configured');
//       }

//       final jobData = PrintJobData(
//         products: List.generate(copies, (_) => product),
//       );

//       final job = await _printJobQueueService.createPrintJob(
//         printerUuid: printer.uuid,
//         jobType: PrintJobType.label,
//         printData: jobData,
//         priority: PrintJobPriority.normal,
//       );

//       return PrintResult.success(
//         message: 'Label print job created',
//         jobIds: [job.uuid],
//       );
//     } catch (e) {
//       _lastError.value = 'Print label failed: $e';
//       return PrintResult.failure(e.toString());
//     }
//   }

//   /// Print a test page
//   Future<PrintResult> printTestPage(String printerUuid) async {
//     if (!_isInitialized.value) {
//       return PrintResult.failure('Printing service not initialized');
//     }

//     try {
//       final job = await _printJobQueueService.createTestPrintJob(printerUuid);
//       return PrintResult.success(
//         message: 'Test print job created',
//         jobIds: [job.uuid],
//       );
//     } catch (e) {
//       _lastError.value = 'Test print failed: $e';
//       return PrintResult.failure(e.toString());
//     }
//   }

//   // ============================================================================
//   // Queue Management
//   // ============================================================================

//   /// Get current queue status
//   Map<String, dynamic> getQueueStatus() {
//     return _printJobQueueService.getStatistics();
//   }

//   /// Cancel a print job
//   Future<bool> cancelJob(String jobUuid) {
//     return _printJobQueueService.cancelJob(jobUuid);
//   }

//   /// Retry a failed job
//   Future<bool> retryJob(String jobUuid) {
//     return _printJobQueueService.retryJob(jobUuid);
//   }

//   /// Retry all failed jobs
//   Future<int> retryAllFailedJobs() {
//     return _printJobQueueService.retryAllFailedJobs();
//   }

//   /// Pause printing
//   void pausePrinting() {
//     _printJobQueueService.pauseProcessing();
//   }

//   /// Resume printing
//   void resumePrinting() {
//     _printJobQueueService.resumeProcessing();
//   }

//   /// Clear all pending jobs
//   Future<void> clearQueue() {
//     return _printJobQueueService.clearQueue();
//   }

//   // ============================================================================
//   // Printer Management
//   // ============================================================================

//   /// Refresh hardware printers
//   Future<void> refreshPrinters() {
//     return _hardwarePrinterService.refreshPrinters();
//   }

//   /// Get all configured printers
//   Future<List<PrinterConfigModel>> getConfiguredPrinters() {
//     return _printersRepository.getAllPrinters();
//   }

//   /// Get configured printers by type
//   Future<List<PrinterConfigModel>> getPrintersByType(PrinterType type) {
//     return _printersRepository.getPrintersByType(type);
//   }

//   /// Create a new printer configuration
//   Future<PrinterConfigModel> createPrinter(PrinterConfigModel printer) {
//     return _printersRepository.createPrinter(printer);
//   }

//   /// Update a printer configuration
//   Future<bool> updatePrinter(PrinterConfigModel printer) {
//     return _printersRepository.updatePrinter(printer);
//   }

//   /// Delete a printer configuration
//   Future<bool> deletePrinter(String uuid) {
//     return _printersRepository.deletePrinter(uuid);
//   }

//   /// Set default printer for a type
//   Future<void> setDefaultPrinter(String uuid) {
//     return _printersRepository.setAsDefault(uuid);
//   }

//   // ============================================================================
//   // Event Streaming
//   // ============================================================================

//   /// Stream of print queue events
//   Stream<PrintQueueEvent> get printEvents => _printJobQueueService.eventStream;

//   // ============================================================================
//   // Helper Methods
//   // ============================================================================

//   Map<String, List<Map<String, dynamic>>> _groupProductsByCategory(
//     List<Map<String, dynamic>> products,
//   ) {
//     final grouped = <String, List<Map<String, dynamic>>>{};

//     for (final product in products) {
//       final categoryUuid = product['category_uuid'] as String? ?? 'unknown';
//       grouped.putIfAbsent(categoryUuid, () => []);
//       grouped[categoryUuid]!.add(product);
//     }

//     return grouped;
//   }

//   Future<List<PrinterConfigModel>> _getPrintersForCategory(
//     String categoryUuid,
//   ) async {
//     // TODO: Implement category->printer mapping query
//     // This should query the categories table to get the printers array
//     // For now, return all kitchen printers
//     return _printersRepository.getEnabledPrintersByType(PrinterType.kitchen);
//   }
// }

// // ============================================================================
// // Print Result Class
// // ============================================================================

// class PrintResult {
//   final bool success;
//   final String message;
//   final List<String> jobIds;
//   final String? errorCode;

//   PrintResult._({
//     required this.success,
//     required this.message,
//     this.jobIds = const [],
//     this.errorCode,
//   });

//   factory PrintResult.success({
//     required String message,
//     List<String> jobIds = const [],
//   }) {
//     return PrintResult._(
//       success: true,
//       message: message,
//       jobIds: jobIds,
//     );
//   }

//   factory PrintResult.failure(String message, {String? errorCode}) {
//     return PrintResult._(
//       success: false,
//       message: message,
//       errorCode: errorCode,
//     );
//   }

//   @override
//   String toString() {
//     return 'PrintResult(success: $success, message: $message, jobs: ${jobIds.length})';
//   }
// }