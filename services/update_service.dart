import 'dart:io';
import 'package:get/get.dart';
import 'package:hse_pos/app/services/update_dialogs.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;

import 'package:hse_pos/app/services/app/app_service.dart';
import 'package:hse_pos/app/core/utils/helpers/logger.dart';

class AppUpdate {
  final String version;
  final String downloadUrl;
  final bool forceUpdate;
  final String? changeLog;

  AppUpdate({
    required this.version,
    required this.downloadUrl,
    required this.forceUpdate,
    this.changeLog,
  });

  factory AppUpdate.fromJson(Map<String, dynamic> json) {
    return AppUpdate(
      version: json['version'] as String,
      downloadUrl: json['download_url'] as String,
      forceUpdate: json['force_update'] as bool? ?? false,
      changeLog: json['change_log'] as String?,
    );
  }
}

class UpdateService extends GetxService {
  static UpdateService get instance => Get.find<UpdateService>();

  Future<void> checkForUpdateWithUI({bool showUpToDate = true}) async {
    // Show loading dialog
    _showLoadingDialog();

    try {
      final update = await checkForUpdate();

      // Close loading dialog
      Get.back();

      if (update != null) {
        // Show update available dialog
        Get.dialog(
          UpdateAvailableDialog(update: update),
          barrierDismissible: false,
        );
      } else if (showUpToDate) {
        // Show app is up to date dialog
        Get.dialog(const AppUpToDateDialog(), barrierDismissible: true);
      }
    } catch (e, stack) {
      // Close loading dialog
      Get.back();

      AppLogger.error("Check for updates failed: $e", stackTrace: stack);

      // Show error dialog
      Get.dialog(
        UpdateErrorDialog(
          errorMessage: _getReadableErrorMessage(e),
          onRetry: () {
            Get.back();
            checkForUpdateWithUI(showUpToDate: showUpToDate);
          },
        ),
        barrierDismissible: true,
      );
    }
  }

  void _showLoadingDialog() {
    Get.dialog(const CheckingUpdatesDialog(), barrierDismissible: false);
  }

  String _getReadableErrorMessage(dynamic error) {
    if (error.toString().contains('SocketException') ||
        error.toString().contains('NetworkException')) {
      return 'No internet connection. Please check your network and try again.';
    } else if (error.toString().contains('TimeoutException')) {
      return 'Request timed out. Please try again.';
    } else if (error.toString().contains('FormatException')) {
      return 'Invalid response from server. Please try again later.';
    } else {
      return 'Unable to check for updates. Please try again later.';
    }
  }

  Future<AppUpdate?> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version;

      final supabase = AppService.instance.supabaseClient;

      final response = await supabase
          .from('app_versions')
          .select()
          .order('id', ascending: false)
          .limit(1)
          .single();

      if (response.isEmpty) {
        return null;
      }

      final latestUpdate = AppUpdate.fromJson(response);

      if (_isVersionGreaterThan(latestUpdate.version, currentVersion)) {
        return latestUpdate;
      }
      return null;
    } catch (e, stack) {
      AppLogger.error("Error checking for updates: $e", stackTrace: stack);
      rethrow;
    }
  }

  bool _isVersionGreaterThan(String newVersion, String currentVersion) {
    final List<int> v1 = newVersion.split('.').map(int.parse).toList();
    final List<int> v2 = currentVersion.split('.').map(int.parse).toList();

    for (int i = 0; i < 3; i++) {
      final int ver1 = (i < v1.length) ? v1[i] : 0;
      final int ver2 = (i < v2.length) ? v2[i] : 0;
      if (ver1 > ver2) return true;
      if (ver1 < ver2) return false;
    }
    return false;
  }

  Future<File?> downloadUpdate(
    String url, {
    Function(double)? onProgress,
  }) async {
    File? zipFile;
    try {
      print('[Download] Starting download from: $url');

      final tempDir = await getTemporaryDirectory();
      final savePath = p.join(
        tempDir.path,
        'hse_update_${DateTime.now().millisecondsSinceEpoch}.zip',
      );
      zipFile = File(savePath);

      // Delete existing file if any
      if (await zipFile.exists()) {
        await zipFile.delete();
      }

      print('[Download] Downloading to: $savePath');

      // Use direct download instead of streaming
      final response = await http.get(Uri.parse(url));

      if (response.statusCode != 200) {
        print('[Download] ERROR: HTTP ${response.statusCode}');
        return null;
      }

      print('[Download] Response received: ${response.bodyBytes.length} bytes');

      // Write bytes directly
      await zipFile.writeAsBytes(response.bodyBytes, flush: true);

      // Verify file
      if (!await zipFile.exists()) {
        print('[Download] ERROR: File not created');
        return null;
      }

      final fileSize = await zipFile.length();
      print('[Download] File saved: $fileSize bytes');
      print('[Download] File path: ${zipFile.path}');

      if (fileSize < 1000) {
        print('[Download] ERROR: File too small ($fileSize bytes)');
        return null;
      }

      // Verify zip is valid by trying to read it
      try {
        final testRead = await zipFile.readAsBytes();
        if (testRead.isEmpty) {
          print('[Download] ERROR: File is empty');
          return null;
        }
        print('[Download] Zip validation passed');
      } catch (e) {
        print('[Download] ERROR: Cannot read zip file: $e');
        return null;
      }

      print('[Download] Download completed successfully');
      if (onProgress != null) onProgress(1.0);

      return zipFile;
    } catch (e, stack) {
      print('[Download] ERROR: $e');
      AppLogger.error("Download failed: $e", stackTrace: stack);
      if (zipFile != null && await zipFile.exists()) {
        await zipFile.delete();
      }
      return null;
    }
  }

  // Method 1: Fully Automatic Update
  Future<void> applyUpdateAutomatic(File zipFile) async {
    if (!Platform.isWindows) {
      print('[Updater] Not a Windows platform. Update aborted.');
      return;
    }

    try {
      print('[Updater] Starting AUTOMATIC update...');

      final exePath = Platform.resolvedExecutable;
      final exeDir = p.dirname(exePath);
      final exeName = p.basename(exePath);
      final zipPath = zipFile.path;

      // Batch file - most compatible
      final batPath = p.join(exeDir, 'update.bat');

      print('[Updater] Exe: $exePath');
      print('[Updater] Exe Dir: $exeDir');
      print('[Updater] Zip: $zipPath');
      print('[Updater] Batch: $batPath');

      // Simple batch script with better zip handling
      final batContent =
          '''
@echo off
title HSE POS Update
echo ================================================
echo           HSE POS AUTO UPDATE
echo ================================================
echo.

echo [1/7] Waiting for app to close...
timeout /t 2 /nobreak >nul

echo [2/7] Killing process if still running...
taskkill /F /IM "$exeName" >nul 2>&1
timeout /t 2 /nobreak >nul

echo [3/7] Checking zip file...
if not exist "$zipPath" (
    echo ERROR: Zip file not found at $zipPath
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

echo Zip file found: $zipPath
echo Zip file size: 
dir "$zipPath" | find "update.zip"

echo [4/7] Creating backup folder...
set BACKUP_DIR="$exeDir\\backup_old"
if exist %BACKUP_DIR% rd /s /q %BACKUP_DIR%
mkdir %BACKUP_DIR%

echo [5/7] Moving old files to backup...
cd /d "$exeDir"
for %%F in (*) do (
    if not "%%F"=="update.bat" (
        if not "%%F"=="update.zip" (
            if not "%%F"=="backup_old" (
                move /Y "%%F" %BACKUP_DIR% >nul 2>&1
            )
        )
    )
)
for /d %%D in (*) do (
    if not "%%D"=="backup_old" (
        move /Y "%%D" %BACKUP_DIR% >nul 2>&1
    )
)

echo [6/7] Extracting update...

echo Creating temp extraction folder...
set TEMP_EXTRACT="$exeDir\\temp_extract"
if exist %TEMP_EXTRACT% rd /s /q %TEMP_EXTRACT%
mkdir %TEMP_EXTRACT%

echo.
echo Method 1: Trying tar command (most reliable)...
tar -xf "$zipPath" -C %TEMP_EXTRACT%
if %errorlevel% equ 0 (
    echo tar extraction successful!
    goto :check_files
)

echo tar failed, trying PowerShell...
powershell -Command "try { Expand-Archive -LiteralPath '$zipPath' -DestinationPath '%TEMP_EXTRACT%' -Force; exit 0 } catch { Write-Host \$_.Exception.Message; exit 1 }"
if %errorlevel% equ 0 (
    echo PowerShell extraction successful!
    goto :check_files
)

echo.
echo ERROR: All extraction methods failed!
echo This usually means the zip file is corrupted.
echo.
echo Zip file info:
dir "$zipPath"
echo.
echo Restoring backup...
xcopy /E /I /Y %BACKUP_DIR%\\* "$exeDir"
rd /s /q %BACKUP_DIR%
rd /s /q %TEMP_EXTRACT%
echo.
echo UPDATE FAILED - Original files restored
echo.
echo Troubleshooting:
echo 1. Check your internet connection
echo 2. Try downloading the update again
echo 3. Contact support if issue persists
echo.
pause
start "" "$exePath"
exit /b 1

:check_files
echo.
echo Checking extraction result...
echo Listing extracted contents:
dir %TEMP_EXTRACT% /b
echo.

REM Check if files are directly in temp_extract or in a subfolder
if exist %TEMP_EXTRACT%\\hse_pos.exe (
    echo Found files directly in zip root
    set SOURCE_PATH=%TEMP_EXTRACT%
) else if exist %TEMP_EXTRACT%\\Release\\hse_pos.exe (
    echo Found files in Release subfolder
    set SOURCE_PATH=%TEMP_EXTRACT%\\Release
) else if exist %TEMP_EXTRACT%\\release\\hse_pos.exe (
    echo Found files in release subfolder
    set SOURCE_PATH=%TEMP_EXTRACT%\\release
) else (
    echo ERROR: hse_pos.exe not found in extracted files!
    echo.
    echo Available files in temp_extract:
    dir %TEMP_EXTRACT% /s /b
    echo.
    echo Restoring backup...
    xcopy /E /I /Y %BACKUP_DIR%\\* "$exeDir"
    rd /s /q %BACKUP_DIR%
    rd /s /q %TEMP_EXTRACT%
    echo.
    echo UPDATE FAILED - Original files restored
    echo Press any key to restart app...
    pause >nul
    start "" "$exePath"
    exit /b 1
)

echo [7/7] Moving files from extraction to app directory...
echo Source: %SOURCE_PATH%
echo Destination: $exeDir
echo.
echo Copying all files...
xcopy /E /I /Y %SOURCE_PATH%\\* "$exeDir\\"

echo.
echo Verifying main executable exists...
if not exist "$exePath" (
    echo ERROR: Main executable not found after extraction!
    echo Restoring backup...
    xcopy /E /I /Y %BACKUP_DIR%\\* "$exeDir"
    rd /s /q %BACKUP_DIR%
    rd /s /q %TEMP_EXTRACT%
    echo.
    echo UPDATE FAILED - Original files restored
    echo Press any key to restart app...
    pause >nul
    start "" "$exePath"
    exit /b 1
)

echo Deleting backup and temp folders...
rd /s /q %BACKUP_DIR%
rd /s /q %TEMP_EXTRACT%

echo Deleting zip file...
del /f /q "$zipPath"

echo.
echo ================================================
echo      UPDATE COMPLETED SUCCESSFULLY!
echo ================================================
echo.
echo Restarting app in 3 seconds...
timeout /t 3 /nobreak >nul

start "" "$exePath"

timeout /t 2 /nobreak >nul
(goto) 2>nul & del /f /q "%~f0"
''';

      print('[Updater] Writing batch script...');
      await File(batPath).writeAsString(batContent);

      print('[Updater] Launching batch script...');

      // Launch batch file
      await Process.start(
        'cmd.exe',
        ['/c', 'start', 'cmd.exe', '/k', batPath],
        workingDirectory: exeDir,
        runInShell: true,
      );

      await Future.delayed(const Duration(seconds: 1));
      print('[Updater] Exiting app...');
      exit(0);
    } catch (e, stack) {
      print('[Updater] ERROR: $e');
      print(stack);
      AppLogger.error("Failed to apply update: $e", stackTrace: stack);
    }
  }

  // Method 2: Semi-Manual Update (User extracts, we restart)
  Future<void> applyUpdateSemiManual(File zipFile) async {
    if (!Platform.isWindows) {
      print('[Updater] Not a Windows platform. Update aborted.');
      return;
    }

    try {
      print('[Updater] Starting SEMI-MANUAL update...');

      final exePath = Platform.resolvedExecutable;
      final exeDir = p.dirname(exePath);
      final zipDestPath = p.join(exeDir, 'update.zip');

      print('[Updater] Copying zip to: $zipDestPath');

      // Copy zip to exe directory
      await zipFile.copy(zipDestPath);

      print('[Updater] Creating instruction file...');

      // Create instruction file
      final instructionPath = p.join(exeDir, 'UPDATE_INSTRUCTIONS.txt');
      final instructions =
          '''
╔══════════════════════════════════════════════════════════════╗
║                   HSE POS UPDATE READY                       ║
╚══════════════════════════════════════════════════════════════╝

The update file is ready in this folder: update.zip

IMPORTANT STEPS TO COMPLETE UPDATE:
═══════════════════════════════════════════════════════════════

Step 1: CLOSE the application if it's still running

Step 2: Extract "update.zip" in THIS FOLDER
        - Right-click on update.zip
        - Select "Extract All" or use WinRAR/7-Zip
        - Extract to THIS FOLDER (replace all files when asked)

Step 3: If there's a "release" folder after extraction:
        - Open the release folder
        - Select all files inside it
        - Copy them to THIS FOLDER (replace when asked)
        - Delete the release folder

Step 4: Delete update.zip file

Step 5: Run ${p.basename(exePath)} to start the updated app

═══════════════════════════════════════════════════════════════

Current Folder: $exeDir

The app will now close. Please follow the steps above.

Delete this file after completing the update.
''';

      await File(instructionPath).writeAsString(instructions);

      print('[Updater] Opening folder for user...');

      // Open the folder in Explorer
      await Process.run('explorer.exe', [exeDir]);

      // Open the instruction file
      await Process.run('notepad.exe', [instructionPath]);

      print('[Updater] User needs to extract manually. Closing app...');

      await Future.delayed(const Duration(seconds: 2));
      exit(0);
    } catch (e, stack) {
      print('[Updater] ERROR: $e');
      print(stack);
      AppLogger.error(
        "Failed to apply semi-manual update: $e",
        stackTrace: stack,
      );
    }
  }

  // Method 3: Full Manual - Just open folder with zip
  Future<void> applyUpdateFullManual(File zipFile) async {
    if (!Platform.isWindows) {
      print('[Updater] Not a Windows platform. Update aborted.');
      return;
    }

    try {
      print('[Updater] Starting FULL MANUAL update...');

      final exePath = Platform.resolvedExecutable;
      final exeDir = p.dirname(exePath);
      final zipDestPath = p.join(exeDir, 'update.zip');

      // Copy zip to exe directory
      await zipFile.copy(zipDestPath);

      // Open folder with zip selected
      await Process.run('explorer.exe', ['/select,', zipDestPath]);

      print(
        '[Updater] Zip file placed in app folder. User will extract manually.',
      );

      // Show message to user before closing
      // You can show a dialog here in your UI

      await Future.delayed(const Duration(seconds: 2));
      exit(0);
    } catch (e, stack) {
      print('[Updater] ERROR: $e');
      print(stack);
      AppLogger.error("Failed to apply manual update: $e", stackTrace: stack);
    }
  }

  // Main method - use this one
  Future<void> applyUpdate(File zipFile) async {
    // Try automatic first, if fails then semi-manual
    try {
      await applyUpdateAutomatic(zipFile);
    } catch (e) {
      print('[Updater] Automatic update failed, switching to semi-manual...');
      await applyUpdateSemiManual(zipFile);
    }
  }
}
