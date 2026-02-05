import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { globalMemoryManager, hyperCompressV6, hyperDecompressV6 } from "../shared/compression";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Memory Compression API Routes
  
  /**
   * POST /api/memory/allocate
   * Allocate and compress data in virtual memory
   * Body: { data: string (base64), seed?: string }
   */
  app.post("/api/memory/allocate", (req, res) => {
    try {
      const { data, seed = "default" } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: "data is required" });
      }

      const buffer = Buffer.from(data, 'base64');
      const blockId = globalMemoryManager.allocateCompressed(buffer, seed);

      res.json({
        success: true,
        blockId,
        originalSize: buffer.length,
        message: `Successfully allocated ${buffer.length} bytes in virtual memory`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/read/:blockId
   * Read and decompress data from virtual memory
   */
  app.get("/api/memory/read/:blockId", (req, res) => {
    try {
      const { blockId } = req.params;
      const data = globalMemoryManager.readDecompressed(blockId);
      
      res.json({
        success: true,
        blockId,
        data: data.toString('base64'),
        size: data.length,
        message: `Successfully decompressed ${data.length} bytes`
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/stats
   * Get comprehensive memory statistics
   */
  app.get("/api/memory/stats", (req, res) => {
    try {
      const stats = globalMemoryManager.getStats();
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/memory/free/:blockId
   * Free a memory block
   */
  app.delete("/api/memory/free/:blockId", (req, res) => {
    try {
      const { blockId } = req.params;
      const freed = globalMemoryManager.freeBlock(blockId);

      if (!freed) {
        return res.status(404).json({ error: `Block ${blockId} not found` });
      }

      res.json({
        success: true,
        blockId,
        message: `Successfully freed block ${blockId}`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/memory/compress
   * Direct compression endpoint (without storing in memory)
   * Body: { data: string (base64), seed?: string }
   */
  app.post("/api/memory/compress", (req, res) => {
    try {
      const { data, seed = "default" } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: "data is required" });
      }

      const buffer = Buffer.from(data, 'base64');
      const result = hyperCompressV6(buffer, seed);

      res.json({
        success: true,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        ratio: result.ratio,
        compressionPercent: ((1 - result.compressedSize / result.originalSize) * 100).toFixed(2) + '%',
        compressed: result.compressed.toString('base64'),
        checksum: result.checksum,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/memory/decompress
   * Direct decompression endpoint
   * Body: { compressed: string (base64), seed?: string }
   */
  app.post("/api/memory/decompress", (req, res) => {
    try {
      const { compressed, seed = "default" } = req.body;
      
      if (!compressed) {
        return res.status(400).json({ error: "compressed data is required" });
      }

      const buffer = Buffer.from(compressed, 'base64');
      const result = hyperDecompressV6(buffer, seed);

      res.json({
        success: true,
        verified: result.verified,
        checksum: result.originalChecksum,
        data: result.data.toString('base64'),
        size: result.data.length,
        message: result.verified ? "Data successfully decompressed and verified" : "Warning: Checksum mismatch"
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/memory/export
   * Export current memory state
   */
  app.get("/api/memory/export", (req, res) => {
    try {
      const state = globalMemoryManager.exportState();
      res.setHeader('Content-Type', 'application/json');
      res.send(state);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
