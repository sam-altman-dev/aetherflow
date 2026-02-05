#!/usr/bin/env node

/**
 * Simple AetherFlow Memory Compression Test
 * Run with: node test-simple.cjs
 */

const crypto = require('crypto');
const zlib = require('zlib');

const CONSTANTS = {
  V6_MAGIC: 'AetherFlowV6',
  V6_HEADER_SIZE: 96,
  FRACTAL_RATIO: 100 * 1024 * 1024 * 1024,
};

class Tester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      this.failed++;
    }
  }

  assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  summary() {
    console.log('\n' + '='.repeat(70));
    console.log(`✓ Passed: ${this.passed}`);
    console.log(`✗ Failed: ${this.failed}`);
    console.log(`Total: ${this.passed + this.failed}`);
    console.log('='.repeat(70) + '\n');

    if (this.failed === 0) {
      console.log('🎉 All tests passed!\n');
    } else {
      console.log(`⚠️  ${this.failed} test(s) failed\n`);
    }
  }
}

// Compression functions
function normalizeSeed(seed) {
  const seedBuffer = Buffer.alloc(32, 0);
  Buffer.from(seed.slice(0, 32), 'utf8').copy(seedBuffer, 0);
  return seedBuffer;
}

function calculateEntropy(data) {
  if (data.length === 0) return 0;
  const freq = new Uint32Array(256);
  for (let i = 0; i < data.length; i++) freq[data[i]]++;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / data.length;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

function compress(data, seed = 'test') {
  if (!data || data.length === 0) {
    return {
      compressed: Buffer.alloc(0),
      originalSize: 0,
      compressedSize: 0,
      ratio: 1,
      checksum: ''
    };
  }

  const checksum = crypto.createHash('sha256').update(data).digest('hex');
  const entropy = calculateEntropy(data);
  const seedBuffer = normalizeSeed(seed);

  const compressedCount = Math.ceil(data.length / CONSTANTS.FRACTAL_RATIO);
  const payload = Buffer.alloc(Math.max(3, compressedCount * 3));

  for (let i = 0; i < compressedCount; i++) {
    const start = i * CONSTANTS.FRACTAL_RATIO;
    const end = Math.min(start + CONSTANTS.FRACTAL_RATIO, data.length);
    let sum = 0;
    
    for (let j = start; j < end; j++) {
      const seedByte = seedBuffer[j % 32];
      sum = (sum + (data[j] ^ seedByte) * (j - start + 1)) % 0xFFFFFF;
    }
    
    payload.writeUIntBE(sum, i * 3, 3);
  }

  const header = Buffer.alloc(CONSTANTS.V6_HEADER_SIZE);
  header.write(CONSTANTS.V6_MAGIC, 0, 'utf8');
  header.writeUInt32BE(data.length, 12);
  header.writeFloatBE(entropy, 16);
  crypto.createHash('sha256').update(data).digest().copy(header, 20);
  seedBuffer.copy(header, 52);
  header.writeUInt8(6, 84);

  const finalCompressed = Buffer.concat([header, zlib.deflateSync(payload, { level: 9 })]);

  return {
    compressed: finalCompressed,
    originalSize: data.length,
    compressedSize: finalCompressed.length,
    ratio: data.length / finalCompressed.length,
    checksum
  };
}

function decompress(compressed, seed = 'test') {
  if (!compressed || compressed.length < CONSTANTS.V6_HEADER_SIZE) {
    throw new Error('Invalid buffer: too small');
  }

  const magic = compressed.subarray(0, 12).toString('utf8').replace(/\0/g, '');
  if (magic !== CONSTANTS.V6_MAGIC) {
    throw new Error('Invalid magic header');
  }

  const originalSize = compressed.readUInt32BE(12);
  const storedChecksum = compressed.subarray(20, 52);
  const seedBuffer = normalizeSeed(seed);

  const payload = zlib.inflateSync(compressed.subarray(CONSTANTS.V6_HEADER_SIZE));
  const result = Buffer.alloc(originalSize);

  for (let i = 0; i * 3 < payload.length; i++) {
    const sum = payload.readUIntBE(i * 3, 3);
    const start = i * CONSTANTS.FRACTAL_RATIO;
    const end = Math.min(start + CONSTANTS.FRACTAL_RATIO, originalSize);
    const blockSize = end - start;

    const baseValue = Math.floor(sum / blockSize);
    const remainder = sum % blockSize;

    for (let j = 0; j < blockSize; j++) {
      const seedByte = seedBuffer[(start + j) % 32];
      const offset = (seedByte + j) % 256;
      result[start + j] = (baseValue + offset + (j < remainder ? 1 : 0)) % 256;
    }
  }

  const actualChecksum = crypto.createHash('sha256').update(result).digest();
  const verified = storedChecksum.equals(actualChecksum);
  
  return {
    data: result,
    verified,
    originalChecksum: actualChecksum.toString('hex')
  };
}

// Run tests
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║       AetherFlow Compression Test Suite                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const t = new Tester();

// Test 1: Basic roundtrip
t.test('Basic compression/decompression roundtrip', () => {
  const data = Buffer.from('Hello, World! This is a test.');
  const result = compress(data, 'test-seed');
  const decompressed = decompress(result.compressed, 'test-seed');
  
  t.assert(decompressed.verified, 'Checksum verification failed');
  t.assert(Buffer.compare(data, decompressed.data) === 0, 'Data mismatch');
});

// Test 2: Large redundant data
t.test('Large redundant data compression (1MB)', () => {
  const data = Buffer.alloc(1024 * 1024, 'R');
  const result = compress(data, 'redundant-seed');
  
  t.assert(result.ratio > 100, `Expected ratio > 100, got ${result.ratio.toFixed(2)}`);
  t.assert(result.compressedSize < result.originalSize, 'Compressed should be smaller');
});

// Test 3: Random data
t.test('Random data compression (512KB)', () => {
  const data = crypto.randomBytes(512 * 1024);
  const result = compress(data, 'random-seed');
  const decompressed = decompress(result.compressed, 'random-seed');
  
  t.assert(decompressed.verified, 'Verification failed');
  t.assert(Buffer.compare(data, decompressed.data) === 0, 'Data mismatch');
});

// Test 4: Seed consistency
t.test('Same seed produces consistent compression', () => {
  const data = Buffer.alloc(256 * 1024, 'S');
  const result1 = compress(data, 'consistent');
  const result2 = compress(data, 'consistent');
  
  t.assert(
    Buffer.compare(result1.compressed, result2.compressed) === 0,
    'Same seed should produce identical results'
  );
});

// Test 5: Different seeds
t.test('Different seeds produce different compression', () => {
  const data = Buffer.alloc(256 * 1024, 'D');
  const result1 = compress(data, 'seed-a');
  const result2 = compress(data, 'seed-b');
  
  t.assert(
    Buffer.compare(result1.compressed, result2.compressed) !== 0,
    'Different seeds should produce different results'
  );
  
  // Both should decompress correctly
  const dec1 = decompress(result1.compressed, 'seed-a');
  const dec2 = decompress(result2.compressed, 'seed-b');
  t.assert(dec1.verified && dec2.verified, 'Both should decompress correctly');
});

// Test 6: Empty buffer
t.test('Empty buffer handling', () => {
  const data = Buffer.alloc(0);
  const result = compress(data, 'empty');
  
  t.assert(result.originalSize === 0, 'Original size should be 0');
  t.assert(result.compressedSize === 0, 'Compressed size should be 0');
});

// Test 7: Binary data
t.test('Binary data with all byte values', () => {
  const data = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    data[i] = i;
  }
  
  const result = compress(data, 'binary');
  const decompressed = decompress(result.compressed, 'binary');
  
  t.assert(decompressed.verified, 'Verification failed');
  t.assert(Buffer.compare(data, decompressed.data) === 0, 'Binary data mismatch');
});

// Test 8: Invalid seed for decompression
t.test('Wrong seed fails verification', () => {
  const data = Buffer.from('Test data for seed verification');
  const result = compress(data, 'original-seed');
  
  // Decompress with wrong seed
  const decompressed = decompress(result.compressed, 'wrong-seed');
  
  // Should not be verified
  t.assert(!decompressed.verified, 'Should fail with wrong seed');
});

// Test 9: Mixed data types
t.test('Mixed data (text + binary)', () => {
  const text = Buffer.from('Hello World');
  const binary = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);
  const data = Buffer.concat([text, binary, text]);
  
  const result = compress(data, 'mixed');
  const decompressed = decompress(result.compressed, 'mixed');
  
  t.assert(decompressed.verified, 'Verification failed');
  t.assert(Buffer.compare(data, decompressed.data) === 0, 'Mixed data mismatch');
});

// Test 10: Large file (5MB)
t.test('Large file compression (5MB)', () => {
  const data = crypto.randomBytes(5 * 1024 * 1024);
  const result = compress(data, 'large');
  
  t.assert(result.originalSize === 5 * 1024 * 1024, 'Size tracking failed');
  
  const decompressed = decompress(result.compressed, 'large');
  t.assert(decompressed.verified, 'Verification failed for large file');
  t.assert(Buffer.compare(data, decompressed.data) === 0, 'Large file roundtrip failed');
});

// Print summary
t.summary();
