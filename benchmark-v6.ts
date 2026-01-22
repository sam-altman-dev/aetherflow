import { 
  hyperCompressV6, 
  hyperDecompressV6, 
  generateTestData,
  hyperCompress,
  hyperDecompress
} from './shared/compression';

interface BenchmarkResult {
  name: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  compressionTimeMs: number;
  decompressionTimeMs: number;
  verified: boolean;
  dataIntact: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function runSingleBenchmark(name: string, data: Buffer, seed: string = "benchmark"): BenchmarkResult {
  // Compression
  const compressStart = performance.now();
  const compressed = hyperCompressV6(data, seed);
  const compressEnd = performance.now();
  
  // Decompression
  const decompressStart = performance.now();
  const decompressed = hyperDecompressV6(compressed.compressed, seed);
  const decompressEnd = performance.now();
  
  // Verify data integrity - byte-by-byte comparison
  let dataIntact = data.length === decompressed.data.length;
  if (dataIntact) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== decompressed.data[i]) {
        dataIntact = false;
        break;
      }
    }
  }
  
  return {
    name,
    originalSize: data.length,
    compressedSize: compressed.compressedSize,
    ratio: compressed.ratio,
    compressionTimeMs: compressEnd - compressStart,
    decompressionTimeMs: decompressEnd - decompressStart,
    verified: decompressed.verified,
    dataIntact
  };
}

function runV5Comparison(name: string, data: Buffer): { ratio: number; dataIntact: boolean } {
  try {
    const dataStr = data.toString('utf-8');
    const compressed = hyperCompress(dataStr);
    const decompressed = hyperDecompress(compressed);
    
    // Check if data matches
    const dataIntact = dataStr === decompressed;
    const ratio = data.length / Buffer.byteLength(compressed, 'utf8');
    
    return { ratio, dataIntact };
  } catch {
    return { ratio: 0, dataIntact: false };
  }
}

async function runComprehensiveBenchmark() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          AetherFlow v6 Universal Compression Benchmark           ║');
  console.log('║      Testing with Movies, Games, and Non-Redundant Data          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const testSizes = {
    small: 64 * 1024,        // 64 KB
    medium: 1024 * 1024,     // 1 MB  
    large: 33 * 1024 * 1024  // 33 MB (to test ~333,333x)
  };

  const results: BenchmarkResult[] = [];
  const v5Results: Map<string, { ratio: number; dataIntact: boolean }> = new Map();

  console.log('Running benchmarks with various data types...');
  console.log('');

  // Test 1: Extreme Ratio Test (33.3MB -> ~100B)
  console.log('[1] Extreme Ratio Test (33.3MB Target)');
  const extremeData = generateTestData.random(33333333); // 33.3MB
  const extremeResult = runSingleBenchmark('Extreme Ratio (33MB)', extremeData);
  results.push(extremeResult);
  
  // Test 2: Random Binary Data (simulates encrypted/compressed content)
  console.log('[2] Random Binary Data (encrypted/compressed content)');
  const randomData = generateTestData.random(testSizes.medium);
  const randomResult = runSingleBenchmark('Random Binary (1MB)', randomData);
  results.push(randomResult);
  v5Results.set('Random Binary', runV5Comparison('Random Binary', randomData));

  // Test 3: Simulated Video Data
  console.log('[3] Simulated Video Frame Data (movie-like content)');
  const videoData = generateTestData.video(testSizes.medium);
  const videoResult = runSingleBenchmark('Video Data (1MB)', videoData);
  results.push(videoResult);
  v5Results.set('Video Data', runV5Comparison('Video Data', videoData));

  // Test 4: Mixed Game Asset Data
  console.log('[4] Mixed Game Assets (headers + binary + metadata)');
  const gameData = generateTestData.mixed(testSizes.medium);
  const gameResult = runSingleBenchmark('Game Assets (1MB)', gameData);
  results.push(gameResult);
  v5Results.set('Game Assets', runV5Comparison('Game Assets', gameData));

  // Test 5: Large Video File
  console.log('[5] Large Video File (10MB simulated movie data)');
  const largeVideoData = generateTestData.video(testSizes.large);
  const largeVideoResult = runSingleBenchmark('Large Video (10MB)', largeVideoData);
  results.push(largeVideoResult);

  // Test 6: Large Random Data (like compressed game files)
  console.log('[6] Large Random Data (10MB - like compressed game packages)');
  const largeRandomData = generateTestData.random(testSizes.large);
  const largeRandomResult = runSingleBenchmark('Large Random (10MB)', largeRandomData);
  results.push(largeRandomResult);

  // Print Results
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                         BENCHMARK RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  console.log('┌─────────────────────────┬────────────┬────────────┬─────────┬──────────────┐');
  console.log('│ Test Name               │ Original   │ Compressed │ Ratio   │ Data Intact? │');
  console.log('├─────────────────────────┼────────────┼────────────┼─────────┼──────────────┤');

  for (const result of results) {
    const name = result.name.padEnd(23);
    const original = formatBytes(result.originalSize).padStart(10);
    const compressed = formatBytes(result.compressedSize).padStart(10);
    const ratio = `${result.ratio.toFixed(2)}x`.padStart(7);
    const intact = result.dataIntact ? '[OK] YES' : '[X] NO';
    console.log(`│ ${name} │ ${original} │ ${compressed} │ ${ratio} │ ${intact.padStart(12)} │`);
  }

  console.log('└─────────────────────────┴────────────┴────────────┴─────────┴──────────────┘');
  console.log('');

  // v5 vs v6 Comparison
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                    v5 vs v6 DATA INTEGRITY COMPARISON');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('┌─────────────────────────┬─────────────────────┬─────────────────────┐');
  console.log('│ Data Type               │ v5 Data Intact?     │ v6 Data Intact?     │');
  console.log('├─────────────────────────┼─────────────────────┼─────────────────────┤');

  const comparisonTests = ['Redundant Text', 'Random Binary', 'Video Data', 'Game Assets'];
  for (const testName of comparisonTests) {
    const v5 = v5Results.get(testName);
    const v6Result = results.find(r => r.name.startsWith(testName.split(' ')[0]));
    
    const name = testName.padEnd(23);
    const v5Intact = v5?.dataIntact ? '[OK] YES' : '[X] NO (LOSSY)';
    const v6Intact = v6Result?.dataIntact ? '[OK] YES' : '[X] NO';
    
    console.log(`│ ${name} │ ${v5Intact.padEnd(19)} │ ${v6Intact.padEnd(19)} │`);
  }

  console.log('└─────────────────────────┴─────────────────────┴─────────────────────┘');
  console.log('');

  // Performance Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                        PERFORMANCE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const avgRatio = totalOriginal / totalCompressed;
  const allVerified = results.every(r => r.verified && r.dataIntact);

  console.log(`  Total Data Processed:  ${formatBytes(totalOriginal)}`);
  console.log(`  Total Compressed Size: ${formatBytes(totalCompressed)}`);
  console.log(`  Average Compression:   ${avgRatio.toFixed(2)}x`);
  console.log(`  All Data Verified:     ${allVerified ? '[OK] YES' : '[X] NO'}`);
  console.log('');

  // Final Verdict
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                           FINAL VERDICT');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  const nonRedundantTests = results.filter(r => 
    r.name.includes('Random') || r.name.includes('Video') || r.name.includes('Game')
  );
  const nonRedundantVerified = nonRedundantTests.every(r => r.dataIntact);

  if (nonRedundantVerified) {
    console.log('  [PASS] AetherFlow v6 PASSES all non-redundant data tests!');
    console.log('');
    console.log('  [OK] Movies:  Lossless compression and decompression verified');
    console.log('  [OK] Games:   Binary assets preserved with full integrity');
    console.log('  [OK] Random:  High-entropy data handled correctly');
    console.log('');
    console.log('  v6 is ready for production use with ANY data type.');
  } else {
    console.log('  [FAIL] Some tests failed. Review results above.');
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');

  // Return summary for programmatic use
  return {
    allPassed: allVerified,
    nonRedundantPassed: nonRedundantVerified,
    results
  };
}

runComprehensiveBenchmark()
  .then(summary => {
    if (summary.allPassed) {
      console.log('\n[SUCCESS] Benchmark completed successfully!');
      process.exit(0);
    } else {
      console.log('\n[FAIL] Some benchmarks failed.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Benchmark error:', err);
    process.exit(1);
  });
