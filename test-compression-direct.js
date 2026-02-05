/**
 * Direct Memory Compression Test for AetherFlow
 * Tests compression by allocating and compressing data server-side
 */

import http from 'http';

const SERVER_HOST = 'localhost';
const SERVER_PORT = 5000;

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

async function runMemoryCompressionTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   AetherFlow Memory Compression Test - Server Direct');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Wait for server
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
    console.error('✗ Could not connect to server');
    process.exit(1);
  }

  // Test with different data patterns
  const testCases = [
    { name: 'Random Data (Low Compression)', size: 10 * 1024 * 1024, seed: 'random-' + Math.random() },
    { name: 'Repetitive Text (High Compression)', size: 50 * 1024 * 1024, seed: 'text-pattern' },
    { name: 'JSON-like Data (Medium Compression)', size: 25 * 1024 * 1024, seed: 'json-data' },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📦 Testing: ${testCase.name}`);
    console.log(`   Size: ${formatBytes(testCase.size)}`);
    
    try {
      // Create a buffer of specified size with test data
      // Based on seed, create different patterns
      let testData;
      if (testCase.seed.includes('random')) {
        // Random data - won't compress well
        testData = Buffer.alloc(testCase.size);
        for (let i = 0; i < testCase.size; i++) {
          testData[i] = Math.floor(Math.random() * 256);
        }
      } else if (testCase.seed.includes('text')) {
        // Repetitive text - compresses well
        const pattern = 'The quick brown fox jumps over the lazy dog. ';
        let idx = 0;
        testData = Buffer.alloc(testCase.size);
        for (let i = 0; i < testCase.size; i++) {
          testData[i] = pattern.charCodeAt(idx % pattern.length);
          idx++;
        }
      } else {
        // JSON-like structure
        const jsonPattern = '{"name":"user","id":12345,"active":true,"data":"value"}';
        let idx = 0;
        testData = Buffer.alloc(testCase.size);
        for (let i = 0; i < testCase.size; i++) {
          testData[i] = jsonPattern.charCodeAt(idx % jsonPattern.length);
          idx++;
        }
      }

      const dataB64 = testData.toString('base64');
      
      // Get initial stats
      const statsBefore = await makeRequest('GET', '/api/memory/stats');
      const memBefore = statsBefore.data.stats;
      const heapBefore = process.memoryUsage().heapUsed;

      console.log(`   Memory before: ${formatBytes(memBefore.usedCompressedSpace.toString().includes('KB') ? parseInt(memBefore.usedCompressedSpace) * 1024 : 0)}`);

      // Compress
      const startTime = Date.now();
      const allocResult = await makeRequest('POST', '/api/memory/allocate', {
        data: dataB64,
        seed: testCase.seed,
      });
      const allocTime = Date.now() - startTime;

      if (allocResult.status !== 200) {
        console.log(`   ✗ Allocation failed: ${JSON.stringify(allocResult.data)}`);
        continue;
      }

      const blockId = allocResult.data.blockId;
      const originalSize = allocResult.data.originalSize;
      
      // Get stats after
      const statsAfter = await makeRequest('GET', '/api/memory/stats');
      const memAfter = statsAfter.data.stats;
      const heapAfter = process.memoryUsage().heapUsed;

      // Parse the used space
      const usedBefore = memBefore.totalCompressed || 0;
      const usedAfter = memAfter.totalCompressed || 0;
      const virtualBlockSize = Math.max(0, usedAfter - usedBefore);
      
      const compressionRatio = originalSize > 0 ? originalSize / Math.max(1, virtualBlockSize) : 0;
      const spaceSaved = originalSize - Math.max(1, virtualBlockSize);
      const heapIncrease = heapAfter - heapBefore;

      console.log(`   Original Size: ${formatBytes(originalSize)}`);
      console.log(`   Compressed Size: ${formatBytes(Math.max(1, virtualBlockSize))}`);
      console.log(`   Space Saved: ${formatBytes(spaceSaved)} (${((spaceSaved / originalSize) * 100).toFixed(2)}%)`);
      console.log(`   Compression Ratio: 1:${compressionRatio.toFixed(2)}`);
      console.log(`   Compression Time: ${allocTime}ms`);
      console.log(`   Heap Increase: ${formatBytes(heapIncrease)}`);
      console.log(`   ✓ Block ID: ${blockId}`);

      results.push({
        name: testCase.name,
        originalSize,
        compressedSize: Math.max(1, virtualBlockSize),
        spaceSaved,
        compressionRatio,
        allocTime,
        heapIncrease,
        blockId,
      });

      // Cleanup
      await makeRequest('DELETE', `/api/memory/free/${blockId}`);

    } catch (error) {
      console.log(`   ✗ Error: ${error.message}`);
    }
  }

  // Final stats
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   FINAL STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (results.length > 0) {
    console.log('Test Case                      | Ratio  | Saved       | Time');
    console.log('───────────────────────────────┼────────┼─────────────┼──────');

    let totalOriginal = 0;
    let totalCompressed = 0;
    let totalTime = 0;

    for (const result of results) {
      totalOriginal += result.originalSize;
      totalCompressed += result.compressedSize;
      totalTime += result.allocTime;

      const name = result.name.slice(0, 28).padEnd(28);
      const ratio = `1:${result.compressionRatio.toFixed(1)}`.padStart(7);
      const saved = formatBytes(result.spaceSaved).padEnd(11);
      
      console.log(`${name} | ${ratio} | ${saved} | ${result.allocTime}ms`);
    }

    console.log('───────────────────────────────┴────────┴─────────────┴──────');

    const avgRatio = totalOriginal / Math.max(1, totalCompressed);
    const totalSaved = totalOriginal - totalCompressed;
    
    console.log(`\nTOTAL ORIGINAL: ${formatBytes(totalOriginal)}`);
    console.log(`TOTAL COMPRESSED: ${formatBytes(totalCompressed)}`);
    console.log(`TOTAL SAVED: ${formatBytes(totalSaved)} (${((totalSaved / totalOriginal) * 100).toFixed(2)}%)`);
    console.log(`AVERAGE RATIO: 1:${avgRatio.toFixed(2)}`);
    console.log(`TOTAL TIME: ${totalTime}ms`);

    console.log('\n── EXTRAPOLATION ──');
    console.log(`Theoretical 100TB with ratio 1:${avgRatio.toFixed(2)}:`);
    const theoretical100TB = 100 * 1024 * 1024 * 1024 * 1024 / avgRatio;
    console.log(`  → Uses: ${formatBytes(theoretical100TB)}`);
    console.log(`  → Saves: ${formatBytes(100 * 1024 * 1024 * 1024 * 1024 - theoretical100TB)}`);
  }

  console.log('\n✓ Memory compression test completed!\n');
}

runMemoryCompressionTest().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
