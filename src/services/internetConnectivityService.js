import { BehaviorSubject } from './behaviorSubject.js';

export class InternetConnectivityService {
  constructor() {
    this._isConnected = new BehaviorSubject(navigator.onLine);
    this._onOnline = () => this._isConnected.add(true);
    this._onOffline = () => this._isConnected.add(false);
  }

  init() {
    window.addEventListener('online', this._onOnline);
    window.addEventListener('offline', this._onOffline);
    return this;
  }

  get isInternetConnected() {
    return this._isConnected.value;
  }

  get connectivityStream() {
    return this._isConnected;
  }

  subscribe(fn) {
    return this._isConnected.subscribe(fn);
  }

  destroy() {
    window.removeEventListener('online', this._onOnline);
    window.removeEventListener('offline', this._onOffline);
    this._isConnected.close();
  }
}

export const internetConnectivityService = new InternetConnectivityService();
internetConnectivityService.init();
