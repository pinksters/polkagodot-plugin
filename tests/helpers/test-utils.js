import { vi } from 'vitest';
import { createMockProvider } from '../mocks/ethereum-provider.js';

const { WalletManager } = globalThis;

export function addMockWallet(id, options = {}) {
  const provider = options.provider || createMockProvider(options.providerOptions);
  WalletManager.discoveredWallets.set(id, {
    info: {
      uuid: id,
      name: options.name || 'Test Wallet',
      icon: options.icon || '',
      rdns: options.rdns || 'com.test'
    },
    provider
  });
  return provider;
}

export function simulateEIP6963Announce(walletInfo) {
  const event = new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: walletInfo.info,
      provider: walletInfo.provider
    }
  });
  window.dispatchEvent(event);
}

export function createRPCResponse(result) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ result })
  };
}

export function createMetadataResponse(metadata) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(metadata)
  };
}
