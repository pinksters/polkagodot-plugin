// Sets up vitest with JavaScript modules loaded from polkagodot_export_shell.html

import { vi, beforeEach } from 'vitest';
import { loadModulesFromHTML, resetWalletManager } from './src/html-extractor.js';

let modules;
try {
  modules = loadModulesFromHTML();
} catch (error) {
  console.error('Failed to load modules from HTML:', error);
  throw error;
}

// Attach modules to globalThis for tests
globalThis.ABIEncoder = modules.ABIEncoder;
globalThis.WalletManager = modules.WalletManager;
globalThis.ChainManager = modules.ChainManager;
globalThis.PolkaInterface = modules.PolkaInterface;
globalThis.STORAGE_PREFIX = modules.STORAGE_PREFIX;
globalThis.SIGNATURE_EXPIRATION = modules.SIGNATURE_EXPIRATION;

// Mock localStorage
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index) => Object.keys(store)[index] ?? null),
    _setStore: (newStore) => { store = newStore; }
  };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch
global.fetch = vi.fn();

// Reset state between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock._setStore({});
  resetWalletManager(modules.WalletManager);

  // Suppress expected console output during tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Clean up window.ethereum
  if (global.window) {
    delete global.window.ethereum;
  }
});
