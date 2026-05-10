import 'package:flutter_thermal_printer/flutter_thermal_printer.dart';
import 'package:get/get.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/customers_model/customers_model.dart';
import 'package:hse_pos/app/models/ext_orders_model/ext_orders_model.dart';
import 'package:hse_pos/app/models/location_model/location_model.dart';
import 'package:hse_pos/app/services/initial_app_state_service/initial_app_state_service.dart';
import 'package:intl/intl.dart';
import 'package:sunmi_printer_plus/enums.dart';
import 'package:sunmi_printer_plus/sunmi_printer_plus.dart';

Future<List<int>> receiptTemplate1({
  required ExtOrdersModel orderHelper,
  customers? customerData,
  required String printerName,
  bool isDrawer = true,
  LocationModel? location,
}) async {
  final profile = await CapabilityProfile.load();
  final generator = Generator(PaperSize.mm80, profile);
  try {
    final String service = orderHelper.service_type.toString();
    List<int> bytes = [];
    final totalAmoutWithDiscount = Get.find<InitialAppStateService>()
        .totalOrderAmount(orderHelper);
    bytes += generator.text(
      location?.business_name ?? 'HSE POS',
      styles: const PosStyles(
        align: PosAlign.center,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
        bold: true,
      ),
    );

    bytes += generator.text(
      location?.email ?? '',
      styles: const PosStyles(align: PosAlign.center),
    );

    // Business Address
    bytes += generator.text(
      location?.street_address ?? '',
      styles: const PosStyles(align: PosAlign.center),
    );

    bytes += generator.text(
      'Phone: ${location?.telephone_number ?? ''}',
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.text(
      'VAT Number: ${location?.vat_number ?? ''}',
      styles: const PosStyles(align: PosAlign.center),
    );

    // Order Details
    bytes += generator.hr(); // Horizontal line
    bytes += generator.text(
      service,
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    bytes += generator.hr();

    // Order Info
    bytes += generator.row([
      PosColumn(text: 'Order No:', width: 6),
      PosColumn(text: '${orderHelper.order_number}', width: 6),
    ]);

    bytes += generator.row([
      PosColumn(text: 'Date:', width: 6),
      PosColumn(
        text: DateFormat(
          'dd-MM-yyyy hh:mm:ss',
        ).format(DateTime.parse(orderHelper.created_at.toString())),
        width: 6,
      ),
    ]);

    // Customer Info
    customerData != null
        ? bytes += generator.row([
            PosColumn(text: 'Customer:', width: 6),
            PosColumn(
              text: '${customerData.first_name} ${customerData.last_name}',
              width: 6,
            ),
          ])
        : null;

    // Items Header
    bytes += generator.hr();
    bytes += generator.row([
      PosColumn(
        text: 'QTY',
        styles: const PosStyles(align: PosAlign.left),
        width: 1,
      ),
      PosColumn(
        text: 'ITEM',
        width: 6,
        styles: const PosStyles(align: PosAlign.left),
      ),
      PosColumn(
        text: 'RATE',
        width: 2,
        styles: const PosStyles(align: PosAlign.left),
      ),
      PosColumn(
        text: 'PRICE',
        width: 3,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.hr();

    // Items
    for (var index = 0; index < orderHelper.products!.length; index++) {
      final product = orderHelper.products![index];
      bytes += generator.row([
        PosColumn(
          text: '1',
          width: 1,
          styles: const PosStyles(align: PosAlign.left),
        ),
        PosColumn(
          text: product['name'],
          width: 6,
          styles: const PosStyles(align: PosAlign.left),
        ),
        PosColumn(
          text: product['name'],
          width: 2,
          styles: const PosStyles(align: PosAlign.left),
        ),
        PosColumn(
          text: product['selling_price'].toString(),
          width: 3,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);

      // Check if product has modifiers
      if (product['modifiers'] != null && product['modifiers'].isNotEmpty) {
        for (var i = 0; i < product['modifiers'].length; i++) {
          final modifier = product['modifiers'][i];
          bytes += generator.row([
            PosColumn(
              text: '  ${modifier['qty'].toInt()}x',
              width: 2,
            ), // Indented by two spaces
            PosColumn(
              text: '  • ${modifier['name']}',
              width: 6,
            ), // Added bullet and indentation
            PosColumn(
              text: modifier['singlePrice'].toStringAsFixed(2),
              width: 2,
            ),
            PosColumn(
              text:
                  modifier['qty'].toInt() *
                  modifier['singlePrice'].toStringAsFixed(2),
              width: 2,
              styles: const PosStyles(align: PosAlign.right),
            ),
          ]);
        }
      }
    }

    // Totals
    bytes += generator.hr();
    bytes += generator.row([
      PosColumn(text: 'Items Count:', width: 6),
      PosColumn(
        text: '${orderHelper.products?.length ?? 0}',
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    bytes += generator.row([
      PosColumn(text: 'Sub Total:', width: 6),
      PosColumn(
        text: '0.0',
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    // orderHelper.vatTax == 0.0
    //     ? null
    //     : bytes += generator.row([
    //       PosColumn(text: 'Tax:', width: 6),
    //       PosColumn(
    //         text: (orderHelper.tax + orderHelper.includedTax).toStringAsFixed(
    //           2,
    //         ),
    //         width: 6,
    //         styles: const PosStyles(align: PosAlign.right),
    //       ),
    //     ]);

    orderHelper.discount == '0.0'
        ? null
        : bytes += generator.row([
            PosColumn(text: 'Discount:', width: 6),
            PosColumn(
              text:
                  "-${(double.tryParse(orderHelper.discount ?? '0') ?? 0.00).toStringAsFixed(2)}",
              width: 6,
              styles: const PosStyles(align: PosAlign.right),
            ),
          ]);

    bytes += generator.row([
      PosColumn(text: 'TOTAL:', width: 6, styles: const PosStyles(bold: true)),
      PosColumn(
        text: totalAmoutWithDiscount.toStringAsFixed(2),
        width: 6,
        styles: const PosStyles(bold: true, align: PosAlign.right),
      ),
    ]);

    // Payment Info
    // bytes += generator.hr();
    // if (paymentTableData != null) {
    //   paymentTableData.isNotEmpty
    //       ? bytes += generator.row([
    //         PosColumn(text: 'Payment Method:', width: 6),
    //         PosColumn(
    //           text: paymentTableData.first.type.name,
    //           width: 6,
    //           styles: const PosStyles(align: PosAlign.right),
    //         ),
    //       ])
    //       : null;
    // }

    // transactionStatusTableData != null
    //     ? bytes += generator.row([
    //       PosColumn(text: 'Status:', width: 6),
    //       PosColumn(
    //         text: transactionStatusTableData.name,
    //         width: 6,
    //         styles: const PosStyles(align: PosAlign.right, bold: true),
    //       ),
    //     ])
    //     : null;

    // if (paymentTableData != null) {
    //   bytes += generator.row([
    //     PosColumn(text: 'Change:', width: 6),
    //     PosColumn(
    //       text: '',
    //       width: 6,
    //       styles: const PosStyles(align: PosAlign.right, bold: true),
    //     ),
    //   ]);
    // }

    // Footer
    bytes += generator.hr();
    bytes += generator.text(
      'Thank you for shopping with us!',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );

    bytes += generator.feed(2);
    bytes += generator.cut();
    isDrawer ? bytes += generator.drawer() : null;

    return bytes;
  } catch (e) {
    throw Exception("Error in Bytes Receipt1:$e");
  }
}

Future<void> receiptTemplate1Sunmi({
  required ExtOrdersModel orderHelper,
  CustomersModel? customerData,
  bool isDrawer = true,
}) async {
  try {
    final totalAmount = Get.find<InitialAppStateService>().totalOrderAmount(
      orderHelper,
    );

    await SunmiPrinter.initPrinter();

    /// Business Header
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);
    await SunmiPrinter.setFontSize(SunmiFontSize.LG);
    await SunmiPrinter.printText("Business Name");

    await SunmiPrinter.setFontSize(SunmiFontSize.LG);
    await SunmiPrinter.printText("www.example.com");
    await SunmiPrinter.printText("house 1137, street 46 , Karachi, 2673");
    await SunmiPrinter.printText("Phone: 03102426676");

    await SunmiPrinter.line();

    await SunmiPrinter.printText(orderHelper.service_type.toString());

    await SunmiPrinter.line();

    // Order Info
    await SunmiPrinter.setAlignment(SunmiPrintAlign.LEFT);
    await SunmiPrinter.printText("Order No: ${orderHelper.order_number}");
    await SunmiPrinter.printText(
      "Date: ${DateFormat('dd-MM-yyyy hh:mm:ss').format(DateTime.parse(orderHelper.created_at.toString()))}",
    );

    // Customer Info
    if (customerData != null) {
      await SunmiPrinter.printText(
        "Customer: ${customerData.first_name} ${customerData.last_name}",
      );
    }

    await SunmiPrinter.line();

    // Items Header
    await SunmiPrinter.printText("QTY   ITEM                PRICE");

    // Items
    for (var product in orderHelper.products!) {
      const qty = '1'; // hardcoded qty as in original
      final name = product['name'];

      final price = product['selling_price'].toString();

      final String line =
          '${qty.padRight(5)}${name.padRight(15)}${price.padLeft(7)}';
      await SunmiPrinter.printText(line);
    }

    await SunmiPrinter.line();

    // Totals
    await SunmiPrinter.printText(
      "Items Count: ${orderHelper.products?.length ?? 0}",
    );
    await SunmiPrinter.printText("Sub Total: 0.0");

    await SunmiPrinter.printText("TOTAL: ${totalAmount.toStringAsFixed(2)}");

    await SunmiPrinter.line();

    // Footer
    await SunmiPrinter.setAlignment(SunmiPrintAlign.CENTER);

    await SunmiPrinter.printText("Thank you for shopping with us!");

    await SunmiPrinter.lineWrap(2);
    await SunmiPrinter.cut();

    if (isDrawer) {
      await SunmiPrinter.openDrawer();
    }

    await SunmiPrinter.exitTransactionPrint(true);
  } catch (e) {
    throw Exception("Error in Sunmi Receipt1: $e");
  }
}
