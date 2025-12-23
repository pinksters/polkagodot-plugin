import { describe, it, expect, afterEach } from 'vitest';
import { createMockProvider, createMockProviderWithChainNotAdded, setupWindowEthereum, cleanupWindowEthereum } from '../mocks/ethereum-provider.js';
import { CHAIN_IDS, ADDRESSES } from '../constants.js';

const { WalletManager, ChainManager } = globalThis;

describe('ChainManager', () => {
  afterEach(() => {
    cleanupWindowEthereum();
  });

  describe('getCurrentChainId', () => {
    it('should return chain ID from connected provider', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const chainId = await ChainManager.getCurrentChainId();

      expect(chainId).toBe(CHAIN_IDS.MOONBEAM);
      expect(mockProvider.request).toHaveBeenCalledWith({ method: 'eth_chainId' });
    });

    it('should use window.ethereum if no connected provider', async () => {
      const mockProvider = createMockProvider({ chainId: CHAIN_IDS.MOONRIVER });
      setupWindowEthereum(mockProvider);

      const chainId = await ChainManager.getCurrentChainId();

      expect(chainId).toBe(CHAIN_IDS.MOONRIVER);
    });

    it('should throw when no provider available', async () => {
      await expect(ChainManager.getCurrentChainId())
        .rejects.toThrow('No wallet provider available');
    });

    it('should propagate provider errors', async () => {
      const mockProvider = createMockProvider({
        customResponses: {
          'eth_chainId': new Error('Provider error')
        }
      });
      setupWindowEthereum(mockProvider);

      await expect(ChainManager.getCurrentChainId())
        .rejects.toThrow('Provider error');
    });
  });

  describe('isOnCorrectChain', () => {
    it('should return true when chains match', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const isCorrect = await ChainManager.isOnCorrectChain(CHAIN_IDS.MOONBEAM);

      expect(isCorrect).toBe(true);
    });

    it('should return true when chains match (case insensitive)', async () => {
      const mockProvider = createMockProvider({
        chainId: '0xABC',
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const isCorrect = await ChainManager.isOnCorrectChain('0xabc');

      expect(isCorrect).toBe(true);
    });

    it('should return false when chains do not match', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const isCorrect = await ChainManager.isOnCorrectChain(CHAIN_IDS.MOONRIVER);

      expect(isCorrect).toBe(false);
    });

    it('should return false on error', async () => {
      const isCorrect = await ChainManager.isOnCorrectChain(CHAIN_IDS.MOONBEAM);

      expect(isCorrect).toBe(false);
    });
  });

  describe('switchToCorrectChain', () => {
    const chainConfig = JSON.stringify({
      chainId: CHAIN_IDS.MOONBASE_ALPHA,
      chainName: 'Moonbase Alpha',
      nativeCurrency: { name: 'DEV', symbol: 'DEV', decimals: 18 },
      rpcUrls: ['https://rpc.api.moonbase.moonbeam.network'],
      blockExplorerUrls: ['https://moonbase.moonscan.io']
    });

    it('should switch chain successfully', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await ChainManager.switchToCorrectChain(chainConfig);

      expect(result).toEqual({ success: true, action: 'switched' });
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_IDS.MOONBASE_ALPHA }]
      });
    });

    it('should add chain when not found (error 4902)', async () => {
      const mockProvider = createMockProviderWithChainNotAdded({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await ChainManager.switchToCorrectChain(chainConfig);

      expect(result).toEqual({ success: true, action: 'added' });
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'wallet_addEthereumChain',
        params: [expect.objectContaining({ chainId: CHAIN_IDS.MOONBASE_ALPHA, chainName: 'Moonbase Alpha' })]
      });
    });

    it('should throw on other switch errors', async () => {
      const switchError = new Error('User rejected');
      switchError.code = 4001;
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER],
        customResponses: {
          'wallet_switchEthereumChain': switchError
        }
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      await expect(ChainManager.switchToCorrectChain(chainConfig))
        .rejects.toThrow('Failed to switch to Moonbase Alpha: User rejected');
    });

    it('should throw when no provider available', async () => {
      await expect(ChainManager.switchToCorrectChain(chainConfig))
        .rejects.toThrow('No wallet provider available');
    });
  });

  describe('ensureCorrectChain', () => {
    const chainConfig = JSON.stringify({
      chainId: CHAIN_IDS.MOONBASE_ALPHA,
      chainName: 'Moonbase Alpha'
    });

    it('should return already_correct when on correct chain', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBASE_ALPHA,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await ChainManager.ensureCorrectChain(CHAIN_IDS.MOONBASE_ALPHA, chainConfig);

      expect(result).toEqual({ success: true, action: 'already_correct' });
      expect(mockProvider.request).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'wallet_switchEthereumChain' })
      );
    });

    it('should switch when on wrong chain', async () => {
      const mockProvider = createMockProvider({
        chainId: CHAIN_IDS.MOONBEAM,
        accounts: [ADDRESSES.USER]
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await ChainManager.ensureCorrectChain(CHAIN_IDS.MOONBASE_ALPHA, chainConfig);

      expect(result).toEqual({ success: true, action: 'switched' });
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_IDS.MOONBASE_ALPHA }]
      });
    });
  });
});
