import 'dart:convert';

import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
import 'package:sunmi_printer_plus/enums.dart';
import 'package:sunmi_printer_plus/sunmi_printer_plus.dart';

Future<List<int>> createTestReceipt() async {
  final profile = await CapabilityProfile.load();
  final generator = Generator(PaperSize.mm80, profile);
  final List<int> bytes = [];

  // Initialize the printer
  bytes.addAll([
    0x1B, 0x40, // ESC @ (initialize printer)
  ]);

  // Set text to bold and center
  bytes.addAll([
    0x1B, 0x61, 0x01, // ESC a 1 (center)
    0x1B, 0x45, 0x01, // ESC E 1 (bold on)
  ]);
  bytes.addAll(utf8.encode("** TEST RECEIPT **\n"));

  // Reset text style
  bytes.addAll([
    0x1B, 0x45, 0x00, // ESC E 0 (bold off)
    0x1B, 0x61, 0x00, // ESC a 0 (left)
  ]);

  // Add some demo content
  bytes.addAll(utf8.encode("Date: ${DateTime.now()}\n"));
  bytes.addAll(utf8.encode("Item 1        £10.00\n"));
  bytes.addAll(utf8.encode("Item 2        £15.00\n"));
  bytes.addAll(utf8.encode("------------------------\n"));
  bytes.addAll(utf8.encode("Total         £25.00\n\n"));

  // Footer
  bytes.addAll([
    0x1B, 0x61, 0x01, // Center align
  ]);
  bytes.addAll(utf8.encode("Thank you!\n"));

  // Feed and cut
  bytes.addAll([
    0x1B, 0x64, 0x03, // ESC d 3 (feed 3 lines)
    0x1D, 0x56, 0x00, // GS V 0 (full cut)
  ]);

  bytes.addAll(generator.drawer());

  return bytes;
}

Future<void> printSunmiTestReceipt() async {
  try {
    // Initialize printer
    await SunmiPrinter.initPrinter();

    // Set alignment to center
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);

    await SunmiPrinter.printText('** TEST RECEIPT **');

    // Set alignment to left for body
    await SunmiPrinter.setAlignment(SunmiPrintAlign.LEFT);

    await SunmiPrinter.printText('Date: ${DateTime.now()}');
    await SunmiPrinter.printText('Item 1        £10.00');
    await SunmiPrinter.printText('Item 2        £15.00');
    await SunmiPrinter.printText('-----------------------------');
    await SunmiPrinter.printText('Total         £25.00');

    // Footer
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
    await SunmiPrinter.printText('Thank you!');

    // Feed lines and cut
    await SunmiPrinter.lineWrap(3);
    await SunmiPrinter.cut();

    // Exit print transaction
    await SunmiPrinter.exitTransactionPrint(true);
  } catch (e) {
    print("Sunmi print error: $e");
  }
}
