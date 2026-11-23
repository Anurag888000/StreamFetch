import zlib from 'zlib';

export interface ZipEntryMeta {
  name: string;
  nameBuf: Buffer;
  crc: number;
  size: number;
  localOffset: number;
}

/**
 * Zero-dependency streaming ZIP builder (Store compression, method 0).
 * Generates valid standard PKZip 2.0 archives that stream directly over HTTP.
 */
export class StreamingZip {
  private offset = 0;
  private entries: ZipEntryMeta[] = [];
  private currentEntry: {
    name: string;
    nameBuf: Buffer;
    crc: number;
    size: number;
    localOffset: number;
  } | null = null;

  /**
   * Start a new file entry in the ZIP stream.
   * Returns the Local File Header buffer to send to the client.
   */
  startFile(filename: string): Buffer {
    const cleanName = filename.replace(/[\\/]/g, '_').trim() || 'file';
    const nameBuf = Buffer.from(cleanName, 'utf8');
    const localOffset = this.offset;

    // 30 bytes Local File Header
    const loc = Buffer.alloc(30);
    loc.writeUInt32LE(0x04034b50, 0); // Signature
    loc.writeUInt16LE(20, 4);         // Version needed (2.0)
    loc.writeUInt16LE(8, 6);          // Bit flag: bit 3 set (Data Descriptor present)
    loc.writeUInt16LE(0, 8);          // Compression: 0 (Store)
    loc.writeUInt16LE(0, 10);         // Mod time
    loc.writeUInt16LE(0, 12);         // Mod date
    loc.writeUInt32LE(0, 14);         // CRC-32 (0 because bit 3 is set)
    loc.writeUInt32LE(0, 18);         // Compressed size (0)
    loc.writeUInt32LE(0, 22);         // Uncompressed size (0)
    loc.writeUInt16LE(nameBuf.length, 26); // Filename length
    loc.writeUInt16LE(0, 28);         // Extra field length

    const header = Buffer.concat([loc, nameBuf]);
    this.offset += header.length;

    this.currentEntry = {
      name: cleanName,
      nameBuf,
      crc: 0,
      size: 0,
      localOffset,
    };

    return header;
  }

  /**
   * Process a chunk of file data for the current entry.
   * Updates running CRC32 and byte count.
   */
  processChunk(chunk: Buffer): void {
    if (!this.currentEntry) return;
    this.currentEntry.crc = zlib.crc32(chunk, this.currentEntry.crc);
    this.currentEntry.size += chunk.length;
    this.offset += chunk.length;
  }

  /**
   * End current file entry.
   * Returns Data Descriptor buffer to send to the client.
   */
  endFile(): Buffer {
    if (!this.currentEntry) {
      return Buffer.alloc(0);
    }

    const { crc, size } = this.currentEntry;
    this.entries.push({ ...this.currentEntry });
    this.currentEntry = null;

    // 16 bytes Data Descriptor (Signature + CRC + CompSize + UncompSize)
    const desc = Buffer.alloc(16);
    desc.writeUInt32LE(0x08074b50, 0);
    desc.writeUInt32LE(crc, 4);
    desc.writeUInt32LE(size, 8);
    desc.writeUInt32LE(size, 12);

    this.offset += desc.length;
    return desc;
  }

  /**
   * Finalize the ZIP archive after all files are written.
   * Returns Central Directory headers and End of Central Directory Record (EOCD).
   */
  finalize(): Buffer {
    const cdChunks: Buffer[] = [];
    const cdStart = this.offset;

    for (const entry of this.entries) {
      // 46 bytes Central Directory File Header
      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0); // Signature
      cd.writeUInt16LE(20, 4);         // Version made by (2.0)
      cd.writeUInt16LE(20, 6);         // Version needed (2.0)
      cd.writeUInt16LE(8, 8);          // Bit flag: bit 3
      cd.writeUInt16LE(0, 10);         // Compression: Store (0)
      cd.writeUInt16LE(0, 12);         // Mod time
      cd.writeUInt16LE(0, 14);         // Mod date
      cd.writeUInt32LE(entry.crc, 16); // CRC-32
      cd.writeUInt32LE(entry.size, 20);// Compressed size
      cd.writeUInt32LE(entry.size, 24);// Uncompressed size
      cd.writeUInt16LE(entry.nameBuf.length, 28);
      cd.writeUInt16LE(0, 30);         // Extra field length
      cd.writeUInt16LE(0, 32);         // Comment length
      cd.writeUInt16LE(0, 34);         // Disk start
      cd.writeUInt16LE(0, 36);         // Internal attributes
      cd.writeUInt32LE(0, 38);         // External attributes
      cd.writeUInt32LE(entry.localOffset, 42); // Relative offset of local header

      cdChunks.push(cd, entry.nameBuf);
      this.offset += cd.length + entry.nameBuf.length;
    }

    const cdSize = this.offset - cdStart;

    // 22 bytes End of Central Directory Record
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);                    // Disk number
    eocd.writeUInt16LE(0, 6);                    // Disk with CD
    eocd.writeUInt16LE(this.entries.length, 8);  // Entries on disk
    eocd.writeUInt16LE(this.entries.length, 10); // Total entries
    eocd.writeUInt32LE(cdSize, 12);              // CD size
    eocd.writeUInt32LE(cdStart, 16);             // CD offset
    eocd.writeUInt16LE(0, 20);                   // Comment length

    cdChunks.push(eocd);
    return Buffer.concat(cdChunks);
  }
}

