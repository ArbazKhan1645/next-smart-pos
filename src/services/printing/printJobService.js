import { BehaviorSubject } from '../behaviorSubject.js';

export const PrintJobStatus = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
});

export const PrintJobType = Object.freeze({
  RECEIPT: 'receipt',
  KITCHEN: 'kitchen',
  INVOICE: 'invoice',
  LABEL: 'label',
});

export const PrintJobPriority = Object.freeze({ URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const QUEUE_INTERVAL_MS = 500;

class PrintJobService {
  constructor() {
    this._db = null;
    this._hardwarePrinterService = null;

    this._jobQueue = [];
    this.pendingJobs = new BehaviorSubject([]);
    this.activeJobs = new BehaviorSubject([]);
    this.currentJob = new BehaviorSubject(null);
    this.isProcessing = new BehaviorSubject(false);
    this.isPaused = new BehaviorSubject(false);
    this.processedCount = new BehaviorSubject(0);
    this.failedCount = new BehaviorSubject(0);

    this._jobEventListeners = new Set();
    this._queueProcessorTimer = null;
  }

  async init({ db, hardwarePrinterService }) {
    this._db = db;
    this._hardwarePrinterService = hardwarePrinterService;

    await this._loadPendingJobs();
    this._startQueueProcessor();
    return this;
  }

  dispose() {
    clearInterval(this._queueProcessorTimer);
  }

  // ─── Event bus ────────────────────────────────────────────────────────────────

  onJobEvent(listener) {
    this._jobEventListeners.add(listener);
    return () => this._jobEventListeners.delete(listener);
  }

  _emitJobEvent(job, status, { error } = {}) {
    const event = {
      jobUuid: job.uuid,
      orderUuid: job.order_uuid,
      status,
      jobType: job.job_type,
      errorMessage: error ?? job.error_message,
      retryCount: job.retry_count ?? 0,
      timestamp: new Date().toISOString(),
    };
    for (const listener of this._jobEventListeners) {
      try { listener(event); } catch (_) {}
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  async createJobsForOrder(order) {
    const createdJobs = [];

    try {
      const receiptJob = await this._createReceiptJob(order);
      if (receiptJob) createdJobs.push(receiptJob);

      const kitchenJobs = await this._createKitchenJobs(order);
      createdJobs.push(...kitchenJobs);

      if (this._shouldCreateInvoice(order)) {
        const invoiceJob = await this._createInvoiceJob(order);
        if (invoiceJob) createdJobs.push(invoiceJob);
      }

      if (createdJobs.length > 0) {
        await this._db.printJobs.insertJobs(createdJobs);
        for (const job of createdJobs) {
          this._addToQueue(job);
          this._emitJobEvent(job, PrintJobStatus.PENDING);
        }
      }

      return createdJobs;
    } catch (e) {
      console.error('[PrintJobService] Error creating print jobs:', e);
      return createdJobs;
    }
  }

  pause() { this.isPaused.add(true); }
  resume() { this.isPaused.add(false); }

  async retryJob(jobUuid) {
    try {
      const job = await this._db.printJobs.getJobByUuid(jobUuid);
      if (!job) return false;
      const resetJob = { ...job, status: PrintJobStatus.PENDING, retry_count: 0, error_message: null };
      await this._db.printJobs.updateJob(resetJob);
      this._addToQueue(resetJob);
      return true;
    } catch (e) {
      console.error('[PrintJobService] Error retrying job:', e);
      return false;
    }
  }

  async getPendingJobsCount() {
    return this._jobQueue.length;
  }

  // ─── Queue ────────────────────────────────────────────────────────────────────

  _addToQueue(job) {
    this._jobQueue.push(job);
    this._jobQueue.sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2));
    this.pendingJobs.add([...this.pendingJobs.value, job]);
  }

  _startQueueProcessor() {
    this._queueProcessorTimer = setInterval(() => this._processQueue(), QUEUE_INTERVAL_MS);
  }

  async _processQueue() {
    if (this.isPaused.value || this.isProcessing.value || this._jobQueue.length === 0) return;

    this.isProcessing.add(true);
    const job = this._jobQueue.shift();
    this.currentJob.add(job);
    this.activeJobs.add([...this.activeJobs.value, job]);

    try {
      await this._db.printJobs.markAsProcessing(job.uuid);
      this._emitJobEvent(job, PrintJobStatus.PROCESSING);

      const success = await this._processJob(job);

      if (success) {
        await this._db.printJobs.markAsCompleted(job.uuid);
        this.processedCount.add(this.processedCount.value + 1);
        this._emitJobEvent(job, PrintJobStatus.COMPLETED);
      } else {
        await this._handleJobFailure(job, 'Print operation failed');
      }
    } catch (e) {
      console.error('[PrintJobService] Queue processing error:', e);
      if (this.currentJob.value) {
        await this._handleJobFailure(this.currentJob.value, String(e));
      }
    } finally {
      this.activeJobs.add(this.activeJobs.value.filter(j => j.uuid !== job.uuid));
      this.pendingJobs.add(this.pendingJobs.value.filter(j => j.uuid !== job.uuid));
      this.currentJob.add(null);
      this.isProcessing.add(false);
    }
  }

  async _handleJobFailure(job, error) {
    const retryCount = job.retry_count ?? 0;

    if (retryCount < MAX_RETRIES) {
      await this._db.printJobs.markForRetry(job.uuid, error);
      const updatedJob = { ...job, status: PrintJobStatus.RETRYING, retry_count: retryCount + 1, error_message: error };
      this._emitJobEvent(updatedJob, PrintJobStatus.RETRYING, { error });

      const delay = RETRY_DELAY_MS * (retryCount + 1);
      setTimeout(() => this._addToQueue(updatedJob), delay);
    } else {
      await this._db.printJobs.markAsFailed(job.uuid, error);
      this.failedCount.add(this.failedCount.value + 1);
      this._emitJobEvent(job, PrintJobStatus.FAILED, { error });
    }
  }

  // ─── Job processing ───────────────────────────────────────────────────────────

  async _processJob(job) {
    try {
      const printerConfig = await this._db.printers.getPrinterByUuid(job.printer_config_uuid);
      if (!printerConfig) return false;

      const hardwarePrinter = this._hardwarePrinterService?.findPrinterByName(printerConfig.hardware_name);
      if (!hardwarePrinter && !printerConfig.is_sunmi) return false;

      const bytes = await this._generateReceiptBytes(job, printerConfig);
      if (!bytes || bytes.length === 0) return false;

      return await this._sendToPrinter(hardwarePrinter, printerConfig, bytes);
    } catch (e) {
      console.error('[PrintJobService] Error processing job:', e);
      return false;
    }
  }

  async _generateReceiptBytes(job, printer) {
    try {
      const order = JSON.parse(typeof job.payload === 'string' ? job.payload : JSON.stringify(job.payload));

      switch (job.job_type) {
        case PrintJobType.RECEIPT:
          return await this._generateCustomerReceipt({ order, printer, template: printer.receipt_template });
        case PrintJobType.KITCHEN:
          return await this._generateKitchenTicket({ order, printer, products: job.products ?? [], categoryUuid: job.category_uuid });
        case PrintJobType.INVOICE:
          return await this._generateInvoice({ order, printer });
        default:
          return [];
      }
    } catch (e) {
      console.error('[PrintJobService] Error generating receipt bytes:', e);
      return null;
    }
  }

  async _generateCustomerReceipt({ order, printer, template }) {
    // Wire your receipt template here
    // if (printer.is_sunmi) { return await sunmiReceiptTemplate(order); }
    // return await receiptTemplate1({ order, printerName: printer.name });

    // Placeholder text receipt
    const lines = [
      '================================',
      'RECEIPT',
      `Order: ${order.order_number ?? ''}`,
      `Date: ${new Date().toLocaleString()}`,
      '--------------------------------',
      ...(order.products ?? []).map(p => `${p.qty ?? 1}x ${p.name ?? ''} - ${p.selling_price ?? 0}`),
      '--------------------------------',
      `Total: ${order.total ?? ''}`,
      '================================',
    ];
    return new TextEncoder().encode(lines.join('\n'));
  }

  async _generateKitchenTicket({ order, printer, products, categoryUuid }) {
    // Wire your kitchen template here
    const lines = [
      '===== KITCHEN ORDER =====',
      `Order #${order.order_number ?? ''}`,
      '--------------------------',
      ...products.map(p => `${p.qty ?? 1}x ${p.name ?? ''}`),
      '==========================',
    ];
    return new TextEncoder().encode(lines.join('\n'));
  }

  async _generateInvoice({ order, printer }) {
    const lines = ['===== INVOICE =====', `Order #${order.order_number ?? ''}`, '==================='];
    return new TextEncoder().encode(lines.join('\n'));
  }

  async _sendToPrinter(hardwarePrinter, config, bytes) {
    try {
      if (import.meta.env.DEV) {
        console.log('[PrintJobService] Receipt preview:', new TextDecoder().decode(bytes));
      }

      for (let i = 0; i < (config.copies ?? 1); i++) {
        if (config.is_sunmi) {
          await this._printToSunmi(bytes, config);
        } else if (hardwarePrinter) {
          // Wire to Tauri printing plugin
          // await invoke('print_data', { printer: hardwarePrinter.address, data: Array.from(bytes) });
        } else {
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('[PrintJobService] Print error:', e);
      return false;
    }
  }

  async _printToSunmi(bytes, config) {
    // Wire to Sunmi printer plugin
    // await SunmiPrinter.printRawData(bytes);
    return true;
  }

  // ─── Job creators ─────────────────────────────────────────────────────────────

  async _createReceiptJob(order) {
    try {
      const receiptPrinter = await this._db.printers.getDefaultPrinter('receipt');
      if (!receiptPrinter) return null;

      return {
        uuid: crypto.randomUUID(),
        order_uuid: order.uuid ?? '',
        printer_config_uuid: receiptPrinter.uuid,
        job_type: PrintJobType.RECEIPT,
        status: PrintJobStatus.PENDING,
        priority: PrintJobPriority.HIGH,
        payload: order,
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: MAX_RETRIES,
      };
    } catch (e) {
      console.error('[PrintJobService] Error creating receipt job:', e);
      return null;
    }
  }

  async _createKitchenJobs(order) {
    const kitchenJobs = [];
    try {
      const products = order.products ?? [];
      if (!products.length) return [];

      const productsByCategory = {};
      for (const product of products) {
        const categoryUuid = product.category_uuid;
        if (!categoryUuid) continue;
        if (!productsByCategory[categoryUuid]) productsByCategory[categoryUuid] = [];
        productsByCategory[categoryUuid].push(product);
      }

      const allCategories = await this._db.categories.getAllCategories();

      for (const [categoryUuid, categoryProducts] of Object.entries(productsByCategory)) {
        const category = allCategories.find(c => c.uuid === categoryUuid);
        if (!category) continue;

        const printerUuids = this._getPrinterUuidsFromCategory(category);
        for (const printerUuid of printerUuids) {
          const printer = await this._db.printers.getPrinterByUuid(printerUuid);
          if (!printer || printer.printer_type !== 'kitchen') continue;

          kitchenJobs.push({
            uuid: crypto.randomUUID(),
            order_uuid: order.uuid ?? '',
            printer_config_uuid: printer.uuid,
            job_type: PrintJobType.KITCHEN,
            status: PrintJobStatus.PENDING,
            priority: PrintJobPriority.URGENT,
            payload: order,
            category_uuid: categoryUuid,
            products: categoryProducts,
            created_at: new Date().toISOString(),
            retry_count: 0,
            max_retries: MAX_RETRIES,
          });
        }
      }
    } catch (e) {
      console.error('[PrintJobService] Error creating kitchen jobs:', e);
    }
    return kitchenJobs;
  }

  async _createInvoiceJob(order) {
    try {
      const invoicePrinter = await this._db.printers.getDefaultPrinter('invoice');
      if (!invoicePrinter) return null;

      return {
        uuid: crypto.randomUUID(),
        order_uuid: order.uuid ?? '',
        printer_config_uuid: invoicePrinter.uuid,
        job_type: PrintJobType.INVOICE,
        status: PrintJobStatus.PENDING,
        priority: PrintJobPriority.NORMAL,
        payload: order,
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: MAX_RETRIES,
      };
    } catch (e) {
      console.error('[PrintJobService] Error creating invoice job:', e);
      return null;
    }
  }

  _shouldCreateInvoice(order) {
    return order.service_type?.toLowerCase() === 'delivery';
  }

  _getPrinterUuidsFromCategory(category) {
    try {
      if (Array.isArray(category.printer_uuids)) return category.printer_uuids;
      if (typeof category.printer_uuids === 'string' && category.printer_uuids) {
        return category.printer_uuids.split(',').filter(Boolean);
      }
      return [];
    } catch (_) { return []; }
  }

  async _loadPendingJobs() {
    try {
      const jobs = await this._db.printJobs.getPendingJobs();
      for (const job of jobs) this._addToQueue(job);
    } catch (e) {
      console.error('[PrintJobService] Error loading pending jobs:', e);
    }
  }
}

export const printJobService = new PrintJobService();
