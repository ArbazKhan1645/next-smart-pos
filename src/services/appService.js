import { createClient } from '@supabase/supabase-js';
import { internetConnectivityService } from './internetConnectivityService.js';

class AppService {
  constructor() {
    this._supabaseClient = null;
    this._env = {};
  }

  async init() {
    this._loadEnv();
    this._initializeSupabase();
    return this;
  }

  _loadEnv() {
    this._env = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    };
  }

  _initializeSupabase() {
    try {
      if (!this._env.supabaseUrl || !this._env.supabaseAnonKey) {
        console.warn('AppService: Supabase URL or anon key not set in env');
        return;
      }
      this._supabaseClient = createClient(
        this._env.supabaseUrl,
        this._env.supabaseAnonKey,
        { realtime: { log_level: 'info' } },
      );
    } catch (e) {
      console.error('AppService: Failed to initialize Supabase:', e);
    }
  }

  getEnv(key) {
    return import.meta.env[key] ?? null;
  }

  get supabaseClient() {
    return this._supabaseClient;
  }

  get internetConnectivityService() {
    return internetConnectivityService;
  }
}

export const appService = new AppService();
await appService.init();
