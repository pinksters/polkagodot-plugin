# PolkaGodot Tests

Unit tests for the PolkaGodot addon's JavaScript modules using [Vitest](https://vitest.dev/).

These tests extract JavaScript directly from `polkagodot_export_shell.html` at test runtime. If the HTML file changes, tests automatically test the new code.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
cd tests
npm install
```

## Running Tests

```bash
# Watch mode (re-runs on file changes)
npm test

# Single run
npm run test:run
```

## Test Architecture

`src/html-extractor.js` extracts JavaScript module definitions from `polkagodot_export_shell.html` at runtime and evaluates them in a jsdom environment using a mock Ethereum provider.

## What's Tested

- **ABIEncoder**: Ethereum ABI encoding/decoding for ERC-721 contract calls
- **WalletManager**: EIP-6963 wallet discovery, connection, message signing
- **ChainManager**: Chain verification and network switching (wallet_switchEthereumChain)
- **PolkaInterface**: Main interface exposed to Godot - storage, NFT queries, equip/unequip
- **Storage**: localStorage operations with signature expiration handling

## Mock Provider

Tests use a mock EIP-1193 Ethereum provider (`mocks/ethereum-provider.js`) that simulates:
- Account requests (`eth_requestAccounts`, `eth_accounts`)
- Chain ID queries (`eth_chainId`)
- Message signing (`personal_sign`)
- Contract calls (`eth_call`)
- Transaction sending (`eth_sendTransaction`)
- Chain switching (`wallet_switchEthereumChain`, `wallet_addEthereumChain`)
