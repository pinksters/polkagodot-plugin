/**
 * Extracts JavaScript modules from the HTML export shell for running unit tests.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, '../../polkagodot_export_shell.html');

// Extracts PolkaGodot-related JavaScript code from the HTML file
export function extractJavaScriptFromHTML() {
  const html = readFileSync(HTML_PATH, 'utf-8');

  // Find the main script block
  const scriptMatch = html.match(/<script>\s*(const GODOT_CONFIG[\s\S]*?)<\/script>/);

  if (!scriptMatch) {
    throw new Error('Could not find JavaScript in HTML file');
  }

  const fullScript = scriptMatch[1];

  // First line of PolkaGodot's module definitions
  const abiStart = fullScript.indexOf('const ABIEncoder = {');
  if (abiStart === -1) {
    throw new Error('Could not find ABIEncoder in HTML');
  }

  // Last line of PolkaGodot's module definitions
  const windowAssign = fullScript.indexOf('window.PolkaInterface = PolkaInterface;');
  if (windowAssign === -1) {
    throw new Error('Could not find window.PolkaInterface assignment in HTML');
  }

  // Extract the code
  let moduleCode = fullScript.slice(abiStart, windowAssign + 'window.PolkaInterface = PolkaInterface;'.length);

  // Remove the automatic WalletManager.init() call so tests can control initialization
  moduleCode = moduleCode.replace(/\n\s*WalletManager\.init\(\);\s*\n/, '\n');

  return moduleCode;
}


// Creates the modules in a jsdom environment
export function loadModulesFromHTML() {
  const moduleCode = extractJavaScriptFromHTML();

  const wrappedCode = `
    (function() {
      ${moduleCode}
      return { ABIEncoder, WalletManager, ChainManager, PolkaInterface, STORAGE_PREFIX, SIGNATURE_EXPIRATION };
    })()
  `;

  // eslint-disable-next-line no-eval
  const modules = eval(wrappedCode);

  return modules;
}


// Reset WalletManager to its default state
export function resetWalletManager(WalletManager) {
  WalletManager.discoveredWallets = new Map();
  WalletManager.provider = null;
  WalletManager.currentAddress = null;
  WalletManager.currentWalletId = null;
  WalletManager.availableAccounts = [];
}
