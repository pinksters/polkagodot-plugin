import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createMockProvider, setupWindowEthereum, cleanupWindowEthereum } from '../mocks/ethereum-provider.js';
import { addMockWallet, simulateEIP6963Announce } from '../helpers/test-utils.js';
import { ADDRESSES } from '../constants.js';

const { WalletManager } = globalThis;

describe('WalletManager', () => {
  afterEach(() => {
    cleanupWindowEthereum();
  });

  describe('getDiscoveredWallets', () => {
    it('should return empty array when no wallets discovered', () => {
      const wallets = WalletManager.getDiscoveredWallets();
      expect(wallets).toEqual([]);
    });

    it('should return discovered wallets after manual addition', () => {
      const mockProvider = createMockProvider();
      WalletManager.discoveredWallets.set('test-wallet', {
        info: { uuid: 'test-wallet', name: 'Test Wallet', icon: 'icon.png', rdns: 'com.test' },
        provider: mockProvider
      });

      const wallets = WalletManager.getDiscoveredWallets();

      expect(wallets).toHaveLength(1);
      expect(wallets[0]).toEqual({
        id: 'test-wallet',
        name: 'Test Wallet',
        icon: 'icon.png',
        rdns: 'com.test'
      });
    });
  });

  describe('connectWallet', () => {
    it('should connect to a specific wallet by ID', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xabc123']
      });
      WalletManager.discoveredWallets.set('my-wallet', {
        info: { uuid: 'my-wallet', name: 'My Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });

      const result = await WalletManager.connectWallet('my-wallet');

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xabc123');
      expect(WalletManager.currentWalletId).toBe('my-wallet');
      expect(mockProvider.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
    });

    it('should connect to first available wallet when no ID provided', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xfirst']
      });
      WalletManager.discoveredWallets.set('first-wallet', {
        info: { uuid: 'first-wallet', name: 'First', icon: '', rdns: '' },
        provider: mockProvider
      });

      const result = await WalletManager.connectWallet();

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xfirst');
      expect(WalletManager.currentWalletId).toBe('first-wallet');
    });

    it('should fall back to window.ethereum when no discovered wallets', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xlegacy']
      });
      setupWindowEthereum(mockProvider);

      const result = await WalletManager.connectWallet();

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xlegacy');
      expect(WalletManager.currentWalletId).toBe('legacy-ethereum');
    });

    it('should return false when no provider available', async () => {
      const result = await WalletManager.connectWallet();

      expect(result).toBe(false);
      expect(WalletManager.currentAddress).toBeNull();
    });

    it('should return false when wallet not found by ID', async () => {
      const result = await WalletManager.connectWallet('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle connection errors gracefully', async () => {
      const mockProvider = createMockProvider({
        customResponses: {
          'eth_requestAccounts': new Error('User rejected')
        }
      });
      WalletManager.discoveredWallets.set('error-wallet', {
        info: { uuid: 'error-wallet', name: 'Error Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });

      const result = await WalletManager.connectWallet('error-wallet');

      expect(result).toBe(false);
    });
  });

  describe('disconnectWallet', () => {
    it('should clear all wallet state', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xtest'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await WalletManager.disconnectWallet();

      expect(result).toBe(true);
      expect(WalletManager.provider).toBeNull();
      expect(WalletManager.currentAddress).toBeNull();
      expect(WalletManager.currentWalletId).toBeNull();
      expect(WalletManager.availableAccounts).toEqual([]);
    });
  });

  describe('signMessage', () => {
    it('should sign a message successfully', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xsigner'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const signature = await WalletManager.signMessage('Hello, World!');

      expect(signature).toBeTruthy();
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'personal_sign',
        params: ['Hello, World!', '0xsigner']
      });
    });

    it('should return null when not connected', async () => {
      const signature = await WalletManager.signMessage('test');

      expect(signature).toBeNull();
    });

    it('should return null when signing fails', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xsigner'],
        customResponses: {
          'personal_sign': new Error('Signing rejected')
        }
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const signature = await WalletManager.signMessage('test');

      expect(signature).toBeNull();
    });
  });

  describe('selectAccount', () => {
    it('should select an available account', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xfirst', '0xsecond', '0xthird']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await WalletManager.selectAccount('0xsecond');

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xsecond');
    });

    it('should return false for unavailable account', async () => {
      WalletManager.availableAccounts = ['0xfirst'];

      const result = await WalletManager.selectAccount('0xunknown');

      expect(result).toBe(false);
    });
  });

  describe('getAccountsForWallet', () => {
    it('should return accounts for a wallet', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xaccount1', '0xaccount2']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });

      const accounts = await WalletManager.getAccountsForWallet('wallet');

      expect(accounts).toEqual(['0xaccount1', '0xaccount2']);
    });

    it('should throw for non-existent wallet', async () => {
      await expect(WalletManager.getAccountsForWallet('nonexistent'))
        .rejects.toThrow('Wallet not found: nonexistent');
    });
  });

  describe('getCurrentWalletAddress', () => {
    it('should return current address when connected', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xcurrent'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      expect(WalletManager.getCurrentWalletAddress()).toBe('0xcurrent');
    });

    it('should return null when not connected', () => {
      expect(WalletManager.getCurrentWalletAddress()).toBeNull();
    });
  });

  describe('getCurrentWalletInfo', () => {
    it('should return wallet info when connected', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xtest'] });
      WalletManager.discoveredWallets.set('my-wallet', {
        info: { uuid: 'my-wallet', name: 'My Wallet', icon: 'icon.svg', rdns: 'com.mywallet' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('my-wallet');

      const info = WalletManager.getCurrentWalletInfo();

      expect(info).toEqual({
        id: 'my-wallet',
        name: 'My Wallet',
        icon: 'icon.svg'
      });
    });

    it('should return null when not connected', () => {
      expect(WalletManager.getCurrentWalletInfo()).toBeNull();
    });
  });

  describe('getAvailableAccounts', () => {
    it('should return available accounts', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xa', '0xb', '0xc']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      expect(WalletManager.getAvailableAccounts()).toEqual(['0xa', '0xb', '0xc']);
    });

    it('should return empty array when not connected', () => {
      expect(WalletManager.getAvailableAccounts()).toEqual([]);
    });
  });

  describe('ethCall', () => {
    it('should make RPC call via fetch when rpcUrl provided', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ result: '0xresult' })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await WalletManager.ethCall(
        '0xcontract',
        '0xcalldata',
        'https://rpc.example.com'
      );

      expect(result).toBe('0xresult');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://rpc.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"method":"eth_call"')
        })
      );
    });

    it('should normalize addresses without 0x prefix', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ result: '0xok' })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await WalletManager.ethCall('contract', 'data', 'https://rpc.example.com');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://rpc.example.com',
        expect.objectContaining({
          body: expect.stringContaining('"to":"0xcontract"')
        })
      );
    });

    it('should throw on RPC error', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({
          error: { message: 'Execution reverted', data: '0xrevert' }
        })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(
        WalletManager.ethCall('0xcontract', '0xdata', 'https://rpc.example.com')
      ).rejects.toThrow('Execution reverted (data: 0xrevert)');
    });

    it('should use connected provider when no rpcUrl', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xtest'],
        callResult: '0xproviderresult'
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await WalletManager.ethCall('0xcontract', '0xdata', null);

      expect(result).toBe('0xproviderresult');
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'eth_call',
        params: [{ to: '0xcontract', data: '0xdata' }, 'latest']
      });
    });

    it('should throw when no provider available', async () => {
      await expect(
        WalletManager.ethCall('0xcontract', '0xdata', null)
      ).rejects.toThrow('No provider available');
    });
  });

  describe('init', () => {
    it('should set up EIP-6963 discovery when called', () => {
      expect(() => WalletManager.init()).not.toThrow();
    });
  });

  describe('EIP-6963 Discovery', () => {
    let eventListenerSpy;
    let dispatchEventSpy;

    beforeEach(() => {
      eventListenerSpy = vi.spyOn(window, 'addEventListener');
      dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    });

    it('should add event listener for eip6963:announceProvider', () => {
      WalletManager.setupEIP6963Discovery();

      expect(eventListenerSpy).toHaveBeenCalledWith(
        'eip6963:announceProvider',
        expect.any(Function)
      );
    });

    it('should dispatch eip6963:requestProvider event', () => {
      WalletManager.setupEIP6963Discovery();

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'eip6963:requestProvider' })
      );
    });

    it('should add wallet on announceProvider event', () => {
      WalletManager.setupEIP6963Discovery();

      const mockProvider = createMockProvider({ accounts: [ADDRESSES.USER] });
      simulateEIP6963Announce({
        info: { uuid: 'test-uuid', name: 'Test Wallet', icon: 'icon.png', rdns: 'com.test' },
        provider: mockProvider
      });

      const wallets = WalletManager.getDiscoveredWallets();
      expect(wallets).toHaveLength(1);
      expect(wallets[0].id).toBe('test-uuid');
      expect(wallets[0].name).toBe('Test Wallet');
    });

    it('should use uuid as wallet ID when available', () => {
      WalletManager.setupEIP6963Discovery();

      const mockProvider = createMockProvider();
      simulateEIP6963Announce({
        info: { uuid: 'my-unique-uuid', name: 'Wallet Name', icon: '', rdns: '' },
        provider: mockProvider
      });

      expect(WalletManager.discoveredWallets.has('my-unique-uuid')).toBe(true);
    });

    it('should fall back to name for wallet ID when uuid missing', () => {
      WalletManager.setupEIP6963Discovery();

      const mockProvider = createMockProvider();
      simulateEIP6963Announce({
        info: { name: 'Fallback Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });

      expect(WalletManager.discoveredWallets.has('Fallback Wallet')).toBe(true);
    });

    it('should not add duplicate wallets with same ID', () => {
      WalletManager.setupEIP6963Discovery();

      const mockProvider1 = createMockProvider();
      const mockProvider2 = createMockProvider();

      simulateEIP6963Announce({
        info: { uuid: 'same-id', name: 'Wallet 1', icon: '', rdns: '' },
        provider: mockProvider1
      });
      simulateEIP6963Announce({
        info: { uuid: 'same-id', name: 'Wallet 2', icon: '', rdns: '' },
        provider: mockProvider2
      });

      expect(WalletManager.discoveredWallets.size).toBe(1);
      expect(WalletManager.discoveredWallets.get('same-id').info.name).toBe('Wallet 2');
    });
  });

  describe('Legacy Provider Detection', () => {
    it('should register legacy provider after timeout when no wallets discovered', async () => {
      vi.useFakeTimers();
      setupWindowEthereum(createMockProvider());

      WalletManager.checkLegacyProviders();

      expect(WalletManager.discoveredWallets.size).toBe(0);

      await vi.advanceTimersByTimeAsync(100);

      expect(WalletManager.discoveredWallets.has('legacy-ethereum')).toBe(true);
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should not register legacy provider if wallets already discovered', async () => {
      vi.useFakeTimers();
      setupWindowEthereum(createMockProvider());
      addMockWallet('existing-wallet');

      WalletManager.checkLegacyProviders();
      await vi.advanceTimersByTimeAsync(100);

      expect(WalletManager.discoveredWallets.has('legacy-ethereum')).toBe(false);
      expect(WalletManager.discoveredWallets.size).toBe(1);
      vi.clearAllTimers();
      vi.useRealTimers();
    });
  });
});
