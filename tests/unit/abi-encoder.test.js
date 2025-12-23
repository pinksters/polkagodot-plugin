import { describe, it, expect } from 'vitest';

const { ABIEncoder } = globalThis;

describe('ABIEncoder', () => {
  describe('encodeAddress', () => {
    it('should encode a valid Ethereum address', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      const encoded = ABIEncoder.encodeAddress(address);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('0000000000000000000000001234567890abcdef1234567890abcdef12345678');
    });

    it('should handle address with 0x prefix correctly', () => {
      const address = '0xAbCdEf1234567890abcdef1234567890AbCdEf12';
      const encoded = ABIEncoder.encodeAddress(address);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('000000000000000000000000abcdef1234567890abcdef1234567890abcdef12');
    });

    it('should pad shorter addresses', () => {
      const address = '0x1234';
      const encoded = ABIEncoder.encodeAddress(address);

      expect(encoded).toHaveLength(64);
      expect(encoded.endsWith('1234')).toBe(true);
    });
  });

  describe('encodeUint256', () => {
    it('should encode zero', () => {
      const encoded = ABIEncoder.encodeUint256(0);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('0'.repeat(64));
    });

    it('should encode small numbers', () => {
      const encoded = ABIEncoder.encodeUint256(1);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('0'.repeat(63) + '1');
    });

    it('should encode larger numbers', () => {
      const encoded = ABIEncoder.encodeUint256(255);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('0'.repeat(62) + 'ff');
    });

    it('should handle BigInt values', () => {
      const bigValue = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');
      const encoded = ABIEncoder.encodeUint256(bigValue);

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('f'.repeat(64));
    });

    it('should handle string numbers', () => {
      const encoded = ABIEncoder.encodeUint256('1000');

      expect(encoded).toHaveLength(64);
      expect(encoded).toBe('0'.repeat(61) + '3e8');
    });
  });

  describe('decodeAddress', () => {
    it('should decode a valid padded address', () => {
      const data = '0x0000000000000000000000001234567890abcdef1234567890abcdef12345678';
      const decoded = ABIEncoder.decodeAddress(data);

      expect(decoded).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should return null for empty data', () => {
      expect(ABIEncoder.decodeAddress('')).toBeNull();
      expect(ABIEncoder.decodeAddress(null)).toBeNull();
      expect(ABIEncoder.decodeAddress(undefined)).toBeNull();
    });

    it('should return null for "0x"', () => {
      expect(ABIEncoder.decodeAddress('0x')).toBeNull();
    });

    it('should extract last 40 characters', () => {
      const data = 'ffffffffffffffffffffffff1234567890abcdef1234567890abcdef12345678';
      const decoded = ABIEncoder.decodeAddress(data);

      expect(decoded).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should return lowercase address', () => {
      const data = '0x000000000000000000000000ABCDEF1234567890ABCDEF1234567890ABCDEF12';
      const decoded = ABIEncoder.decodeAddress(data);

      expect(decoded).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });
  });

  describe('decodeUint256', () => {
    it('should decode zero', () => {
      const data = '0x' + '0'.repeat(64);
      const decoded = ABIEncoder.decodeUint256(data);

      expect(decoded).toBe(0);
    });

    it('should decode small numbers', () => {
      const data = '0x' + '0'.repeat(63) + '1';
      const decoded = ABIEncoder.decodeUint256(data);

      expect(decoded).toBe(1);
    });

    it('should decode hex values', () => {
      const data = '0x' + '0'.repeat(62) + 'ff';
      const decoded = ABIEncoder.decodeUint256(data);

      expect(decoded).toBe(255);
    });

    it('should handle data without 0x prefix', () => {
      const data = '0'.repeat(62) + '64'; // 100 in hex
      const decoded = ABIEncoder.decodeUint256(data);

      expect(decoded).toBe(100);
    });

    it('should return 0 for empty data', () => {
      expect(ABIEncoder.decodeUint256('')).toBe(0);
      expect(ABIEncoder.decodeUint256(null)).toBe(0);
      expect(ABIEncoder.decodeUint256('0x')).toBe(0);
    });
  });

  describe('decodeString', () => {
    it('should decode a valid ABI-encoded string', () => {
      // Encoded "Hello"
      // Offset (32 bytes): 0x20 = 32
      // Length (32 bytes): 0x05 = 5
      // Data: "Hello" in hex = 48656c6c6f
      const data = '0x' +
        '0000000000000000000000000000000000000000000000000000000000000020' + // offset
        '0000000000000000000000000000000000000000000000000000000000000005' + // length = 5
        '48656c6c6f000000000000000000000000000000000000000000000000000000';  // "Hello" padded

      const decoded = ABIEncoder.decodeString(data);
      expect(decoded).toBe('Hello');
    });

    it('should return empty string for empty data', () => {
      expect(ABIEncoder.decodeString('')).toBe('');
      expect(ABIEncoder.decodeString(null)).toBe('');
      expect(ABIEncoder.decodeString('0x')).toBe('');
    });

    it('should return empty string for data too short', () => {
      const shortData = '0x0000000000000000000000000000000000000000000000000000000000000020';
      expect(ABIEncoder.decodeString(shortData)).toBe('');
    });

    it('should handle longer strings', () => {
      // Encoded "https://example.com/metadata/1.json"
      const data = '0x' +
        '0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000023' + // length = 35
        '68747470733a2f2f6578616d706c652e636f6d2f6d657461646174612f312e' +
        '6a736f6e0000000000000000000000000000000000000000000000000000000000';

      const decoded = ABIEncoder.decodeString(data);
      expect(decoded).toBe('https://example.com/metadata/1.json');
    });
  });

  describe('buildCallData', () => {
    it('should build call data for ownerOf', () => {
      const tokenId = ABIEncoder.encodeUint256(1);
      const callData = ABIEncoder.buildCallData('ownerOf', tokenId);

      expect(callData).toBe('0x6352211e' + '0'.repeat(63) + '1');
    });

    it('should build call data for tokenURI', () => {
      const tokenId = ABIEncoder.encodeUint256(42);
      const callData = ABIEncoder.buildCallData('tokenURI', tokenId);

      expect(callData).toBe('0xc87b56dd' + '0'.repeat(62) + '2a');
    });

    it('should build call data for totalSupply (no params)', () => {
      const callData = ABIEncoder.buildCallData('totalSupply');

      expect(callData).toBe('0x18160ddd');
    });

    it('should build call data for name', () => {
      const callData = ABIEncoder.buildCallData('name');

      expect(callData).toBe('0x06fdde03');
    });

    it('should build call data for symbol', () => {
      const callData = ABIEncoder.buildCallData('symbol');

      expect(callData).toBe('0x95d89b41');
    });

    it('should throw for unknown function', () => {
      expect(() => {
        ABIEncoder.buildCallData('unknownFunction');
      }).toThrow('Unknown function: unknownFunction');
    });

    it('should concatenate multiple parameters', () => {
      const param1 = ABIEncoder.encodeUint256(1);
      const param2 = ABIEncoder.encodeUint256(2);
      const callData = ABIEncoder.buildCallData('ownerOf', param1, param2);

      expect(callData).toBe('0x6352211e' + param1 + param2);
    });
  });

  describe('selectors', () => {
    it('should have correct function selectors', () => {
      expect(ABIEncoder.selectors.ownerOf).toBe('0x6352211e');
      expect(ABIEncoder.selectors.tokenURI).toBe('0xc87b56dd');
      expect(ABIEncoder.selectors.totalSupply).toBe('0x18160ddd');
      expect(ABIEncoder.selectors.name).toBe('0x06fdde03');
      expect(ABIEncoder.selectors.symbol).toBe('0x95d89b41');
    });
  });
});
