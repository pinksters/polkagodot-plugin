import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockProvider, setupWindowEthereum, cleanupWindowEthereum } from '../mocks/ethereum-provider.js';
import { addMockWallet, createRPCResponse, createMetadataResponse } from '../helpers/test-utils.js';
import { ADDRESSES, CHAIN_IDS, SELECTORS, SIGNATURES, TEST_RPC_URL } from '../constants.js';

const { WalletManager, PolkaInterface } = globalThis;

describe('PolkaInterface', () => {
  beforeEach(() => {
    cleanupWindowEthereum();
    localStorage.clear();
  });

  afterEach(() => {
    cleanupWindowEthereum();
  });

  describe('hasEthereumProvider', () => {
    it('should return true when window.ethereum exists', () => {
      const mockProvider = createMockProvider();
      setupWindowEthereum(mockProvider);

      expect(PolkaInterface.hasEthereumProvider()).toBe(true);
    });

    it('should return false when window.ethereum does not exist', () => {
      expect(PolkaInterface.hasEthereumProvider()).toBe(false);
    });
  });

  describe('isWalletConnected', () => {
    it('should return true when wallet is connected', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xconnected'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      expect(PolkaInterface.isWalletConnected()).toBe(true);
    });

    it('should return false when wallet is not connected', () => {
      expect(PolkaInterface.isWalletConnected()).toBe(false);
    });
  });

  describe('connectWallet', () => {
    it('should delegate to WalletManager.connectWallet', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xtest'] });
      WalletManager.discoveredWallets.set('my-wallet', {
        info: { uuid: 'my-wallet', name: 'My Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });

      const result = await PolkaInterface.connectWallet('my-wallet');

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xtest');
    });
  });

  describe('disconnectWallet', () => {
    it('should delegate to WalletManager.disconnectWallet', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xtest'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await PolkaInterface.disconnectWallet();

      expect(result).toBe(true);
      expect(PolkaInterface.isWalletConnected()).toBe(false);
    });
  });

  describe('getCurrentWalletAddress', () => {
    it('should return current address from WalletManager', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xmyaddress'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      expect(PolkaInterface.getCurrentWalletAddress()).toBe('0xmyaddress');
    });
  });

  describe('getDiscoveredWallets', () => {
    it('should return JSON array of wallets', () => {
      WalletManager.discoveredWallets.set('wallet1', {
        info: { uuid: 'wallet1', name: 'Wallet 1', icon: 'icon1.png', rdns: 'com.wallet1' },
        provider: {}
      });
      WalletManager.discoveredWallets.set('wallet2', {
        info: { uuid: 'wallet2', name: 'Wallet 2', icon: 'icon2.png', rdns: 'com.wallet2' },
        provider: {}
      });

      const result = PolkaInterface.getDiscoveredWallets();
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        id: 'wallet1',
        name: 'Wallet 1',
        icon: 'icon1.png',
        rdns: 'com.wallet1'
      });
    });
  });

  describe('getAvailableAccounts', () => {
    it('should return JSON array of accounts', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xa', '0xb', '0xc']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = PolkaInterface.getAvailableAccounts();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(['0xa', '0xb', '0xc']);
    });
  });

  describe('getCurrentWalletInfo', () => {
    it('should return JSON wallet info', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xtest'] });
      WalletManager.discoveredWallets.set('my-wallet', {
        info: { uuid: 'my-wallet', name: 'My Wallet', icon: 'icon.png', rdns: 'com.test' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('my-wallet');

      const result = PolkaInterface.getCurrentWalletInfo();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        id: 'my-wallet',
        name: 'My Wallet',
        icon: 'icon.png'
      });
    });

    it('should return null when not connected', () => {
      expect(PolkaInterface.getCurrentWalletInfo()).toBeNull();
    });
  });

  describe('signMessage', () => {
    it('should delegate to WalletManager.signMessage', async () => {
      const mockProvider = createMockProvider({ accounts: ['0xsigner'] });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const signature = await PolkaInterface.signMessage('Hello');

      expect(signature).toBeTruthy();
    });
  });

  describe('selectAccount', () => {
    it('should delegate to WalletManager.selectAccount', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xfirst', '0xsecond']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await PolkaInterface.selectAccount('0xsecond');

      expect(result).toBe(true);
      expect(WalletManager.currentAddress).toBe('0xsecond');
    });
  });

  describe('queryNFTs', () => {
    it('should return error when no contract address', async () => {
      const result = await PolkaInterface.queryNFTs('', '[]', '{}');
      const parsed = JSON.parse(result);

      expect(parsed.error).toBe('Contract address is required');
      expect(parsed.tokenCount).toBe(0);
      expect(parsed.tokens).toEqual([]);
    });

    it('should return error when no user address and not connected', async () => {
      const result = await PolkaInterface.queryNFTs('0xcontract', '[]', '{}');
      const parsed = JSON.parse(result);

      expect(parsed.error).toContain('User address is required');
    });

    it('should use user_address from options', async () => {
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ result: '0x' })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const options = JSON.stringify({
        user_address: '0xuser',
        rpc_url: 'https://rpc.test.com',
        from_token_id: 1,
        to_token_id: 1
      });

      const result = await PolkaInterface.queryNFTs('0xcontract', '[]', options);
      const parsed = JSON.parse(result);

      // Should not error about missing user address
      expect(parsed.error).toBeNull();
      expect(parsed.address).toBe('0xcontract');
    });
  });

  describe('equipNFT', () => {
    it('should return error when no wallet connected', async () => {
      const result = await PolkaInterface.equipNFT(1, '0xgamemanager', '{}');
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('No wallet connected');
    });

    it('should equip NFT successfully', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xplayer'],
        chainId: '0x1a4'
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const chainConfig = JSON.stringify({
        chainId: '0x1a4',
        chainName: 'Test Chain'
      });

      const result = await PolkaInterface.equipNFT(42, '0xgamemanager', chainConfig);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.tokenId).toBe(42);
      expect(parsed.txHash).toBeDefined();
    });
  });

  describe('unequipNFT', () => {
    it('should return error when no wallet connected', async () => {
      const result = await PolkaInterface.unequipNFT('0xgamemanager', '{}');
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('No wallet connected');
    });

    it('should unequip NFT successfully', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xplayer'],
        chainId: '0x1a4'
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const chainConfig = JSON.stringify({
        chainId: '0x1a4',
        chainName: 'Test Chain'
      });

      const result = await PolkaInterface.unequipNFT('0xgamemanager', chainConfig);
      const parsed = JSON.parse(result);

      expect(parsed.success).toBe(true);
      expect(parsed.tokenId).toBe(0);
    });
  });

  describe('queryEquippedNFT', () => {
    it('should query equipped NFT via RPC', async () => {
      // Return token ID 42 as uint256
      const mockResult = '0x' + '0'.repeat(62) + '2a'; // 42 in hex
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ result: mockResult })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const tokenId = await PolkaInterface.queryEquippedNFT(
        '0xplayer',
        '0xgamemanager',
        'https://rpc.test.com'
      );

      expect(tokenId).toBe(42);
    });

    it('should return 0 when no NFT equipped', async () => {
      const mockResult = '0x' + '0'.repeat(64); // 0
      const mockResponse = {
        json: vi.fn().mockResolvedValue({ result: mockResult })
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const tokenId = await PolkaInterface.queryEquippedNFT(
        '0xplayer',
        '0xgamemanager',
        'https://rpc.test.com'
      );

      expect(tokenId).toBe(0);
    });
  });

  describe('requestAccountSelection', () => {
    it('should return JSON array of accounts', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xnew1', '0xnew2']
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const result = await PolkaInterface.requestAccountSelection();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(['0xnew1', '0xnew2']);
    });

    it('should return empty array on error', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xtest'],
        customResponses: {
          'eth_requestAccounts': new Error('User rejected')
        }
      });
      WalletManager.discoveredWallets.set('wallet', {
        info: { uuid: 'wallet', name: 'Wallet', icon: '', rdns: '' },
        provider: mockProvider
      });
      await WalletManager.connectWallet('wallet');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await PolkaInterface.requestAccountSelection();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('getAccountsForWallet', () => {
    it('should return JSON array of accounts for wallet', async () => {
      const mockProvider = createMockProvider({
        accounts: ['0xacc1', '0xacc2']
      });
      WalletManager.discoveredWallets.set('target-wallet', {
        info: { uuid: 'target-wallet', name: 'Target', icon: '', rdns: '' },
        provider: mockProvider
      });

      const result = await PolkaInterface.getAccountsForWallet('target-wallet');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(['0xacc1', '0xacc2']);
    });

    it('should return empty array on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await PolkaInterface.getAccountsForWallet('nonexistent');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('_waitForTransaction', () => {
    it('should poll until receipt has blockNumber', async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        customResponses: {
          'eth_getTransactionReceipt': () => {
            callCount++;
            if (callCount < 3) return null;
            return { blockNumber: '0x1', status: '0x1', transactionHash: SIGNATURES.TX_HASH };
          }
        }
      });
      addMockWallet('wallet', { provider: mockProvider });
      await WalletManager.connectWallet('wallet');

      const promise = PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH);
      await vi.advanceTimersByTimeAsync(2000);
      const receipt = await promise;

      expect(receipt.blockNumber).toBe('0x1');
      expect(callCount).toBe(3);
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should return receipt on successful confirmation', async () => {
      const mockProvider = createMockProvider({ accounts: [ADDRESSES.USER] });
      addMockWallet('wallet', { provider: mockProvider });
      await WalletManager.connectWallet('wallet');

      const receipt = await PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH);

      expect(receipt.blockNumber).toBe('0x1');
      expect(receipt.status).toBe('0x1');
    });

    it('should throw timeout error after maxAttempts', async () => {
      vi.useFakeTimers();
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        customResponses: {
          'eth_getTransactionReceipt': () => null
        }
      });

      let error = null;
      const promise = PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH, 2)
        .catch(e => { error = e; });

      // Advance timers to trigger all attempts (each waits 1000ms)
      await vi.advanceTimersByTimeAsync(2000);
      await promise;

      expect(error).not.toBeNull();
      expect(error.message).toContain('Transaction timeout');
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it('should accept status 0x1 as success', async () => {
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        receipt: { status: '0x1' }
      });

      const receipt = await PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH);

      expect(receipt.status).toBe('0x1');
    });

    it('should accept status 1 (numeric) as success', async () => {
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        receipt: { status: 1 }
      });

      const receipt = await PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH);

      expect(receipt.status).toBe(1);
    });

    it('should throw on status 0x0', async () => {
      vi.useFakeTimers();
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        customResponses: {
          'eth_getTransactionReceipt': () => ({
            blockNumber: '0x1',
            status: '0x0',
            transactionHash: SIGNATURES.TX_HASH
          })
        }
      });

      const promise = PolkaInterface._waitForTransaction(mockProvider, SIGNATURES.TX_HASH, 1);

      try {
        await promise;
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error.message).toBe('Transaction failed');
      }
      vi.clearAllTimers();
      vi.useRealTimers();
    });
  });

  describe('equipNFT/unequipNFT transaction formation', () => {
    it('should encode equipHat selector correctly', async () => {
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        chainId: CHAIN_IDS.MOONBASE_ALPHA
      });
      addMockWallet('wallet', { provider: mockProvider });
      await WalletManager.connectWallet('wallet');

      const chainConfig = JSON.stringify({ chainId: CHAIN_IDS.MOONBASE_ALPHA, chainName: 'Moonbase Alpha' });
      await PolkaInterface.equipNFT(42, ADDRESSES.GAME_MANAGER, chainConfig);

      const sendTxCall = mockProvider.request.mock.calls.find(
        call => call[0].method === 'eth_sendTransaction'
      );
      expect(sendTxCall).toBeDefined();
      expect(sendTxCall[0].params[0].data).toMatch(new RegExp('^' + SELECTORS.EQUIP_HAT));
    });

    it('should encode unequipHat selector correctly', async () => {
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        chainId: CHAIN_IDS.MOONBASE_ALPHA
      });
      addMockWallet('wallet', { provider: mockProvider });
      await WalletManager.connectWallet('wallet');

      const chainConfig = JSON.stringify({ chainId: CHAIN_IDS.MOONBASE_ALPHA, chainName: 'Moonbase Alpha' });
      await PolkaInterface.unequipNFT(ADDRESSES.GAME_MANAGER, chainConfig);

      const sendTxCall = mockProvider.request.mock.calls.find(
        call => call[0].method === 'eth_sendTransaction'
      );
      expect(sendTxCall).toBeDefined();
      expect(sendTxCall[0].params[0].data).toBe(SELECTORS.UNEQUIP_HAT);
    });

    it('should include correct from/to/data in transaction params', async () => {
      const mockProvider = createMockProvider({
        accounts: [ADDRESSES.USER],
        chainId: CHAIN_IDS.MOONBASE_ALPHA
      });
      addMockWallet('wallet', { provider: mockProvider });
      await WalletManager.connectWallet('wallet');

      const chainConfig = JSON.stringify({ chainId: CHAIN_IDS.MOONBASE_ALPHA, chainName: 'Moonbase Alpha' });
      await PolkaInterface.equipNFT(1, ADDRESSES.GAME_MANAGER, chainConfig);

      const sendTxCall = mockProvider.request.mock.calls.find(
        call => call[0].method === 'eth_sendTransaction'
      );
      const params = sendTxCall[0].params[0];

      expect(params.from).toBe(ADDRESSES.USER);
      expect(params.to).toBe(ADDRESSES.GAME_MANAGER);
      expect(params.data).toBeDefined();
    });
  });

  describe('queryNFTs complete flow', () => {
    it('should return owned tokens with metadata', async () => {
      const ownerResult = '0x' + ADDRESSES.USER.slice(2).padStart(64, '0');
      const tokenURIResult = '0x' +
        '0000000000000000000000000000000000000000000000000000000000000020' +
        '000000000000000000000000000000000000000000000000000000000000002e' +
        '68747470733a2f2f6578616d706c652e636f6d2f746f6b656e2f312e6a736f6e' +
        '000000000000000000000000000000000000000000000000000000000000';

      let fetchCallIndex = 0;
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchCallIndex++;
        if (url === TEST_RPC_URL) {
          if (fetchCallIndex === 1) {
            return Promise.resolve(createRPCResponse(ownerResult));
          }
          return Promise.resolve(createRPCResponse(tokenURIResult));
        }
        return Promise.resolve(createMetadataResponse({
          name: 'Test NFT #1',
          image: 'https://example.com/image.png'
        }));
      });

      const options = JSON.stringify({
        user_address: ADDRESSES.USER,
        rpc_url: TEST_RPC_URL,
        from_token_id: 1,
        to_token_id: 1
      });

      const result = await PolkaInterface.queryNFTs(ADDRESSES.CONTRACT, '[]', options);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBeNull();
      expect(parsed.tokenCount).toBe(1);
      expect(Number(parsed.tokens[0].tokenId)).toBe(1);
    });

    it('should skip non-existent tokens without failing', async () => {
      const wrongOwner = '0x' + ADDRESSES.USER_2.slice(2).padStart(64, '0');
      global.fetch = vi.fn().mockResolvedValue(createRPCResponse(wrongOwner));

      const options = JSON.stringify({
        user_address: ADDRESSES.USER,
        rpc_url: TEST_RPC_URL,
        from_token_id: 1,
        to_token_id: 3
      });

      const result = await PolkaInterface.queryNFTs(ADDRESSES.CONTRACT, '[]', options);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBeNull();
      expect(parsed.tokenCount).toBe(0);
      expect(parsed.tokens).toEqual([]);
    });

    it('should use IPFS gateway for ipfs:// URIs', async () => {
      const ownerResult = '0x' + ADDRESSES.USER.slice(2).padStart(64, '0');
      const ipfsURI = 'ipfs://QmTest123/metadata.json';
      const ipfsURIHex = Buffer.from(ipfsURI).toString('hex');
      const tokenURIResult = '0x' +
        '0000000000000000000000000000000000000000000000000000000000000020' +
        (ipfsURI.length).toString(16).padStart(64, '0') +
        ipfsURIHex.padEnd(64, '0');

      let fetchUrls = [];
      global.fetch = vi.fn().mockImplementation((url) => {
        fetchUrls.push(url);
        if (url === TEST_RPC_URL) {
          if (fetchUrls.filter(u => u === TEST_RPC_URL).length === 1) {
            return Promise.resolve(createRPCResponse(ownerResult));
          }
          return Promise.resolve(createRPCResponse(tokenURIResult));
        }
        return Promise.resolve(createMetadataResponse({ name: 'IPFS NFT' }));
      });

      const options = JSON.stringify({
        user_address: ADDRESSES.USER,
        rpc_url: TEST_RPC_URL,
        from_token_id: 1,
        to_token_id: 1
      });

      await PolkaInterface.queryNFTs(ADDRESSES.CONTRACT, '[]', options);

      const metadataFetch = fetchUrls.find(url => url.includes('ipfs.io'));
      expect(metadataFetch).toContain('https://ipfs.io/ipfs/QmTest123/metadata.json');
    });

    it('should handle metadata fetch errors gracefully', async () => {
      const ownerResult = '0x' + ADDRESSES.USER.slice(2).padStart(64, '0');
      const tokenURIResult = '0x' +
        '0000000000000000000000000000000000000000000000000000000000000020' +
        '000000000000000000000000000000000000000000000000000000000000001c' +
        '68747470733a2f2f6578616d706c652e636f6d2f312e6a736f6e0000000000';

      let rpcCallCount = 0;
      global.fetch = vi.fn().mockImplementation((url) => {
        if (url === TEST_RPC_URL) {
          rpcCallCount++;
          if (rpcCallCount === 1) {
            return Promise.resolve(createRPCResponse(ownerResult));
          }
          return Promise.resolve(createRPCResponse(tokenURIResult));
        }
        return Promise.reject(new Error('Network error'));
      });

      const options = JSON.stringify({
        user_address: ADDRESSES.USER,
        rpc_url: TEST_RPC_URL,
        from_token_id: 1,
        to_token_id: 1
      });

      const result = await PolkaInterface.queryNFTs(ADDRESSES.CONTRACT, '[]', options);
      const parsed = JSON.parse(result);

      expect(parsed.error).toBeNull();
      expect(parsed.tokens.length).toBe(1);
      expect(parsed.tokens[0].metadata.error).toContain('Network error');
    });
  });
});
