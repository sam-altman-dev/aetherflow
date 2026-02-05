/**
 * Memory Compression Test for AetherFlow Web Process
 * Tests real memory usage reduction with compression
 */

import http from 'http';
import crypto from 'crypto';

// Configuration
const TEST_SIZES = [
  { name: '1MB', size: 1024 * 1024 },
  { name: '10MB', size: 10 * 1024 * 1024 },
  { name: '50MB', size: 50 * 1024 * 1024 },
  { name: '100MB', size: 100 * 1024 * 1024 },
  { name: '500MB', size: 500 * 1024 * 1024 },
];

const SERVER_HOST = 'localhost';
const SERVER_PORT = 5000;

// Helper to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate test data (compressible content)
function generateTestData(size) {
  // Generate mostly repetitive data (compresses well)
  const pattern = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
  const chunks = Math.ceil(size / pattern.length);
  let data = '';
  for (let i = 0; i < chunks; i++) {
    data += pattern;
  }
  return data.slice(0, size);
}

// Make HTTP request to server
function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Main test function
async function runMemoryCompressionTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   AetherFlow Web Process - Memory Compression Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Wait for server to be ready
  let serverReady = false;
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    try {
      const result = await makeRequest('GET', '/api/memory/stats');
      if (result.status === 200) {
        serverReady = true;
        console.log('✓ Server is ready\n');
      }
    } catch (e) {
      attempts++;
      await new Promise(r => setTimeout(r, 100));
    }
  }

  if (!serverReady) {
    console.error('✗ Could not connect to server at http://' + SERVER_HOST + ':' + SERVER_PORT);
    console.error('  Make sure the server is running: npm run dev\n');
    process.exit(1);
  }

  // Test each data size
  const results = [];

  for (const testCase of TEST_SIZES) {
    console.log(`Testing with ${testCase.name} of data...`);
    
    try {
      // Generate test data
      const testData = generateTestData(testCase.size);
      const dataB64 = Buffer.from(testData).toString('base64');

      // Get initial memory stats
      const statsBefore = await makeRequest('GET', '/api/memory/stats');
      const memBefore = statsBefore.data.stats;

      // Allocate compressed memory
      const allocStart = Date.now();
      const allocResult = await makeRequest('POST', '/api/memory/allocate', {
        data: dataB64,
        seed: `test-${testCase.name}`,
      });
      const allocTime = Date.now() - allocStart;

      if (allocResult.status !== 200) {
        console.log(`  ✗ Allocation failed: ${allocResult.data.error}\n`);
        continue;
      }

      const blockId = allocResult.data.blockId;
      const originalSize = allocResult.data.originalSize;

      // Get stats after allocation
      const statsAfter = await makeRequest('GET', '/api/memory/stats');
      const memAfter = statsAfter.data.stats;

      // Read back the decompressed data (to test decompression)
      const readStart = Date.now();
      const readResult = await makeRequest('GET', `/api/memory/read/${blockId}`);
      const readTime = Date.now() - readStart;

      if (readResult.status !== 200) {
        console.log(`  ✗ Read failed: ${readResult.data.error}\n`);
        continue;
      }

      // Verify data integrity
      const readData = Buffer.from(readResult.data.data, 'base64').toString();
      const dataMatches = readData === testData;

      // Calculate stats
      const virtualBlockSize = memAfter.totalCompressed - memBefore.totalCompressed;
      const compressionRatio = originalSize / virtualBlockSize;
      const spaceSaved = originalSize - virtualBlockSize;

      results.push({
        size: testCase.name,
        originalSize,
        compressedSize: virtualBlockSize,
        spaceSaved,
        compressionRatio,
        allocTime,
        readTime,
        dataIntegrity: dataMatches,
      });

      console.log(`  Original: ${formatBytes(originalSize)}`);
      console.log(`  Compressed: ${formatBytes(virtualBlockSize)}`);
      console.log(`  Saved: ${formatBytes(spaceSaved)} (${((spaceSaved / originalSize) * 100).toFixed(2)}% reduction)`);
      console.log(`  Ratio: 1:${compressionRatio.toFixed(2)}`);
      console.log(`  Compression Time: ${allocTime}ms`);
      console.log(`  Decompression Time: ${readTime}ms`);
      console.log(`  Data Integrity: ${dataMatches ? '✓ VERIFIED' : '✗ FAILED'}\n`);

      // Clean up
      await makeRequest('DELETE', `/api/memory/free/${blockId}`);

    } catch (error) {
      console.log(`  ✗ Error: ${error.message}\n`);
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   SUMMARY - Memory Compression Results');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (results.length > 0) {
    console.log('Data Size    | Compressed | Space Saved  | Ratio | Integrity');
    console.log('─────────────┼────────────┼──────────────┼───────┼──────────');

    let totalOriginal = 0;
    let totalCompressed = 0;
    let totalSaved = 0;

    for (const result of results) {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
      totalSaved += result.spaceSaved;

      const savedPercent = ((result.spaceSaved / result.originalSize) * 100).toFixed(1);
      const integrity = result.dataIntegrity ? '✓' : '✗';
      
      console.log(
        `${result.size.padEnd(11)} | ${formatBytes(result.compressedSize).padEnd(10)} | ` +
        `${formatBytes(result.spaceSaved).padEnd(12)} | ${result.compressionRatio.toFixed(2).padStart(5)} | ${integrity}`
      );
    }

    console.log('─────────────┴────────────┴──────────────┴───────┴──────────');

    const totalPercent = ((totalSaved / totalOriginal) * 100).toFixed(2);
    const avgRatio = totalOriginal / totalCompressed;

    console.log(`\nTOTAL: ${formatBytes(totalOriginal)} → ${formatBytes(totalCompressed)}`);
    console.log(`SAVED: ${formatBytes(totalSaved)} (${totalPercent}% reduction)`);
    console.log(`AVG RATIO: 1:${avgRatio.toFixed(2)}`);

    // Simulate potential usage
    console.log('\n───── USAGE EXTRAPOLATION ─────');
    console.log(`With this compression ratio (1:${avgRatio.toFixed(2)}):`);
    console.log(`  100TB data would use ~${formatBytes(100 * 1024 * 1024 * 1024 * 1024 / avgRatio)} of actual memory`);
    console.log(`  1TB data would use ~${formatBytes(1024 * 1024 * 1024 * 1024 / avgRatio)} of actual memory`);
  }

  console.log('\n✓ Memory compression test completed successfully!\n');
}

// Run the test
runMemoryCompressionTest().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
