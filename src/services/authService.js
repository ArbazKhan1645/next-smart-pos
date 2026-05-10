import { BehaviorSubject } from './behaviorSubject.js';
import { appService } from './appService.js';
import { internetConnectivityService } from './internetConnectivityService.js';

const STORAGE_KEYS = {
  merchant: 'merchant_data',
  location: 'location_data',
  country: 'country_data',
  terminal: 'terminal_data',
  saleChannel: 'sale_channel_data',
  themeRoute: 'theme_route_data',
};

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
}
function load(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (_) { return null; }
}

class AuthService {
  constructor() {
    this.merchant = new BehaviorSubject(null);
    this.selectedLocation = new BehaviorSubject(null);
    this.selectedCountry = new BehaviorSubject(null);
    this.selectedTerminal = new BehaviorSubject(null);
    this.activeSaleChannel = new BehaviorSubject(null);
    this.themeRoute = new BehaviorSubject(null);
    this.isLoading = new BehaviorSubject(false);
    this.error = new BehaviorSubject(null);
    this.isConnected = new BehaviorSubject(navigator.onLine);

    this._unsubConnectivity = internetConnectivityService.subscribe((connected) => {
      this.isConnected.add(connected);
      if (!connected) this.error.add('No internet connection');
      else if (this.error.value === 'No internet connection') this.error.add(null);
    });
  }

  async init() {
    await this._loadCachedData();
    return this;
  }

  get supabase() {
    return appService.supabaseClient;
  }

  async _loadCachedData() {
    try {
      const user = this.supabase?.auth.getUser ? (await this.supabase.auth.getUser()).data?.user : null;
      if (!user) return;

      const merchantData = load(STORAGE_KEYS.merchant);
      if (merchantData) this.merchant.add(merchantData);

      const locationData = load(STORAGE_KEYS.location);
      if (locationData) this.selectedLocation.add(locationData);

      const countryData = load(STORAGE_KEYS.country);
      if (countryData) this.selectedCountry.add(countryData);

      const terminalData = load(STORAGE_KEYS.terminal);
      if (terminalData) this.selectedTerminal.add(terminalData);

      const saleChannelData = load(STORAGE_KEYS.saleChannel);
      if (saleChannelData) this.activeSaleChannel.add(saleChannelData);

      const themeRouteData = load(STORAGE_KEYS.themeRoute);
      if (themeRouteData) this.themeRoute.add(themeRouteData);
    } catch (e) {
      this.error.add('Failed to load cached data: ' + e.toString());
    }
  }

  _saveCachedData() {
    if (this.merchant.value) save(STORAGE_KEYS.merchant, this.merchant.value);
    if (this.selectedLocation.value) save(STORAGE_KEYS.location, this.selectedLocation.value);
    if (this.selectedCountry.value) save(STORAGE_KEYS.country, this.selectedCountry.value);
    if (this.selectedTerminal.value) save(STORAGE_KEYS.terminal, this.selectedTerminal.value);
    if (this.activeSaleChannel.value) save(STORAGE_KEYS.saleChannel, this.activeSaleChannel.value);
    if (this.themeRoute.value) save(STORAGE_KEYS.themeRoute, this.themeRoute.value);
  }

  async signIn(email, password) {
    if (!this.isConnected.value) {
      this.error.add('No internet connection');
      return false;
    }
    try {
      this.isLoading.add(true);
      this.error.add(null);

      const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        this.error.add(error?.message ?? 'Authentication failed');
        return false;
      }

      const merchantData = await this._fetchMerchantData(data.user.email);
      if (!merchantData) {
        this.error.add('Failed to fetch merchant data');
        return false;
      }

      this.merchant.add(merchantData);
      this._saveCachedData();
      return true;
    } catch (e) {
      this.error.add('Sign in failed: ' + e.toString());
      return false;
    } finally {
      this.isLoading.add(false);
    }
  }

  async _fetchMerchantData(email) {
    try {
      const { data, error } = await this.supabase
        .from('merchants')
        .select()
        .eq('email', email)
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      this.error.add('Failed to fetch merchant data: ' + e.toString());
      return null;
    }
  }

  async fetchLocations() {
    if (!this.isConnected.value) { this.error.add('No internet connection'); return []; }
    if (!this.merchant.value) { this.error.add('Merchant data not available'); return []; }
    try {
      this.isLoading.add(true);
      this.error.add(null);
      const { data, error } = await this.supabase
        .from('locations')
        .select()
        .eq('merchant_id', String(this.merchant.value.id));
      if (error) throw error;
      return data ?? [];
    } catch (e) {
      this.error.add('Failed to fetch locations: ' + e.toString());
      return [];
    } finally {
      this.isLoading.add(false);
    }
  }

  async fetchTerminals() {
    if (!this.isConnected.value) { this.error.add('No internet connection'); return []; }
    if (!this.selectedLocation.value) { this.error.add('Location not selected'); return []; }
    try {
      this.isLoading.add(true);
      this.error.add(null);
      const { data, error } = await this.supabase
        .from('terminals')
        .select()
        .eq('location_id', String(this.selectedLocation.value.id));
      if (error) throw error;
      return (data ?? []).filter(t => t.terminal_status_table_id === 1);
    } catch (e) {
      this.error.add('Failed to fetch terminals: ' + e.toString());
      return [];
    } finally {
      this.isLoading.add(false);
    }
  }

  async fetchSaleChannels() {
    if (!this.isConnected.value) { this.error.add('No internet connection'); return []; }
    try {
      this.isLoading.add(true);
      this.error.add(null);
      const { data, error } = await this.supabase.from('sale_channels').select();
      if (error) throw error;
      const activeResult = await this.fetchActiveSaleChannels();
      if (activeResult !== 'Success') {
        this.error.add(activeResult);
        return [];
      }
      return data ?? [];
    } catch (e) {
      this.error.add('Failed to fetch sale channels: ' + e.toString());
      return [];
    } finally {
      this.isLoading.add(false);
    }
  }

  async fetchActiveSaleChannels(db) {
    if (!this.selectedLocation.value) return 'Location not selected';
    if (!this.isConnected.value) return 'No internet connection';
    try {
      const { data, error } = await this.supabase
        .from('locations_and_sale_channels')
        .select()
        .eq('location_id', String(this.selectedLocation.value.id));
      if (error) throw error;
      if (db) {
        await db.locationsAndSaleChannels.createOrUpdateAll(data ?? []);
      }
      return 'Success';
    } catch (e) {
      return 'Failed to fetch Active Sale Channels: ' + e.toString();
    }
  }

  async activeSaleChannelFn(saleChannel, db) {
    if (!this.selectedLocation.value) return 'Location not selected';
    const mapData = {
      uuid: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      version: 1,
      location_id: String(this.selectedLocation.value.id),
      sale_channel_id: saleChannel.id,
      name: saleChannel.name,
      is_active: true,
    };
    try {
      const { data, error } = await this.supabase
        .from('locations_and_sale_channels')
        .insert(mapData)
        .select();
      if (error || !data?.length) return 'Supabase Error: inserting sale channel';
      return await this.fetchActiveSaleChannels(db);
    } catch (e) {
      return 'Unexpected Error: ' + e.toString();
    }
  }

  async deActiveSaleChannel(saleChannel) {
    try {
      const { data, error } = await this.supabase
        .from('locations_and_sale_channels')
        .delete()
        .eq('sale_channel_id', String(saleChannel.id))
        .select();
      if (error || !data?.length) return 'Supabase Error: de activating sale channel';
      return await this.fetchActiveSaleChannels();
    } catch (e) {
      return 'Unexpected Error deactivate sale channel: ' + e.toString();
    }
  }

  async createTerminal() {
    const selectedLocation = this.selectedLocation.value;
    if (!selectedLocation) return { error: 'Location is not selected.' };
    try {
      const { data: existingTerminals } = await this.supabase
        .from('terminals')
        .select('name')
        .eq('location_id', String(selectedLocation.id));

      const existingNames = (existingTerminals ?? []).map(t => t.name);
      let nextNumber = 1;
      let newTerminalName;
      do {
        newTerminalName = `Terminal ${nextNumber}`;
        nextNumber++;
      } while (existingNames.includes(newTerminalName));

      const newTerminalData = {
        name: newTerminalName,
        uuid: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        location_id: selectedLocation.id,
        version: 0,
        terminal_id: this._generateRandomTerminalId(),
        terminal_status_table_id: 1,
      };

      const { data, error } = await this.supabase
        .from('terminals')
        .insert(newTerminalData)
        .select();

      if (error || !data?.length) return { error: 'Failed to create terminal.' };
      return { success: true, terminal: data[0], name: newTerminalName };
    } catch (e) {
      return { error: 'Failed to create terminal: ' + e.toString() };
    }
  }

  _generateRandomTerminalId() {
    const randomNumber = Math.floor(Math.random() * 9000) + 1000;
    return `TM-${randomNumber}`;
  }

  async foundSaleChannel(saleChannelId) {
    if (!this.isConnected.value) return 'No internet connection';
    try {
      const { data, error } = await this.supabase
        .from('services')
        .select()
        .eq('location_id', String(this.selectedLocation.value?.id ?? ''))
        .eq('name', 'In Store');
      if (error) throw error;
      if (!data?.length) return 'Not Found';
      const found = data.some(s =>
        Array.isArray(s.sale_channels) && s.sale_channels.some(ch => ch.id === saleChannelId)
      );
      return found ? 'Found' : 'Not Found';
    } catch (e) {
      return 'Exception: ' + e.toString();
    }
  }

  async insertSaleChannel(saleChannel) {
    if (!this.isConnected.value) return 'No internet connection';
    const locationId = this.selectedLocation.value?.id;
    if (!locationId) return 'Location not selected';
    try {
      await appService.supabaseClient.from('display_levels').insert({
        title: 'Default',
        location_id: String(locationId),
      });

      const { data: displayLevels, error: dlErr } = await appService.supabaseClient
        .from('display_levels')
        .select()
        .eq('location_id', String(locationId));
      if (dlErr || !displayLevels?.length) return 'Error: Failed to fetch display level after insert.';

      const { data, error } = await appService.supabaseClient.from('services').insert({
        name: 'In Store',
        location_id: String(locationId),
        service_type_id: 1,
        icon_data: '0F66F',
        display_level_uuid: displayLevels[0].uuid,
        sale_channels: [{ id: saleChannel.id, name: saleChannel.name, uuid: saleChannel.uuid, localId: null }],
      }).select();
      if (error || !data?.length) return 'Error: Failed to insert service with sale channel.';
      return 'Success';
    } catch (e) {
      return 'Exception: ' + e.toString();
    }
  }

  async hasStaffForCurrentLocation() {
    if (!this.selectedLocation.value) { this.error.add('Location not selected'); return false; }
    try {
      const { data, error } = await this.supabase
        .from('staffs')
        .select()
        .eq('location_id', String(this.selectedLocation.value.id))
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    } catch (e) {
      this.error.add('Failed to check staff: ' + e.toString());
      return false;
    }
  }

  async insertDefaultStaffForLocation() {
    const selectedLocation = this.selectedLocation.value;
    const merchant = this.merchant.value;
    if (!selectedLocation) { this.error.add('Location not selected'); return false; }
    if (!merchant) { this.error.add('Merchant not found'); return false; }
    try {
      const authorities = Array.from({ length: 28 }, (_, i) => String(75 + i));
      await appService.supabaseClient.from('roles').insert({
        name: 'Admin',
        location_id: selectedLocation.id,
        authority_ids: authorities,
      });

      const { data: roles } = await appService.supabaseClient
        .from('roles')
        .select()
        .eq('location_id', String(selectedLocation.id));

      if (!roles?.length || !roles[0].uuid) { this.error.add('Failed to fetch created role'); return false; }
      const roleUuid = roles[0].uuid;

      const { data, error } = await appService.supabaseClient.from('staffs').insert({
        first_name: 'Admin',
        last_name: 'Admin',
        email: 'admin@gmail.com',
        phone: '0000000',
        pin: '1111',
        role_uuid: roleUuid,
        location_id: selectedLocation.id,
        is_active: false,
        merchant_id: merchant.id,
      }).select();

      return !error && data?.length > 0;
    } catch (e) {
      this.error.add('Failed to insert staff: ' + e.toString());
      return false;
    }
  }

  async ensureStaffExistsForLocation() {
    if (!this.isConnected.value) { this.error.add('No internet connection'); return; }
    try {
      const staffExists = await this.hasStaffForCurrentLocation();
      if (!staffExists) {
        await this.insertDefaultStaffForLocation();
      }
    } catch (e) {
      this.error.add('Error ensuring staff exists: ' + e.toString());
    } finally {
      this.isLoading.add(false);
    }
  }

  isFullyActivated() {
    return !!(
      this.merchant.value &&
      this.selectedLocation.value &&
      this.selectedTerminal.value &&
      this.activeSaleChannel.value &&
      this.themeRoute.value
    );
  }

  selectLocation(location) { this.selectedLocation.add(location); this._saveCachedData(); }
  selectTerminal(terminal) { this.selectedTerminal.add(terminal); this._saveCachedData(); }
  selectSaleChannelValue(saleChannel) { this.activeSaleChannel.add(saleChannel); this._saveCachedData(); }
  selectThemeRoute(route) { this.themeRoute.add(route); this._saveCachedData(); }

  async signOut(db) {
    try {
      await this.supabase?.auth.signOut();
      this.merchant.add(null);
      this.selectedLocation.add(null);
      this.selectedCountry.add(null);
      this.selectedTerminal.add(null);
      this.activeSaleChannel.add(null);
      this.themeRoute.add(null);
      localStorage.clear();
      if (db) {
        // clear all local tables if db instance provided
      }
    } catch (e) {
      this.error.add('Sign out failed: ' + e.toString());
    }
  }

  destroy() {
    this._unsubConnectivity?.();
    this.merchant.close();
    this.selectedLocation.close();
    this.selectedCountry.close();
    this.selectedTerminal.close();
    this.activeSaleChannel.close();
    this.themeRoute.close();
    this.isLoading.close();
    this.error.close();
    this.isConnected.close();
  }
}

export const authService = new AuthService();
await authService.init();
