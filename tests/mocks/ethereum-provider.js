import { vi } from 'vitest';
import { ADDRESSES, CHAIN_IDS, SIGNATURES } from '../constants.js';

export function createMockProvider(options = {}) {
  const accounts = options.accounts || [ADDRESSES.USER];
  const chainId = options.chainId || CHAIN_IDS.MOONBEAM;
  const callResult = options.callResult || '0x';
  const customResponses = options.customResponses || {};
  const receiptOptions = options.receipt || {};

  return {
    request: vi.fn(async ({ method, params }) => {
      if (customResponses[method]) {
        const response = customResponses[method];
        if (typeof response === 'function') return response(params);
        if (response instanceof Error) throw response;
        return response;
      }

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return accounts;
        case 'eth_chainId':
          return chainId;
        case 'personal_sign':
          return SIGNATURES.VALID;
        case 'eth_call':
          return callResult;
        case 'eth_sendTransaction':
          return SIGNATURES.TX_HASH;
        case 'eth_getTransactionReceipt':
          return {
            blockNumber: receiptOptions.blockNumber || '0x1',
            status: receiptOptions.status !== undefined ? receiptOptions.status : '0x1',
            transactionHash: params[0]
          };
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
          return null;
        case 'wallet_requestPermissions':
          return [{ parentCapability: 'eth_accounts' }];
        default:
          throw new Error(`Unhandled method: ${method}`);
      }
    })
  };
}


// Create a mock provider that throws error 4902 (chain not added) on switch
export function createMockProviderWithChainNotAdded(options = {}) {
  const error = new Error('Chain not found');
  error.code = 4902;
  return createMockProvider({
    ...options,
    customResponses: { ...options.customResponses, 'wallet_switchEthereumChain': error }
  });
}


// Set up window.ethereum with a mock provider
export function setupWindowEthereum(provider) {
  global.window = global.window || {};
  global.window.ethereum = provider;
}


// Clean up window.ethereum
export function cleanupWindowEthereum() {
  if (global.window) {
    delete global.window.ethereum;
  }
}
