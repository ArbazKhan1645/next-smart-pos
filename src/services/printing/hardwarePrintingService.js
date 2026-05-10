import { BehaviorSubject } from '../behaviorSubject.js';

export const PrinterConnectionType = Object.freeze({ USB: 'USB', BLUETOOTH: 'BLE', NETWORK: 'NETWORK', SUNMI: 'SUNMI' });
export const PrinterStatus = Object.freeze({ READY: 'ready', DISCONNECTED: 'disconnected', ERROR: 'error' });

class HardwarePrintingService {
  constructor() {
    this.printers = new BehaviorSubject([]);
    this.usbPrinters = new BehaviorSubject([]);
    this.bluetoothPrinters = new BehaviorSubject([]);
    this.networkPrinters = new BehaviorSubject([]);
    this.isDiscovering = new BehaviorSubject(false);
    this.isSunmiAvailable = new BehaviorSubject(false);
    this.status = new BehaviorSubject('Ready');
    this.selectedPrinter = new BehaviorSubject(null);

    this._autoRefreshTimer = null;
  }

  async init() {
    await this._checkSunmiPrinter();
    await this.discoverPrinters();
    this._startAutoRefresh();
    return this;
  }

  dispose() {
    clearInterval(this._autoRefreshTimer);
  }

  async discoverPrinters() {
    if (this.isDiscovering.value) return;
    try {
      this.isDiscovering.add(true);
      this.status.add('Discovering printers...');

      const currentPrinters = this.printers.value.filter(p => p.vendorId === 'Sunmi');
      this.printers.add(currentPrinters);
      this.usbPrinters.add([]);
      this.bluetoothPrinters.add([]);
      this.networkPrinters.add([]);

      // In Tauri/web environment, USB discovery is platform-specific
      // This is a stub — wire to Tauri plugin when available
      await this._discoverUSBPrinters();

      this._updateStatus();
    } catch (e) {
      this.status.add(`Discovery error: ${e}`);
      console.error('[HardwarePrintingService] Discovery error:', e);
    } finally {
      this.isDiscovering.add(false);
    }
  }

  async _discoverUSBPrinters() {
    // Platform-specific USB discovery — stub for web/Tauri
    // Wire to Tauri plugin (e.g., tauri-plugin-usb) when available
    try {
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // const { invoke } = window.__TAURI__.tauri;
        // const usbPrinters = await invoke('discover_usb_printers');
        // this._handleDiscoveredPrinters(usbPrinters);
      }
    } catch (e) {
      console.error('[HardwarePrintingService] USB discovery error:', e);
    }
  }

  _handleDiscoveredPrinters(discoveredPrinters) {
    for (const printer of discoveredPrinters) {
      if (!printer.name) continue;

      const currentPrinters = this.printers.value;
      if (currentPrinters.some(p => this._isSamePrinter(p, printer))) continue;

      const newList = [...currentPrinters, printer];
      this.printers.add(newList);

      switch (printer.connectionType) {
        case PrinterConnectionType.USB:
          this.usbPrinters.add([...this.usbPrinters.value, printer]);
          break;
        case PrinterConnectionType.BLUETOOTH:
          this.bluetoothPrinters.add([...this.bluetoothPrinters.value, printer]);
          break;
        case PrinterConnectionType.NETWORK:
          this.networkPrinters.add([...this.networkPrinters.value, printer]);
          break;
      }
    }
    this._updateStatus();
  }

  async _checkSunmiPrinter() {
    try {
      // Sunmi detection — platform-specific
      const isSunmi = false; // TODO: check via Tauri plugin
      this.isSunmiAvailable.add(isSunmi);

      if (isSunmi) {
        this._addSunmiPrinter();
      }
    } catch (e) {
      this.isSunmiAvailable.add(false);
    }
  }

  _addSunmiPrinter() {
    if (this.printers.value.some(p => p.vendorId === 'Sunmi')) return;

    const sunmiPrinter = {
      name: 'Sunmi Built-in Printer',
      address: 'sunmi_internal',
      vendorId: 'Sunmi',
      isConnected: true,
      connectionType: PrinterConnectionType.USB,
    };

    this.printers.add([...this.printers.value, sunmiPrinter]);
  }

  selectPrinter(printer) {
    this.selectedPrinter.add(printer);
  }

  clearSelection() {
    this.selectedPrinter.add(null);
  }

  findPrinterByName(name) {
    if (!name) return null;
    const nameLower = name.toLowerCase();

    if (nameLower.includes('sunmi')) {
      return this.printers.value.find(p => p.vendorId === 'Sunmi') ?? null;
    }

    return this.printers.value.find(p => p.name?.toLowerCase() === nameLower)
      ?? this.printers.value.find(p => p.name?.toLowerCase().includes(nameLower))
      ?? null;
  }

  findPrinterByAddress(address) {
    if (!address) return null;
    return this.printers.value.find(p => p.address === address) ?? null;
  }

  isPrinterAvailable(name) {
    return this.findPrinterByName(name) !== null;
  }

  getPrinterStatus(printer) {
    if (!printer) return PrinterStatus.ERROR;
    if (printer.vendorId === 'Sunmi') {
      return this.isSunmiAvailable.value ? PrinterStatus.READY : PrinterStatus.DISCONNECTED;
    }
    const isAvailable = this.printers.value.some(p => this._isSamePrinter(p, printer));
    if (!isAvailable) return PrinterStatus.DISCONNECTED;
    return printer.isConnected ? PrinterStatus.READY : PrinterStatus.DISCONNECTED;
  }

  addNetworkPrinter({ name, ipAddress, port = 9100 }) {
    const networkPrinter = { name, address: `${ipAddress}:${port}`, isConnected: true, connectionType: PrinterConnectionType.NETWORK };
    this._handleDiscoveredPrinters([networkPrinter]);
  }

  _isSamePrinter(a, b) {
    return a.address === b.address || (a.name && a.name === b.name);
  }

  _updateStatus() {
    const count = this.printers.value.length;
    this.status.add(count > 0 ? `${count} printer(s) available` : 'No printers found');
  }

  _startAutoRefresh() {
    this._autoRefreshTimer = setInterval(() => this.discoverPrinters(), 5 * 60 * 1000);
  }
}

export const hardwarePrintingService = new HardwarePrintingService();
