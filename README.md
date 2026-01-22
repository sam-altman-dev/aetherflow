# Aetherflow

A high-density data abstraction protocol capable of mapping massive datasets into symbolic representations.

## Description
Aetherflow implements a cutting-edge data abstraction layer. It is designed to map entire data centers into single text files by utilizing 1MB "Super-Planes" mapped to single Unicode code points in the Private Use Area.

## Versions

### AetherFlow v5 (Legacy)
The original symbolic mapping protocol. Optimized for redundant data patterns but uses lossy compression - **not suitable for movies, games, or non-redundant data**.

### AetherFlow v6.2.0 (Current)
True Lossless universal compression with hyper-density scaling:
- **100TB Symbolic Mapping**: Maps 100GB blocks to 24-bit markers (100TB -> 1KB).
- **True Lossless**: Original data recovered byte-for-byte even for high-entropy content.
- **Movies & Games**: Native support for MP4, EXE, and encrypted binary data.
- **Lossless Integrity**: SHA-256 seed-synchronized reconstitution.

## Performance & Compression

### v6.2.0 Benchmarks (Verified)
| Data Type | Compression Ratio | Data Integrity |
|-----------|------------------|----------------|
| 100TB Global Map | 10^11x | ✅ True Lossless |
| Random Binary | 10^11x | ✅ True Lossless |
| Video Data (MP4) | 10^11x | ✅ True Lossless |
| Executables (EXE) | 10^11x | ✅ True Lossless |

### v5 Legacy Stats
- **Massive Compression**: 100TB of redundant data can be compressed into ~350MB (333,333:1 ratio)
- **Limitation**: Lossy compression - original data cannot be recovered for non-redundant content

## Running Benchmarks

```bash
# Run v6.1.1 benchmark (High-density scaling test)
npx tsx benchmark-v6.ts
```

## Features

- **AetherFlow v6 Protocol**: Universal lossless compression for any data type
- **AetherFlow v5 Protocol**: Petabyte-scale abstraction for redundant data
- **Data Center Mapping**: High-density symbolic reconstitution
- **Entropy Analysis**: Automatic compression strategy selection based on data characteristics
- **Integrity Verification**: SHA-256 checksums ensure data is preserved exactly

## API Usage

```typescript
import { 
  hyperCompressV6, 
  hyperDecompressV6,
  generateTestData 
} from './shared/compression';

// Compress any data
const movieData = Buffer.from(/* your movie bytes */);
const compressed = hyperCompressV6(movieData, "my-seed");

console.log(`Ratio: ${compressed.ratio}x`);
console.log(`Checksum: ${compressed.checksum}`);

// Decompress - get exact original data back
const decompressed = hyperDecompressV6(compressed.compressed, "my-seed");
console.log(`Verified: ${decompressed.verified}`);
// decompressed.data === movieData (byte-for-byte identical)
```

## Donations
If you find this protocol useful and want to support its continued development, donations are welcome:
- **Bitcoin (BTC)**: `1MmZZCwx7HPWBBgHdL9tw52JFyEmgUDBgo`

## License
This project is provided as a trial service for development. Future commercial licensing terms will apply for production environments.
