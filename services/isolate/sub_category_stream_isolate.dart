import 'dart:async';
import 'dart:isolate';
import 'package:hse_pos/app/models/category_model/category_model.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';

class CategoryStreamService extends GetxService {
  static CategoryStreamService get to => Get.find();

  final RxList<CategoriesModel> _categories = <CategoriesModel>[].obs;
  List<CategoriesModel> get categories => _categories.toList();
  RxList<CategoriesModel> get observableCategories => _categories;

  final Rx<Exception?> _error = Rx<Exception?>(null);
  Exception? get error => _error.value;

  Isolate? _isolate;
  bool _isStreamActive = false;
  SendPort? _isolateSendPort;
  ReceivePort? _receivePort;
  StreamSubscription? _streamSubscription;

  // Flag to track if the service is initialized
  bool _isInitialized = false;

  // Completer to track isolate setup
  Completer<void>? _isolateSetupCompleter;

  Future<CategoryStreamService> init() async {
    _isInitialized = false;
    _error.value = null;
    return this;
  }

  /// Initializes the categories stream subscription
  Future<void> oninitialize(Stream<List<CategoriesModel>> stream) async {
    // If already active, clean up first to prevent memory leaks
    if (_isStreamActive) {
      await cleanupResources();
    }

    try {
      debugPrint('[categoryStreamService] Initializing stream...');

      // Create a completer to track when the isolate is properly set up
      _isolateSetupCompleter = Completer<void>();

      // Set up isolate communication
      _receivePort = ReceivePort();
      final sendPort = _receivePort!.sendPort;

      _isolate = await Isolate.spawn(_streamListener, sendPort);

      // Listen for isolate messages
      _receivePort!.listen((message) {
        if (message is SendPort) {
          _isolateSendPort = message;
          // Complete the setup when we receive the send port
          if (!(_isolateSetupCompleter?.isCompleted ?? true)) {
            _isolateSetupCompleter?.complete();
          }
          debugPrint('[categoryStreamService] Isolate send port received');
        } else if (message is List<CategoriesModel>) {
          // Handle empty list gracefully - set as empty list rather than null
          _categories.value = message;
          debugPrint(
            '[categoryStreamService] Received and set ${message.length} categories',
          );
        } else if (message is Exception) {
          debugPrint(
            '[categoryStreamService] Received error from isolate: $message',
          );
          _error.value = message;
        }
      });

      // Wait for the isolate setup to complete before subscribing to the stream
      await _isolateSetupCompleter?.future;

      // Forward the stream events to the isolate
      _streamSubscription = stream.listen(
        (categories) {
          // Safety check before sending to isolate
          if (_isolateSendPort != null && _isStreamActive) {
            debugPrint(
              '[categoryStreamService] Received ${categories.length} categories',
            );
            _isolateSendPort?.send(categories);
          } else {
            debugPrint(
              '[categoryStreamService] SendPort not available or stream not active',
            );
          }
        },
        onError: (error) {
          debugPrint('[categoryStreamService] Stream error: $error');
          if (_isolateSendPort != null && _isStreamActive) {
            _isolateSendPort?.send(Exception('Stream error: $error'));
          }
        },
        onDone: () {
          debugPrint('[categoryStreamService] Stream completed');
        },
      );

      _isStreamActive = true;
      _isInitialized = true;
      debugPrint('[categoryStreamService] Stream initialized successfully');
    } catch (e) {
      debugPrint('[categoryStreamService] Stream initialization failed: $e');
      _error.value = Exception('Failed to initialize stream: $e');
      _isStreamActive = false;
      _isInitialized = false;
      await cleanupResources();
      rethrow;
    }
  }

  /// Static function that runs in isolate to process category data
  static void _streamListener(SendPort mainSendPort) {
    // Create a receive port for the isolate
    final receivePort = ReceivePort();

    // Send the isolate's send port back to main isolate
    mainSendPort.send(receivePort.sendPort);

    receivePort.listen((message) {
      try {
        // Safe handling of category data
        if (message is List<CategoriesModel>) {
          // Process data safely here if needed before sending back
          mainSendPort.send(message);
        } else {
          // Forward other messages back to main isolate
          mainSendPort.send(message);
        }
      } catch (e) {
        // Handle any processing errors
        mainSendPort.send(Exception('Processing error in isolate: $e'));
      }
    });
  }

  /// Clean up all resources properly
  Future<void> cleanupResources() async {
    debugPrint('[categoryStreamService] Cleaning up resources...');

    // Cancel stream subscription first
    await _streamSubscription?.cancel();
    _streamSubscription = null;

    // Close receive port
    _receivePort?.close();
    _receivePort = null;

    // Kill isolate
    _isolate?.kill(priority: Isolate.immediate);
    _isolate = null;

    // Reset state
    _isolateSendPort = null;
    _isStreamActive = false;

    // Clear any pending completers
    if (_isolateSetupCompleter != null &&
        !_isolateSetupCompleter!.isCompleted) {
      _isolateSetupCompleter!.completeError(Exception('Service disposed'));
    }
    _isolateSetupCompleter = null;

    debugPrint('[categoryStreamService] Resources cleaned up');
  }

  /// Call this method when leaving the home page
  Future<void> onDispoSeCall() async {
    await cleanupResources();
  }

  @override
  void onClose() {
    cleanupResources();
    super.onClose();
  }

  /// Check if service is ready to use
  bool get isReady => _isInitialized && _isStreamActive;
}
