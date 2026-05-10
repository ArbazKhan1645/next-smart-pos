import Database from '@tauri-apps/plugin-sql';
import { createDatabase } from '../db/repositories/index.js';

import { appService } from '../services/appService.js';
import { authService } from '../services/authService.js';
import { layoutConfigService } from '../services/layoutConfigService.js';
import { initialAppStateService } from '../services/initialAppStateService.js';
import { batchService } from '../services/reporting/batchService.js';
import { reportDataService } from '../services/reporting/reportDataService.js';
import { promotionService } from '../services/promotions/promotionService.js';
import { hardwarePrintingService } from '../services/printing/hardwarePrintingService.js';
import { printJobService } from '../services/printing/printJobService.js';

const APP_SLUG = 'HSEPOS';
const APP_VERSION = '1.0.0';
const DB_FILENAME = `${APP_SLUG}_${APP_VERSION}.sqlite`;

// Exported so components can access the wrapped DB directly after init
export let db = null;

/**
 * Main entry point — call once at app startup (e.g. in main.jsx before rendering).
 *
 * Usage:
 *   import { initDependencies } from './locators/serviceLocator.js';
 *   await initDependencies();
 */
export async function initDependencies() {
  try {
    const rawDb = await _openDatabase();
    db = await _initSetupServices(rawDb);
    await _initAppService(db);
    await _initServicesClass(db);
    await _initPrintingServices(db);
    console.log('[ServiceLocator] All dependencies initialized.');
    return db;
  } catch (e) {
    console.error('[ServiceLocator] Failed to initialize dependencies:', e);
    throw e;
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function _openDatabase() {
  // On Windows: %APPDATA%\uk.co.smartpos\hse_pos\database\<filename>
  // Tauri resolves the path relative to the app data dir automatically
  // when using the sqlite: protocol in the plugin config.
  const rawDb = await Database.load(`sqlite:${DB_FILENAME}`);
  return rawDb;
}

async function _initSetupServices(rawDb) {
  const wrappedDb = createDatabase(rawDb);

  // Verify connection with a lightweight query
  try {
    await rawDb.select('SELECT 1');
  } catch (e) {
    console.warn('[ServiceLocator] DB connection check failed:', e);
  }

  return wrappedDb;
}

async function _initAppService(wrappedDb) {
  await appService.init();
  await authService.init();
  await layoutConfigService.init();
}

async function _initServicesClass(wrappedDb) {
  await initialAppStateService.init(wrappedDb);
  await batchService.init(wrappedDb);
  await reportDataService.init(wrappedDb);
  await promotionService.init(wrappedDb);
}

async function _initPrintingServices(wrappedDb) {
  await hardwarePrintingService.init();
  await printJobService.init({ db: wrappedDb, hardwarePrinterService: hardwarePrintingService });
}
