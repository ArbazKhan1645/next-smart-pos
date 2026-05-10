// lib/app/services/printing/print_job_service.dart

import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
import 'package:flutter_thermal_printer/utils/printer.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/models/category_model/category_model.dart';
import 'package:hse_pos/app/models/ext_orders_model/ext_orders_model.dart';
import 'package:hse_pos/app/models/print_models/print_config_model.dart';
import 'package:hse_pos/app/models/print_models/print_jobs_model.dart';
import 'package:hse_pos/app/repos/categories_reposiotury/categories_repository.dart';
import 'package:hse_pos/app/repos/print_jobs_repositry/print_jobs_repository.dart';
import 'package:hse_pos/app/repos/printers_repository/printers_repository.dart';
import 'package:hse_pos/app/services/printing/hardware_printing_service.dart';
import 'package:uuid/uuid.dart';

class PrintJobEvent {
  final String jobUuid;
  final String orderUuid;
  final PrintJobStatus status;
  final PrintJobType jobType;
  final String? printerName;
  final String? errorMessage;
  final int retryCount;
  final DateTime timestamp;

  PrintJobEvent({
    required this.jobUuid,
    required this.orderUuid,
    required this.status,
    required this.jobType,
    this.printerName,
    this.errorMessage,
    this.retryCount = 0,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  @override
  String toString() {
    return 'PrintJobEvent(job: $jobUuid, order: $orderUuid, status: $status, type: $jobType)';
  }
}

/// ============================================================
/// PRINT JOB SERVICE - Main Orchestration
/// ============================================================
class PrintJobService extends GetxService {
  // Dependencies
  late final PrintJobsRepository _jobsRepository;
  late final PrintersRepository _printersRepository;
  late final CategoriesRepository _categoriesRepository;
  late final HardwarePrinterService _hardwarePrinterService;

  // Queue management
  final Queue<PrintJobModel> _jobQueue = Queue<PrintJobModel>();
  final RxList<PrintJobModel> pendingJobs = <PrintJobModel>[].obs;
  final RxList<PrintJobModel> activeJobs = <PrintJobModel>[].obs;
  final Rx<PrintJobModel?> currentJob = Rx<PrintJobModel?>(null);

  // Processing state
  final RxBool isProcessing = false.obs;
  final RxBool isPaused = false.obs;
  final RxInt processedCount = 0.obs;
  final RxInt failedCount = 0.obs;

  // ============================================================
  // 🔴 STATUS STREAMS - UI MEIN LISTEN KARO
  // ============================================================

  /// Stream for ALL job events (UI mein listen karo)
  final _jobEventController = StreamController<PrintJobEvent>.broadcast();
  Stream<PrintJobEvent> get jobEvents => _jobEventController.stream;

  /// Stream for completed jobs only
  Stream<PrintJobEvent> get completedJobs =>
      jobEvents.where((e) => e.status == PrintJobStatus.completed);

  /// Stream for failed jobs only
  Stream<PrintJobEvent> get failedJobs =>
      jobEvents.where((e) => e.status == PrintJobStatus.failed);

  /// Stream for retrying jobs
  Stream<PrintJobEvent> get retryingJobs =>
      jobEvents.where((e) => e.status == PrintJobStatus.retrying);

  /// Get events for specific order
  Stream<PrintJobEvent> getOrderEvents(String orderUuid) =>
      jobEvents.where((e) => e.orderUuid == orderUuid);

  // Configuration
  static const int maxConcurrentJobs = 1;
  static const int maxRetries = 3;
  static const Duration retryDelay = Duration(seconds: 2);
  static const Duration processingTimeout = Duration(seconds: 30);

  // Timers
  Timer? _queueProcessorTimer;
  StreamSubscription? _pendingJobsSubscription;

  // Singleton
  static PrintJobService get to => Get.find<PrintJobService>();

  /// Initialize the service
  Future<PrintJobService> init({
    required PrintJobsRepository jobsRepository,
    required PrintersRepository printersRepository,
    required CategoriesRepository categoriesRepository,
    required HardwarePrinterService hardwarePrinterService,
  }) async {
    _jobsRepository = jobsRepository;
    _printersRepository = printersRepository;
    _categoriesRepository = categoriesRepository;
    _hardwarePrinterService = hardwarePrinterService;

    await _loadPendingJobs();
    _startQueueProcessor();
    _watchPendingJobs();

    debugPrint('✅ PrintJobService initialized');
    return this;
  }

  @override
  void onClose() {
    _queueProcessorTimer?.cancel();
    _pendingJobsSubscription?.cancel();
    _jobEventController.close();
    super.onClose();
  }

  // ============================================================
  // PUBLIC API - Job Creation
  // ============================================================

  /// Create print jobs for a completed order
  Future<List<PrintJobModel>> createJobsForOrder(ExtOrdersModel order) async {
    final List<PrintJobModel> createdJobs = [];
    const uuid = Uuid();

    try {
      debugPrint('📝 Creating print jobs for order: ${order.order_number}');

      // 1. Receipt job (customer receipt)
      final receiptJob = await _createReceiptJob(order, uuid);
      if (receiptJob != null) {
        createdJobs.add(receiptJob);
      }

      // 2. Kitchen jobs (based on product categories)
      final kitchenJobs = await _createKitchenJobs(order, uuid);
      createdJobs.addAll(kitchenJobs);

      // 3. Invoice job (if delivery)
      if (_shouldCreateInvoice(order)) {
        final invoiceJob = await _createInvoiceJob(order, uuid);
        if (invoiceJob != null) {
          createdJobs.add(invoiceJob);
        }
      }

      // Save to database & add to queue
      if (createdJobs.isNotEmpty) {
        await _jobsRepository.insertJobs(createdJobs);

        for (final job in createdJobs) {
          _addToQueue(job);

          // 🔴 EMIT EVENT - Job created
          _emitJobEvent(job, PrintJobStatus.pending);
        }
      }

      debugPrint('✅ Created ${createdJobs.length} print jobs');
      return createdJobs;
    } catch (e) {
      debugPrint('❌ Error creating print jobs: $e');
      rethrow;
    }
  }

  // ============================================================
  // QUEUE PROCESSING
  // ============================================================

  void _startQueueProcessor() {
    _queueProcessorTimer = Timer.periodic(
      const Duration(milliseconds: 500),
      (_) => _processQueue(),
    );
  }

  Future<void> _processQueue() async {
    if (isPaused.value || isProcessing.value || _jobQueue.isEmpty) {
      return;
    }

    isProcessing.value = true;

    try {
      final job = _jobQueue.removeFirst();
      currentJob.value = job;
      activeJobs.add(job);

      // Update status to processing
      await _jobsRepository.markAsProcessing(job.uuid);

      // 🔴 EMIT EVENT - Processing started
      _emitJobEvent(job, PrintJobStatus.processing);

      // Process the job
      final success = await _processJob(job);

      if (success) {
        await _jobsRepository.markAsCompleted(job.uuid);
        processedCount.value++;

        // 🔴 EMIT EVENT - Completed
        _emitJobEvent(job, PrintJobStatus.completed);

        debugPrint('✅ Job completed: ${job.uuid}');
      } else {
        await _handleJobFailure(job, 'Print operation failed');
      }

      activeJobs.remove(job);
      pendingJobs.remove(job);
    } catch (e) {
      debugPrint('❌ Queue processing error: $e');
      if (currentJob.value != null) {
        await _handleJobFailure(currentJob.value!, e.toString());
        activeJobs.remove(currentJob.value);
      }
    } finally {
      currentJob.value = null;
      isProcessing.value = false;
    }
  }

  // ============================================================
  // 🔴 RETRY LOGIC - YAHAN RETRY HOTA HAI
  // ============================================================

  Future<void> _handleJobFailure(PrintJobModel job, String error) async {
    if (job.retryCount < job.maxRetries) {
      // ─────────────────────────────────────────────────
      // RETRY SCHEDULE KARO
      // ─────────────────────────────────────────────────
      await _jobsRepository.markForRetry(job.uuid, error);

      final updatedJob = job.copyWith(
        status: PrintJobStatus.retrying,
        retryCount: job.retryCount + 1,
        errorMessage: error,
      );

      // 🔴 EMIT EVENT - Retrying
      _emitJobEvent(updatedJob, PrintJobStatus.retrying, error: error);

      // Exponential backoff: 2sec, 4sec, 6sec
      final delay = Duration(
        seconds: retryDelay.inSeconds * (job.retryCount + 1),
      );

      debugPrint(
        '🔄 Job ${job.uuid} retry ${job.retryCount + 1}/${job.maxRetries} in ${delay.inSeconds}s',
      );

      Future.delayed(delay, () => _addToQueue(updatedJob));
    } else {
      // ─────────────────────────────────────────────────
      // MAX RETRIES REACHED - FINAL FAILURE
      // ─────────────────────────────────────────────────
      await _jobsRepository.markAsFailed(job.uuid, error);
      failedCount.value++;

      // 🔴 EMIT EVENT - Failed
      _emitJobEvent(job, PrintJobStatus.failed, error: error);

      debugPrint('❌ Job ${job.uuid} failed after ${job.maxRetries} retries');
    }
  }

  // ============================================================
  // JOB PROCESSING - YAHAN TEMPLATE CALL HOTA HAI
  // ============================================================

  Future<bool> _processJob(PrintJobModel job) async {
    try {
      // Get printer config
      final printer = await _printersRepository.getPrinterByUuid(
        job.printerConfigUuid,
      );

      if (printer == null) {
        debugPrint('❌ Printer config not found: ${job.printerConfigUuid}');
        return false;
      }

      // Get hardware printer
      final hardwarePrinter = _hardwarePrinterService.findPrinterByName(
        printer.hardwareName,
      );

      if (hardwarePrinter == null && !printer.isSunmi) {
        debugPrint('❌ Hardware printer not found: ${printer.hardwareName}');
        return false;
      }

      // ─────────────────────────────────────────────────
      // 🔴 YAHAN APKI TEMPLATE CALL HOTI HAI
      // ─────────────────────────────────────────────────
      final bytes = await _generateReceiptBytes(job, printer);

      if (bytes == null || bytes.isEmpty) {
        debugPrint('❌ Failed to generate receipt bytes');
        return false;
      }

      // Send to printer
      return await _sendToPrinter(hardwarePrinter, printer, bytes);
    } catch (e) {
      debugPrint('❌ Error processing job ${job.uuid}: $e');
      return false;
    }
  }

  // ============================================================
  // 🔴🔴🔴 RECEIPT GENERATION - APNI TEMPLATES YAHAN LAGAO 🔴🔴🔴
  // ============================================================

  Future<List<int>?> _generateReceiptBytes(
    PrintJobModel job,
    PrinterConfigModel printer,
  ) async {
    try {
      // Create order helper from payload
      final orderHelper = ExtOrdersModel.fromJson(job.payload);

      switch (job.jobType) {
        case PrintJobType.receipt:
          // ─────────────────────────────────────────────────
          // 🔴 APNI RECEIPT TEMPLATE YAHAN CALL KARO
          // ─────────────────────────────────────────────────
          return await _generateCustomerReceipt(
            orderHelper: orderHelper,
            printer: printer,
            template: printer.receiptTemplate,
          );

        case PrintJobType.kitchen:
          // ─────────────────────────────────────────────────
          // 🔴 APNI KITCHEN TEMPLATE YAHAN CALL KARO
          // ─────────────────────────────────────────────────
          return await _generateKitchenTicket(
            orderHelper: orderHelper,
            printer: printer,
            products: job.products ?? [],
            categoryUuid: job.categoryUuid,
          );

        case PrintJobType.invoice:
          // ─────────────────────────────────────────────────
          // 🔴 APNI INVOICE TEMPLATE YAHAN CALL KARO
          // ─────────────────────────────────────────────────
          return await _generateInvoice(
            orderHelper: orderHelper,
            printer: printer,
          );

        default:
          return [];
      }
    } catch (e) {
      debugPrint('❌ Error generating receipt: $e');
      return null;
    }
  }

  // ============================================================
  // 🔴 CUSTOMER RECEIPT - APNA TEMPLATE YAHAN INTEGRATE KARO
  // ============================================================

  Future<List<int>> _generateCustomerReceipt({
    required ExtOrdersModel orderHelper,
    required PrinterConfigModel printer,
    required String template,
  }) async {
    // ─────────────────────────────────────────────────────────
    // OPTION 1: Agar aap Sunmi use kar rahe ho
    // ─────────────────────────────────────────────────────────
    if (printer.isSunmi) {
      // Apka existing Sunmi template call karo
      // return await sunmiReceiptTemplate1(orderHelper: orderHelper);

      // Ya direct SunmiPrinter use karo
      // await SunmiPrinter.printText("Receipt...");
      // return []; // Sunmi direct print karta hai, bytes nahi chahiye
    }

    // ─────────────────────────────────────────────────────────
    // OPTION 2: USB/Bluetooth/Network printer ke liye
    // ─────────────────────────────────────────────────────────

    // 🔴🔴🔴 APNI EXISTING TEMPLATE FUNCTION YAHAN CALL KARO 🔴🔴🔴
    //
    // Example - agar apka function aisa hai:
    // Future<List<int>> receiptTemplate1({
    //   required ExtOrdersModel orderHelper,
    //   required String printerName,
    // })
    //
    // To yeh karo:

    // return await receiptTemplate1(
    //   orderHelper: orderHelper,
    //   printerName: printer.name,
    // );

    // ─────────────────────────────────────────────────────────
    // TEMPLATE SELECTION (agar multiple templates hain)
    // ─────────────────────────────────────────────────────────

    // switch (template) {
    //   case 'receipt1':
    //     return await receiptTemplate1(orderHelper: orderHelper, printerName: printer.name);
    //   case 'receipt2':
    //     return await receiptTemplate2(orderHelper: orderHelper, printerName: printer.name);
    //   case 'receipt3':
    //     return await receiptTemplate3(orderHelper: orderHelper, printerName: printer.name);
    //   default:
    //     return await receiptTemplate1(orderHelper: orderHelper, printerName: printer.name);
    // }

    // ─────────────────────────────────────────────────────────
    // PLACEHOLDER - Remove this when you add your template
    // ─────────────────────────────────────────────────────────
    final profile = await CapabilityProfile.load();
    final paperSize = printer.paperWidth == 58
        ? PaperSize.mm58
        : PaperSize.mm80;
    final generator = Generator(paperSize, profile);

    List<int> bytes = [];
    bytes += generator.text('RECEIPT - PLACEHOLDER');
    bytes += generator.text('Order: ${orderHelper.order_number}');
    bytes += generator.cut();

    return bytes;
  }

  // ============================================================
  // 🔴 KITCHEN TICKET - APNA TEMPLATE YAHAN INTEGRATE KARO
  // ============================================================

  Future<List<int>> _generateKitchenTicket({
    required ExtOrdersModel orderHelper,
    required PrinterConfigModel printer,
    required List<Map<String, dynamic>> products,
    String? categoryUuid,
  }) async {
    // ─────────────────────────────────────────────────────────
    // 🔴🔴🔴 APNI KITCHEN TEMPLATE YAHAN CALL KARO 🔴🔴🔴
    // ─────────────────────────────────────────────────────────

    // return await kitchenTicketTemplate(
    //   orderHelper: orderHelper,
    //   products: products,
    //   categoryUuid: categoryUuid,
    //   printerName: printer.name,
    // );

    // PLACEHOLDER
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm80, profile);

    List<int> bytes = [];
    bytes += generator.text(
      'KITCHEN ORDER',
      styles: const PosStyles(bold: true, align: PosAlign.center),
    );
    bytes += generator.text('Order: ${orderHelper.order_number}');
    bytes += generator.hr();

    for (final product in products) {
      bytes += generator.text('${product['qty']}x ${product['name']}');
    }

    bytes += generator.cut();
    return bytes;
  }

  // ============================================================
  // 🔴 INVOICE - APNA TEMPLATE YAHAN INTEGRATE KARO
  // ============================================================

  Future<List<int>> _generateInvoice({
    required ExtOrdersModel orderHelper,
    required PrinterConfigModel printer,
  }) async {
    // 🔴🔴🔴 APNI INVOICE TEMPLATE YAHAN CALL KARO 🔴🔴🔴

    // return await invoiceTemplate(
    //   orderHelper: orderHelper,
    //   printerName: printer.name,
    // );

    // PLACEHOLDER
    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm80, profile);

    List<int> bytes = [];
    bytes += generator.text(
      'INVOICE',
      styles: const PosStyles(bold: true, align: PosAlign.center),
    );
    bytes += generator.cut();

    return bytes;
  }

  // ============================================================
  // SEND TO PRINTER
  // ============================================================

  Future<bool> _sendToPrinter(
    Printer? hardwarePrinter,
    PrinterConfigModel config,
    List<int> bytes,
  ) async {
    try {
      // 🧾 PRINT RECEIPT IN TERMINAL
      final receiptText = utf8.decode(bytes, allowMalformed: true);
      debugPrint('════════════ RECEIPT START ════════════');
      debugPrint(receiptText);
      debugPrint('════════════ RECEIPT END ════════════');

      // 🖨️ Send to printer
      for (int i = 0; i < config.copies; i++) {
        if (config.isSunmi) {
          final success = await _printToSunmi(bytes, config);
          if (!success) return false;
        } else if (hardwarePrinter != null) {
          await FlutterThermalPrinter.instance.printData(
            hardwarePrinter,
            bytes,
          );
        } else {
          return false;
        }
      }

      return true;
    } catch (e, stack) {
      debugPrint('❌ Print error: $e');
      debugPrint('$stack');
      return false;
    }
  }

  Future<bool> _printToSunmi(List<int> bytes, PrinterConfigModel config) async {
    try {
      // ─────────────────────────────────────────────────────────
      // 🔴 APNA SUNMI PRINT CODE YAHAN LAGAO
      // ─────────────────────────────────────────────────────────

      // Option 1: Raw bytes
      // await SunmiPrinter.printRawData(Uint8List.fromList(bytes));

      // Option 2: Using sunmi_printer_plus
      // await SunmiPrinter.initPrinter();
      // await SunmiPrinter.printRawData(Uint8List.fromList(bytes));
      // await SunmiPrinter.cutPaper();

      return true;
    } catch (e) {
      debugPrint('❌ Sunmi print error: $e');
      return false;
    }
  }

  // ============================================================
  // EVENT EMITTER - UI UPDATES KE LIYE
  // ============================================================

  void _emitJobEvent(
    PrintJobModel job,
    PrintJobStatus status, {
    String? error,
  }) {
    final event = PrintJobEvent(
      jobUuid: job.uuid,
      orderUuid: job.orderUuid,
      status: status,
      jobType: job.jobType,
      errorMessage: error ?? job.errorMessage,
      retryCount: job.retryCount,
    );

    _jobEventController.add(event);
    debugPrint('📢 Event: $event');
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  Future<PrintJobModel?> _createReceiptJob(
    ExtOrdersModel order,
    Uuid uuid,
  ) async {
    try {
      final receiptPrinter = await _printersRepository.getDefaultPrinter(
        PrinterType.receipt,
      );
      if (receiptPrinter == null) {
        debugPrint('⚠️ No receipt printer configured');
        return null;
      }

      final hardwarePrinter = _hardwarePrinterService.findPrinterByName(
        receiptPrinter.hardwareName,
      );

      return PrintJobModel(
        uuid: uuid.v4(),
        orderUuid: order.uuid ?? '',
        printerConfigUuid: receiptPrinter.uuid,
        hardwarePrinterAddress: hardwarePrinter?.address,
        jobType: PrintJobType.receipt,
        status: PrintJobStatus.pending,
        priority: PrintJobPriority.high,
        payload: order.toJson(),
        createdAt: DateTime.now(),
      );
    } catch (e) {
      debugPrint('❌ Error creating receipt job: $e');
      return null;
    }
  }

  Future<List<PrintJobModel>> _createKitchenJobs(
    ExtOrdersModel order,
    Uuid uuid,
  ) async {
    final List<PrintJobModel> kitchenJobs = [];

    debugPrint('🟢 _createKitchenJobs started');
    debugPrint('🧾 Order UUID: ${order.uuid}');

    try {
      final products = order.products ?? [];
      debugPrint('📦 Total products: ${products.length}');

      if (products.isEmpty) {
        debugPrint('⚠️ No products found, returning empty list');
        return [];
      }

      // Group products by category
      final productsByCategory = <String, List<Map<String, dynamic>>>{};

      for (final product in products) {
        final categoryUuid = product['category_uuid'] as String?;
        debugPrint('➡️ Processing product, categoryUuid: $categoryUuid');

        if (categoryUuid == null) {
          debugPrint('❌ Product categoryUuid is null, skipping product');
          continue;
        }

        productsByCategory.putIfAbsent(categoryUuid, () => []);
        productsByCategory[categoryUuid]!.add(product);
      }

      debugPrint(
        '🗂️ Products grouped into ${productsByCategory.length} categories',
      );

      // Fetch categories once
      final categories = await _categoriesRepository.getAllCategories();
      debugPrint('📚 Total categories fetched: ${categories.length}');

      // Create jobs for each category's printers
      for (final entry in productsByCategory.entries) {
        final categoryUuid = entry.key;
        final categoryProducts = entry.value;

        debugPrint(
          '🔍 Handling category: $categoryUuid with ${categoryProducts.length} products',
        );

        final category = categories.firstWhereOrNull(
          (c) => c.uuid == categoryUuid,
        );

        if (category == null) {
          debugPrint('❌ Category not found for uuid: $categoryUuid');
          continue;
        }

        debugPrint('✅ Category found: ${category.name}');

        final printerUuids = _getPrinterUuidsFromCategory(category);
        debugPrint('🖨️ Printer UUIDs for category: $printerUuids');

        if (printerUuids.isEmpty) {
          debugPrint('⚠️ No printers linked to category: $categoryUuid');
          continue;
        }

        for (final printerUuid in printerUuids) {
          debugPrint('➡️ Fetching printer: $printerUuid');

          final printer = await _printersRepository.getPrinterByUuid(
            printerUuid,
          );

          if (printer == null) {
            debugPrint('❌ Printer not found: $printerUuid');
            continue;
          }

          debugPrint(
            '🖨️ Printer found: ${printer.name}, type: ${printer.printerType}',
          );

          if (printer.printerType != PrinterType.kitchen) {
            debugPrint('⏭️ Printer is not kitchen type, skipping');
            continue;
          }

          final hardwarePrinter = _hardwarePrinterService.findPrinterByName(
            printer.hardwareName,
          );

          debugPrint(
            '🔌 Hardware printer: ${hardwarePrinter?.name}, address: ${hardwarePrinter?.address}',
          );

          final job = PrintJobModel(
            uuid: uuid.v4(),
            orderUuid: order.uuid ?? '',
            printerConfigUuid: printer.uuid,
            hardwarePrinterAddress: hardwarePrinter?.address,
            jobType: PrintJobType.kitchen,
            status: PrintJobStatus.pending,
            priority: PrintJobPriority.urgent,
            payload: order.toJson(),
            categoryUuid: categoryUuid,
            products: categoryProducts,
            createdAt: DateTime.now(),
          );

          kitchenJobs.add(job);

          debugPrint(
            '✅ Kitchen print job created: ${job.uuid} for printer ${printer.name}',
          );
        }
      }

      debugPrint('🎉 Total kitchen jobs created: ${kitchenJobs.length}');

      return kitchenJobs;
    } catch (e, stack) {
      debugPrint('❌ Error creating kitchen jobs: $e');
      debugPrint('📉 StackTrace: $stack');
      return [];
    }
  }

  Future<PrintJobModel?> _createInvoiceJob(
    ExtOrdersModel order,
    Uuid uuid,
  ) async {
    try {
      final invoicePrinter = await _printersRepository.getDefaultPrinter(
        PrinterType.invoice,
      );
      if (invoicePrinter == null) return null;

      final hardwarePrinter = _hardwarePrinterService.findPrinterByName(
        invoicePrinter.hardwareName,
      );

      return PrintJobModel(
        uuid: uuid.v4(),
        orderUuid: order.uuid ?? '',
        printerConfigUuid: invoicePrinter.uuid,
        hardwarePrinterAddress: hardwarePrinter?.address,
        jobType: PrintJobType.invoice,
        status: PrintJobStatus.pending,
        priority: PrintJobPriority.normal,
        payload: order.toJson(),
        createdAt: DateTime.now(),
      );
    } catch (e) {
      return null;
    }
  }

  void _addToQueue(PrintJobModel job) {
    _jobQueue.add(job);
    pendingJobs.add(job);
    debugPrint('📥 Job added to queue: ${job.uuid} (${job.jobType.name})');
  }

  Future<void> _loadPendingJobs() async {
    try {
      final jobs = await _jobsRepository.getPendingJobs();
      for (final job in jobs) {
        _jobQueue.add(job);
      }
      pendingJobs.assignAll(jobs);
      debugPrint('📥 Loaded ${jobs.length} pending jobs');
    } catch (e) {
      debugPrint('❌ Error loading pending jobs: $e');
    }
  }

  void _watchPendingJobs() {
    _pendingJobsSubscription = _jobsRepository.watchPendingJobs().listen(
      (jobs) => pendingJobs.assignAll(jobs),
      onError: (e) => debugPrint('❌ Error watching jobs: $e'),
    );
  }

  bool _shouldCreateInvoice(ExtOrdersModel order) {
    return order.service_type?.toLowerCase() == 'delivery';
  }

  List<String> _getPrinterUuidsFromCategory(CategoriesModel category) {
    try {
      final printersJson = category.printers;
      if (printersJson == null) return [];

      final printerUuids = printersJson
          .map((p) => p['uuid'].toString())
          .toList();
      return printerUuids;
    } catch (e) {
      return [];
    }
  }

  // ============================================================
  // PUBLIC API - Control
  // ============================================================

  void pause() {
    isPaused.value = true;
    debugPrint('⏸️ Print processing paused');
  }

  void resume() {
    isPaused.value = false;
    debugPrint('▶️ Print processing resumed');
  }

  Future<bool> retryJob(String jobUuid) async {
    try {
      final job = await _jobsRepository.getJobByUuid(jobUuid);
      if (job == null || !job.canRetry) return false;

      final resetJob = job.copyWith(
        status: PrintJobStatus.pending,
        retryCount: 0,
        errorMessage: null,
      );

      await _jobsRepository.updateStatus(jobUuid, PrintJobStatus.pending);
      _addToQueue(resetJob);
      _emitJobEvent(resetJob, PrintJobStatus.pending);

      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> cancelJob(String jobUuid) async {
    try {
      _jobQueue.removeWhere((j) => j.uuid == jobUuid);
      pendingJobs.removeWhere((j) => j.uuid == jobUuid);

      final job = await _jobsRepository.getJobByUuid(jobUuid);
      if (job != null) {
        _emitJobEvent(job, PrintJobStatus.cancelled);
      }

      return await _jobsRepository.cancelJob(jobUuid);
    } catch (e) {
      return false;
    }
  }

  Future<int> cancelOrderJobs(String orderUuid) async {
    try {
      _jobQueue.removeWhere((j) => j.orderUuid == orderUuid);
      pendingJobs.removeWhere((j) => j.orderUuid == orderUuid);
      return await _jobsRepository.cancelJobsByOrder(orderUuid);
    } catch (e) {
      return 0;
    }
  }

  Future<PrintJobStats> getStats() async {
    return await _jobsRepository.getStats();
  }

  Future<int> cleanupOldJobs({
    Duration olderThan = const Duration(days: 7),
  }) async {
    return await _jobsRepository.deleteOldCompletedJobs(olderThan);
  }
}
