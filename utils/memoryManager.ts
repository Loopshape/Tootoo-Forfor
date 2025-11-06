// utils/memoryManager.ts
import {
  MEMORY_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  RECENT_FILES_STORAGE_KEY,
  MAX_MEMORY_THRESHOLD_BYTES,
  CACHE_LIMIT,
  MEMORY_MONITOR_INTERVAL_MS,
  AUTOSAVE_CONTENT_KEY,
} from '../constants';
import { MemoryMetrics, MemoryStatusEnum, RecentFile, QuantumSettings } from '../types';
import { quantumNotify } from './quantumEffects';

declare global {
  interface Window {
    quantumMemoryCache?: Map<string, any>;
    gc?: () => void;
  }
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export class QuantumMemoryManager {
  private cleanupInterval: number | null = null;

  constructor() {
    // Ensure `quantumMemoryCache` is initialized
    if (!window.quantumMemoryCache) {
      window.quantumMemoryCache = new Map<string, any>();
    }
  }

  public init(): void {
    this.startMemoryMonitoring();
    this.cleanupOldCache(); // Initial cleanup
  }

  public cleanup(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
    }
  }

  private startMemoryMonitoring(): void {
    this.cleanupInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, MEMORY_MONITOR_INTERVAL_MS);

    window.addEventListener('beforeunload', () => this.cleanup());
  }

  public checkMemoryUsage(): MemoryMetrics {
    try {
      if ('memory' in performance && performance.memory) {
        const memory = performance.memory;
        const used = memory.usedJSHeapSize;
        const limit = memory.jsHeapSizeLimit;

        const usagePercent = (used / limit) * 100;

        if (usagePercent > 80) {
          this.emergencyCleanup();
          return { text: 'RAM: CRITICAL', className: 'bg-red-700 text-white' };
        } else if (usagePercent > 60) {
          this.aggressiveCleanup();
          return { text: 'RAM: WARNING', className: 'bg-orange-500 text-black' };
        } else {
          return { text: 'RAM: OK', className: 'bg-accent-color text-black' };
        }
      }
    } catch (error) {
      console.warn('Memory monitoring unavailable:', error);
    }
    return { text: 'RAM: N/A', className: 'bg-gray-500 text-white' };
  }

  // --- Settings Management ---
  public loadSettings(): QuantumSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as QuantumSettings;
      }
    } catch (error) {
      console.warn('Settings load failed:', error);
    }
    return { // Default settings
      quantumMode: true,
      hyperthreading: true,
      multiAgentMode: true,
      autoSave: true,
      agentCount: 5,
      maxRounds: 3,
      reasoningDepth: 3
    };
  }

  public saveSettings(settings: QuantumSettings): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Settings save failed:', error);
    }
  }

  // --- Recent Files Management ---
  public loadRecentFiles(): RecentFile[] {
    try {
      const stored = localStorage.getItem(RECENT_FILES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as RecentFile[];
      }
    } catch (error) {
      console.warn('Recent files load failed:', error);
    }
    return [];
  }

  public saveRecentFiles(recentFiles: RecentFile[]): void {
    try {
      localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(recentFiles));
    } catch (error) {
      console.warn('Recent files save failed:', error);
    }
  }

  public addRecentFile(currentRecentFiles: RecentFile[], filename: string, content: string): RecentFile[] {
    const newRecentFiles = currentRecentFiles.filter(f => f.filename !== filename);
    newRecentFiles.unshift({
      filename,
      contentPreview: content.substring(0, 1000), // Store only preview
      timestamp: Date.now()
    });
    return newRecentFiles.slice(0, 10); // Keep only last 10 files
  }

  // --- Cache Management ---
  public async store(key: string, data: any, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    try {
      const cache = this.getCache();
      const dataSize = new Blob([JSON.stringify(data)]).size;
      if (dataSize > MAX_MEMORY_THRESHOLD_BYTES) {
        throw new Error('Data too large for storage');
      }

      cache[key] = {
        data: data,
        timestamp: Date.now(),
        priority: priority,
        size: dataSize
      };

      if (Object.keys(cache).length > CACHE_LIMIT) {
        this.cleanupCache();
      }

      this.saveCache(cache);
      return true;
    } catch (error) {
      console.warn('Storage failed, falling back to window.quantumMemoryCache:', error);
      window.quantumMemoryCache?.set(key, data);
      return false;
    }
  }

  public async retrieve(key: string): Promise<any | null> {
    try {
      const cache = this.getCache();
      if (cache[key]) {
        return cache[key].data;
      }

      if (window.quantumMemoryCache?.has(key)) {
        return window.quantumMemoryCache.get(key);
      }

      return null;
    } catch (error) {
      console.warn('Retrieval failed:', error);
      return null;
    }
  }

  private cleanupCache(): void {
    try {
      const cache = this.getCache();
      const entries = Object.entries(cache);

      if (entries.length > CACHE_LIMIT) {
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = entries.slice(0, Math.floor(entries.length * 0.3));
        toRemove.forEach(([key]) => delete cache[key]);
        this.saveCache(cache);
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  private cleanupOldCache(): void {
    const cache = this.getCache();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > oneHour && cache[key].priority !== 'high') { // Don't remove high priority
        delete cache[key];
      }
    });
    this.saveCache(cache);
  }

  private getCache(): { [key: string]: { data: any; timestamp: number; priority: string; size: number; } } {
    try {
      const stored = localStorage.getItem(MEMORY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return {};
    }
  }

  private saveCache(cache: { [key: string]: { data: any; timestamp: number; priority: string; size: number; } }): void {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Cache save failed:', error);
    }
  }

  public emergencyCleanup(): void {
    try {
      localStorage.removeItem(MEMORY_STORAGE_KEY);
      sessionStorage.clear();

      if (window.quantumMemoryCache) {
        window.quantumMemoryCache.clear();
      }
      if (window.gc) window.gc(); // Trigger garbage collection in environments that support it (e.g., Chrome with flags)
      quantumNotify('Emergency memory cleanup completed', 'warn');
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
    }
  }

  public aggressiveCleanup(): void {
    try {
      const cache = this.getCache();
      const entries = Object.entries(cache);
      const toKeep = entries.filter(([, entry]) =>
        entry.priority === 'high' && entry.size < 1024 * 1024 // Keep high priority & smaller than 1MB
      );
      this.saveCache(Object.fromEntries(toKeep));

      if (window.quantumMemoryCache) {
        const keys = Array.from(window.quantumMemoryCache.keys());
        keys.slice(0, Math.floor(keys.length * 0.5)).forEach(key =>
          window.quantumMemoryCache?.delete(key)
        );
      }
      quantumNotify('Aggressive memory cleanup completed', 'info');
    } catch (error) {
      console.warn('Aggressive cleanup failed:', error);
    }
  }

  public async exportSession(): Promise<boolean> {
    try {
      const sessionData = {
        timestamp: Date.now(),
        cache: this.getCache(),
        memoryCache: window.quantumMemoryCache ?
          Array.from(window.quantumMemoryCache.entries()) : [],
        recentFiles: this.loadRecentFiles(),
        settings: this.loadSettings()
      };

      const blob = new Blob([JSON.stringify(sessionData, null, 2)],
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quantum_session_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Session export failed:', error);
      return false;
    }
  }

  public async clearAllCache(): Promise<boolean> {
    try {
      localStorage.removeItem(MEMORY_STORAGE_KEY);
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(RECENT_FILES_STORAGE_KEY);
      localStorage.removeItem(AUTOSAVE_CONTENT_KEY);
      if (window.quantumMemoryCache) {
        window.quantumMemoryCache.clear();
      }
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('Cache clearance failed:', error);
      return false;
    }
  }
}
