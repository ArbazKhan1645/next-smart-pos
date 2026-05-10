// ignore_for_file: use_build_context_synchronously, avoid_print

import 'package:flutter/material.dart';
import 'package:hse_pos/app/models/products_model/products_model.dart';
import 'package:sunmi_printer_plus/sunmi_printer_plus.dart';

class UnifiedPrinterService {
  static bool? _isSunmiSupported;

  static bool _isNotSunmiDevice(String? serialNumber, String? printerVersion) {
    final List<String> invalidValues = [
      'NOT FOUND',
      '',
      'null',
      'undefined',
      'unknown',
    ];

    // Check if either serial number or printer version contains invalid values
    return invalidValues.contains(serialNumber?.toLowerCase()) ||
        invalidValues.contains(printerVersion?.toLowerCase());
  }

  static Future<bool> isSunmiPrinterSupported() async {
    if (_isSunmiSupported != null) return _isSunmiSupported!;

    try {
      // Get all printer details at once
      final details = await getPrinterDetails();

      // Extract values from details
      final String? serialNumber = details['serialNumber'] as String?;
      final String? printerVersion = details['printerVersion'] as String?;
      final bool? bindResult = details['bindResult'] as bool?;
      final bool? canInitialize = details['canInitialize'] as bool?;

      // Check if this is definitely not a Sunmi device
      if (_isNotSunmiDevice(serialNumber, printerVersion)) {
        print(
          'Device determined to not be a Sunmi printer based on identification values',
        );
        _isSunmiSupported = false;
        return false;
      }

      // Additional verification checks
      if (bindResult != true || canInitialize != true) {
        print('Device failed basic printer functionality checks');
        _isSunmiSupported = false;
        return false;
      }

      _isSunmiSupported = true;
      return true;
    } catch (e) {
      print('Error during Sunmi printer verification: $e');
      _isSunmiSupported = false;
      return false;
    }
  }

  static Future<Map<String, dynamic>> getPrinterDetails() async {
    try {
      final bindResult = await SunmiPrinter.bindingPrinter();
      final serialNumber = await SunmiPrinter.serialNumber();
      final printerVersion = await SunmiPrinter.printerVersion();
      final paperSize = await SunmiPrinter.paperSize();

      bool canInitialize = false;
      try {
        await SunmiPrinter.initPrinter();
        canInitialize = true;
      } catch (e) {
        print('Printer initialization error: $e');
        canInitialize = false;
      }

      return {
        'bindResult': bindResult,
        'serialNumber': serialNumber,
        'printerVersion': printerVersion,
        'paperSize': paperSize,
        'canInitialize': canInitialize,
        'isNotSunmiDevice': _isNotSunmiDevice(serialNumber, printerVersion),
      };
    } catch (e) {
      return {'error': e.toString(), 'isNotSunmiDevice': true};
    }
  }

  static Future<void> printProductBarcode({
    required BuildContext context,
    required ProductModel product,
  }) async {
    try {
      final printerDetails = await getPrinterDetails();
      print('Printer Details: $printerDetails');

      if (printerDetails['printerVersion'] == 'NOT FOUND') {
        return;
      }

      final isSunmiAvailable = await isSunmiPrinterSupported();
      print('Is Sunmi Available: $isSunmiAvailable');

      if (isSunmiAvailable) {
      } else {}
    } catch (e) {
      print('Printing error: $e');
    }
  }
}



  // // Sunmi-specific printing implementation
  // static Future<void> _printWithSunmi(ProductModel product) async {
  //   try {

  //     await SunmiPrinter.initPrinter();
  //     await SunmiPrinter.startTransactionPrint(true);
  //     await SunmiPrinter.setFontSize(SunmiFontSize.LG);

  //     // Print product name
  //     // await SunmiPrinter.printText(
  //     //   product.name ?? 'Unknown Product',
  //     //   style: SunmiStyle(
  //     //     fontSize: SunmiFontSize.LG,
  //     //     bold: true,
  //     //     align: SunmiPrintAlign.LEFT,
  //     //   ),
  //     // );
  //     await SunmiPrinter.printRow(cols: [
  //       ColumnMaker(
  //           text: product.name ?? 'Unknown Product',
  //           width: 10,
  //           align: SunmiPrintAlign.LEFT),
  //       ColumnMaker(
  //           text: '£${product.selling_price!.toStringAsFixed(2)}',
  //           width: 10,
  //           align: SunmiPrintAlign.RIGHT),
  //     ]);

  //     // Print barcode if available
  //     if (product.barcode != null && product.barcode!.isNotEmpty) {
  //       await SunmiPrinter.printBarCode(
  //         product.barcode!,
  //         barcodeType: SunmiBarcodeType.CODE128,
  //         textPosition: SunmiBarcodeTextPos.TEXT_UNDER,
  //         height: 40, // Adjusted height for better fit
  //         width: 2,
  //       );
  //     }

  //     // // Print selling price if available
  //     // if (product.sellingPrice != null) {
  //     //   await SunmiPrinter.printText(
  //     //     'Price: £${product.sellingPrice!.toStringAsFixed(2)}',
  //     //     style: SunmiStyle(
  //     //       fontSize: SunmiFontSize.LG,
  //     //       bold: true,
  //     //       align: SunmiPrintAlign.LEFT,
  //     //     ),
  //     //   );
  //     // }
  //     await SunmiPrinter.lineWrap(3);
  //     // Add a final line wrap to ensure proper spacing

  //     // Cut the paper
  //     await SunmiPrinter.cut();
  //     await SunmiPrinter.exitTransactionPrint(true);
  //   } catch (e) {
  //     throw Exception('Failed to print with Sunmi: $e');
  //   }
  // }
