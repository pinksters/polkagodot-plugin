export const CHAIN_IDS = {
  MOONBEAM: '0x504',            // 1284 - Polkadot EVM parachain
  MOONRIVER: '0x505',           // 1285 - Kusama EVM parachain
  MOONBASE_ALPHA: '0x507',      // 1287 - Moonbeam testnet
  ASTAR: '0x250',               // 592 - Polkadot EVM parachain
  WESTEND_ASSET_HUB: '0x190f1b45',  // 420420421 - Westend testnet
  PASEO_ASSET_HUB: '0x190f1b46'     // 420420422 - Paseo testnet
};

export const SELECTORS = {
  OWNER_OF: '0x6352211e',
  TOKEN_URI: '0xc87b56dd',
  TOTAL_SUPPLY: '0x18160ddd',
  NAME: '0x06fdde03',
  SYMBOL: '0x95d89b41',
  EQUIP_HAT: '0x20210749',
  UNEQUIP_HAT: '0x9871bf3c',
  GET_EQUIPPED_HAT: '0x018e8b41'
};

export const ADDRESSES = {
  USER: '0x1234567890abcdef1234567890abcdef12345678',
  USER_2: '0xabcdef1234567890abcdef1234567890abcdef12',
  CONTRACT: '0x0000000000000000000000000000000000000001',
  GAME_MANAGER: '0x0000000000000000000000000000000000000002'
};

export const TEST_RPC_URL = 'https://rpc.test.com';

export const SIGNATURES = {
  VALID: '0x' + '1'.repeat(130),
  TX_HASH: '0x' + 'a'.repeat(64)
};
