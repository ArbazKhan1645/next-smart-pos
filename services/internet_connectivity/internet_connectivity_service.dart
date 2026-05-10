// ignore_for_file: avoid_print

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:get/get.dart';

class InternetConnectivityService extends GetxService {
  late final Stream<List<ConnectivityResult>> _connectivityResultStream;
  final Rx<ConnectivityResult> _currentConnectivity = Rx(
    ConnectivityResult.none,
  );

  Future<InternetConnectivityService> init() async {
    await _initializeConnectivity();
    return this;
  }

  Future<void> _initializeConnectivity() async {
    try {
      _connectivityResultStream =
          Connectivity().onConnectivityChanged.asBroadcastStream();
      _monitorConnectivity();
    } catch (e) {
      // Handle error
      print("Connectivity Initialization Error: $e");
    }
  }

  void _monitorConnectivity() {
    _connectivityResultStream.listen(
      (results) {
        _currentConnectivity.value = results.firstWhere(
          (result) =>
              result == ConnectivityResult.mobile ||
              result == ConnectivityResult.wifi ||
              result == ConnectivityResult.ethernet,
          orElse: () => ConnectivityResult.none,
        );
        if (isInternetConnected) {
          print('Current connectivity: ${_currentConnectivity.value}');
        }
      },
      onError: (e, stackTrace) {
        print("Connectivity stream error: $e");
      },
    );
  }

  Stream<List<ConnectivityResult>> get connectivityResultStream =>
      _connectivityResultStream;
  ConnectivityResult get currentConnectivity => _currentConnectivity.value;
  bool get isInternetConnected => [
    ConnectivityResult.mobile,
    ConnectivityResult.wifi,
    ConnectivityResult.ethernet,
  ].contains(currentConnectivity);
}
