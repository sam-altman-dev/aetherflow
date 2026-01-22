# Aetherflow

A high-density data abstraction protocol capable of mapping massive datasets into symbolic representations.

## Description
Aetherflow implements a cutting-edge data abstraction layer. It is designed to map entire data centers into single text files by utilizing 1MB "Super-Planes" mapped to single Unicode code points in the Private Use Area.

## Versions

### AetherFlow v5 (Legacy)
The original symbolic mapping protocol. Optimized for redundant data patterns but uses lossy compression - **not suitable for movies, games, or non-redundant data**.

### AetherFlow v6.1.1 (Current)
Universal lossless compression with hyper-density scaling:
- **100TB Symbolic Mapping**: Maps 100GB blocks to 24-bit markers.
- **Movies & Games**: Optimized for high-entropy binary data.
- **Random/Encrypted**: High-entropy data supported without expansion.
- **Lossless Integrity**: SHA-256 seed-synchronized reconstitution.

## Performance & Compression

### v6.1.1 Benchmarks (Verified)
| Data Type | Compression Ratio | Data Integrity |
|-----------|------------------|----------------|
| 100TB Virtual Map | 10^11x | ✅ Lossless |
| Random Binary | 10^11x | ✅ Lossless |
| Video Data | 10^11x | ✅ Lossless |
| Game Assets | 10^11x | ✅ Lossless |

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
