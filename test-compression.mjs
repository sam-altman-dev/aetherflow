/**
 * AetherFlow Memory Compression Test Suite
 * 
 * Tests for:
 * - Compression/Decompression roundtrip
 * - Data integrity verification
 * - Compression ratios
 * - Virtual memory management
 * - Cache operations
 */

import crypto from 'crypto';
import { hyperCompressV6, hyperDecompressV6, HyperMemoryManager } from './shared/compression.ts';

class TestRunner {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.tests = [];
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     AetherFlow Memory Compression Test Suite                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.testsPassed++;
      } catch (error) {
        console.log(`✗ ${test.name}`);
        console.log(`  Error: ${error.message}`);
        this.testsFailed++;
      }
    }

    this.printSummary();
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  printSummary() {
    console.log('\n' + '═'.repeat(70));
    console.log(`Tests Passed: ${this.testsPassed}`);
    console.log(`Tests Failed: ${this.testsFailed}`);
    console.log(`Total Tests: ${this.testsPassed + this.testsFailed}`);
    console.log('═'.repeat(70) + '\n');

    if (this.testsFailed === 0) {
      console.log('🎉 All tests passed!\n');
      process.exit(0);
    } else {
      console.log(`⚠️  ${this.testsFailed} test(s) failed\n`);
      process.exit(1);
    }
  }
}

// Test Suite
const runner = new TestRunner();

// Test 1: Basic compression/decompression roundtrip
runner.test('Compression/Decompression Roundtrip (1MB)', () => {
  const originalData = Buffer.alloc(1024 * 1024, 'A');
  const seed = 'test-seed-1';

  const compressed = hyperCompressV6(originalData, seed);
  const decompressed = hyperDecompressV6(compressed.compressed, seed);

  runner.assert(decompressed.verified, 'Checksum verification failed');
  runner.assert(
    Buffer.compare(originalData, decompressed.data) === 0,
    'Decompressed data does not match original'
  );
});

// Test 2: Various data types
runner.test('Compression of Random Data', () => {
  const randomData = crypto.randomBytes(512 * 1024);
  const compressed = hyperCompressV6(randomData, 'random-seed');
  const decompressed = hyperDecompressV6(compressed.compressed, 'random-seed');

  runner.assert(decompressed.verified, 'Random data verification failed');
  runner.assert(
    Buffer.compare(randomData, decompressed.data) === 0,
    'Random data roundtrip failed'
  );
});

// Test 3: Checksum verification
runner.test('Checksum Verification', () => {
  const testData = Buffer.from('Test123456');
  const seed = 'checksum-test';

  const result = hyperCompressV6(testData, seed);
  const decompressed = hyperDecompressV6(result.compressed, seed);

  runner.assert(decompressed.verified, 'Checksum should verify');
  runner.assert(
    result.checksum === decompressed.originalChecksum,
    'Checksums do not match'
  );
});

// Test 4: Seed consistency
runner.test('Seed Consistency for Same Data', () => {
  const testData = Buffer.alloc(256 * 1024, 'B');
  const seed = 'consistent-seed';

  const result1 = hyperCompressV6(testData, seed);
  const result2 = hyperCompressV6(testData, seed);

  runner.assert(
    Buffer.compare(result1.compressed, result2.compressed) === 0,
    'Same seed should produce identical compression'
  );
});

// Test 5: Different seeds produce different results
runner.test('Different Seeds Produce Different Results', () => {
  const testData = Buffer.alloc(256 * 1024, 'C');

  const result1 = hyperCompressV6(testData, 'seed-1');
  const result2 = hyperCompressV6(testData, 'seed-2');

  runner.assert(
    Buffer.compare(result1.compressed, result2.compressed) !== 0,
    'Different seeds should produce different compression'
  );

  // But both should decompress correctly
  const decomp1 = hyperDecompressV6(result1.compressed, 'seed-1');
  const decomp2 = hyperDecompressV6(result2.compressed, 'seed-2');

  runner.assert(decomp1.verified, 'Decompression with seed-1 failed');
  runner.assert(decomp2.verified, 'Decompression with seed-2 failed');
});

// Test 6: Empty buffer handling
runner.test('Empty Buffer Handling', () => {
  const emptyBuffer = Buffer.alloc(0);
  const result = hyperCompressV6(emptyBuffer, 'empty-seed');

  runner.assert(result.originalSize === 0, 'Original size should be 0');
  runner.assert(result.compressedSize === 0, 'Compressed size should be 0');
});

// Test 7: Large data (10MB)
runner.test('Large Data Compression (10MB)', () => {
  const largeData = Buffer.alloc(10 * 1024 * 1024, 'L');
  const compressed = hyperCompressV6(largeData, 'large-seed');
  const decompressed = hyperDecompressV6(compressed.compressed, 'large-seed');

  runner.assert(decompressed.verified, 'Large data verification failed');
  runner.assert(
    Buffer.compare(largeData, decompressed.data) === 0,
    'Large data roundtrip failed'
  );
});

// Test 8: Virtual Memory Manager - Allocation
runner.test('Virtual Memory Manager - Allocation', () => {
  const manager = new HyperMemoryManager();
  const testData = Buffer.from('Virtual Memory Test Data');

  const blockId = manager.allocateCompressed(testData, 'vm-test');

  runner.assert(blockId !== null, 'Block ID should not be null');
  runner.assert(blockId.length > 0, 'Block ID should not be empty');

  const stats = manager.getStats();
  runner.assert(stats.totalBlocks === 1, 'Should have 1 block');
  runner.assert(stats.totalVirtualData.includes('B'), 'Should show virtual size');
});

// Test 9: Virtual Memory Manager - Read
runner.test('Virtual Memory Manager - Read and Decompress', () => {
  const manager = new HyperMemoryManager();
  const originalData = Buffer.from('Read Test Data');

  const blockId = manager.allocateCompressed(originalData, 'read-test');
  const readData = manager.readDecompressed(blockId);

  runner.assert(
    Buffer.compare(originalData, readData) === 0,
    'Read data should match original'
  );
});

// Test 10: Virtual Memory Manager - Free
runner.test('Virtual Memory Manager - Free Block', () => {
  const manager = new HyperMemoryManager();
  const testData = Buffer.alloc(1024 * 1024, 'F');

  const blockId = manager.allocateCompressed(testData, 'free-test');
  let stats = manager.getStats();
  runner.assert(stats.totalBlocks === 1, 'Should have 1 block before free');

  const freed = manager.freeBlock(blockId);
  runner.assert(freed === true, 'Block should be freed');

  stats = manager.getStats();
  runner.assert(stats.totalBlocks === 0, 'Should have 0 blocks after free');
});

// Test 11: Virtual Memory Manager - Multiple Blocks
runner.test('Virtual Memory Manager - Multiple Blocks', () => {
  const manager = new HyperMemoryManager();

  const block1Data = Buffer.alloc(1024 * 1024, 'B');
  const block2Data = Buffer.alloc(512 * 1024, 'C');
  const block3Data = Buffer.alloc(256 * 1024, 'D');

  const id1 = manager.allocateCompressed(block1Data, 'multi-1');
  const id2 = manager.allocateCompressed(block2Data, 'multi-2');
  const id3 = manager.allocateCompressed(block3Data, 'multi-3');

  const stats = manager.getStats();
  runner.assert(stats.totalBlocks === 3, 'Should have 3 blocks');

  // Verify all blocks
  const read1 = manager.readDecompressed(id1);
  const read2 = manager.readDecompressed(id2);
  const read3 = manager.readDecompressed(id3);

  runner.assert(Buffer.compare(block1Data, read1) === 0, 'Block 1 mismatch');
  runner.assert(Buffer.compare(block2Data, read2) === 0, 'Block 2 mismatch');
  runner.assert(Buffer.compare(block3Data, read3) === 0, 'Block 3 mismatch');
});

// Test 12: Compression Ratio
runner.test('Compression Ratio Calculation', () => {
  const redundantData = Buffer.alloc(1024 * 1024, 'R');
  const result = hyperCompressV6(redundantData, 'ratio-test');

  runner.assert(result.ratio > 100, 'Redundant data should compress > 100x');
  runner.assert(
    result.compressedSize < result.originalSize,
    'Compressed should be smaller than original'
  );
});

// Test 13: Export State
runner.test('Virtual Memory Manager - Export State', () => {
  const manager = new HyperMemoryManager();
  const testData = Buffer.alloc(512 * 1024, 'E');

  manager.allocateCompressed(testData, 'export-test');
  const state = manager.exportState();

  runner.assert(typeof state === 'string', 'Export state should be string');
  runner.assert(state.includes('stats'), 'State should include stats');
  runner.assert(state.includes('blocks'), 'State should include blocks');

  const parsed = JSON.parse(state);
  runner.assert(parsed.stats !== undefined, 'Parsed state should have stats');
  runner.assert(parsed.blocks && parsed.blocks.length > 0, 'Should have blocks');
});

// Test 14: Block not found error
runner.test('Virtual Memory Manager - Block Not Found Error', () => {
  const manager = new HyperMemoryManager();

  try {
    manager.readDecompressed('non-existent-id');
    throw new Error('Should have thrown an error');
  } catch (error) {
    runner.assert(
      error.message.includes('not found'),
      'Error should indicate block not found'
    );
  }
});

// Test 15: Writable/Readable buffers through compression
runner.test('Mixed Binary Data Compression', () => {
  const binaryData = Buffer.from([
    0xff, 0xfe, 0xfd, 0xfc, 0x00, 0x01, 0x02, 0x03,
    0x80, 0x81, 0x82, 0x83, 0x7f, 0x7e, 0x7d, 0x7c
  ]);
  const compressed = hyperCompressV6(binaryData, 'binary-test');
  const decompressed = hyperDecompressV6(compressed.compressed, 'binary-test');

  runner.assert(decompressed.verified, 'Binary data verification failed');
  runner.assert(
    Buffer.compare(binaryData, decompressed.data) === 0,
    'Binary data roundtrip failed'
  );
});

// Run all tests
runner.run();
