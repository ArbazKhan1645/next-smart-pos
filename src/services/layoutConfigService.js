import { BehaviorSubject } from './behaviorSubject.js';

const LAYOUT_KEY = 'pos_layout_type';

export const LayoutType = Object.freeze({
  BASKET_LEFT: 'basketLeft',
  BASKET_RIGHT: 'basketRight',
});

class LayoutConfigService {
  constructor() {
    this.currentLayout = new BehaviorSubject(LayoutType.BASKET_LEFT);
    this.isLoading = new BehaviorSubject(false);
  }

  async init() {
    await this.loadLayout();
    return this;
  }

  async loadLayout() {
    try {
      this.isLoading.add(true);
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved && Object.values(LayoutType).includes(saved)) {
        this.currentLayout.add(saved);
      }
    } catch (e) {
      console.error('[LayoutConfigService] Error loading layout:', e);
    } finally {
      this.isLoading.add(false);
    }
  }

  async saveLayout(layout) {
    try {
      if (!Object.values(LayoutType).includes(layout)) {
        console.warn('[LayoutConfigService] Invalid layout type:', layout);
        return;
      }
      localStorage.setItem(LAYOUT_KEY, layout);
      this.currentLayout.add(layout);
    } catch (e) {
      console.error('[LayoutConfigService] Error saving layout:', e);
    }
  }

  toggleLayout() {
    const next = this.currentLayout.value === LayoutType.BASKET_LEFT
      ? LayoutType.BASKET_RIGHT
      : LayoutType.BASKET_LEFT;
    this.saveLayout(next);
  }
}

export const layoutConfigService = new LayoutConfigService();
