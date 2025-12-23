import { describe, it, expect, beforeEach, vi } from 'vitest';

const { PolkaInterface, STORAGE_PREFIX, SIGNATURE_EXPIRATION } = globalThis;

describe('Storage Functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('storeSignature / loadSignature', () => {
    it('should store and load a signature', () => {
      const address = '0x1234567890abcdef';
      const signature = '0xsignature123';

      PolkaInterface.storeSignature(address, signature);
      const loaded = PolkaInterface.loadSignature(address);

      expect(loaded).toBe(signature);
    });

    it('should store signature with timestamp', () => {
      const address = '0xtest';
      const signature = '0xsig';

      PolkaInterface.storeSignature(address, signature);

      const stored = localStorage.getItem(`${STORAGE_PREFIX}signature_${address}`);
      const data = JSON.parse(stored);

      expect(data.signature).toBe(signature);
      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('number');
    });

    it('should return empty string for non-existent signature', () => {
      const loaded = PolkaInterface.loadSignature('0xnonexistent');
      expect(loaded).toBe('');
    });

    it('should expire signature after 7 days', () => {
      const address = '0xexpire';
      const signature = '0xoldsig';

      // Store signature
      PolkaInterface.storeSignature(address, signature);

      // Set timestamp to be 8 days old
      const key = `${STORAGE_PREFIX}signature_${address}`;
      const stored = JSON.parse(localStorage.getItem(key));
      stored.timestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
      localStorage.setItem(key, JSON.stringify(stored));

      const loaded = PolkaInterface.loadSignature(address);

      expect(loaded).toBe('');
      // Expired signature should be removed
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should not expire signature before 7 days', () => {
      const address = '0xvalid';
      const signature = '0xvalidsig';

      PolkaInterface.storeSignature(address, signature);

      // Set timestamp to be 6 days old
      const key = `${STORAGE_PREFIX}signature_${address}`;
      const stored = JSON.parse(localStorage.getItem(key));
      stored.timestamp = Date.now() - (6 * 24 * 60 * 60 * 1000);
      localStorage.setItem(key, JSON.stringify(stored));

      const loaded = PolkaInterface.loadSignature(address);

      expect(loaded).toBe(signature);
    });

    it('should reject non-string wallet_address', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PolkaInterface.storeSignature(123, 'signature');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should reject non-string signature', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PolkaInterface.storeSignature('0xaddress', 123);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return empty string for non-string wallet_address on load', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = PolkaInterface.loadSignature(123);

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle corrupted stored data', () => {
      const key = `${STORAGE_PREFIX}signature_0xcorrupt`;
      localStorage.setItem(key, 'not valid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = PolkaInterface.loadSignature('0xcorrupt');

      expect(result).toBe('');
      consoleSpy.mockRestore();
    });

    it('should remove data without required fields', () => {
      const key = `${STORAGE_PREFIX}signature_0xmissing`;
      localStorage.setItem(key, JSON.stringify({ foo: 'bar' })); // Missing signature and timestamp

      const result = PolkaInterface.loadSignature('0xmissing');

      expect(result).toBe('');
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  describe('storeAuthKey / loadAuthKey', () => {
    it('should store and load an auth key', () => {
      const address = '0xauthtest';
      const authKey = 'my-auth-key-123';

      PolkaInterface.storeAuthKey(address, authKey);
      const loaded = PolkaInterface.loadAuthKey(address);

      expect(loaded).toBe(authKey);
    });

    it('should return empty string for non-existent auth key', () => {
      const loaded = PolkaInterface.loadAuthKey('0xnonexistent');
      expect(loaded).toBe('');
    });

    it('should use correct storage prefix', () => {
      const address = '0xprefixtest';
      const authKey = 'key123';

      PolkaInterface.storeAuthKey(address, authKey);

      const stored = localStorage.getItem(`${STORAGE_PREFIX}authkey_${address}`);
      expect(stored).toBe(authKey);
    });

    it('should reject non-string wallet_address on store', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PolkaInterface.storeAuthKey(null, 'authkey');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should reject non-string auth_key on store', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      PolkaInterface.storeAuthKey('0xaddr', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return empty string for non-string wallet_address on load', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = PolkaInterface.loadAuthKey(undefined);

      expect(result).toBe('');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Storage prefix', () => {
    it('should use polka_ prefix for all storage keys', () => {
      expect(STORAGE_PREFIX).toBe('polka_');
    });

    it('should store signatures with polka_signature_ prefix', () => {
      PolkaInterface.storeSignature('0xtest', 'sig');
      expect(localStorage.getItem('polka_signature_0xtest')).not.toBeNull();
    });

    it('should store auth keys with polka_authkey_ prefix', () => {
      PolkaInterface.storeAuthKey('0xtest', 'key');
      expect(localStorage.getItem('polka_authkey_0xtest')).not.toBeNull();
    });
  });

  describe('Signature expiration constant', () => {
    it('should be 7 days in milliseconds', () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(SIGNATURE_EXPIRATION).toBe(sevenDaysMs);
    });
  });
});
