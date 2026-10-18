/**
 * D.6: A simple little-endian binary reader for parsing fixed-size
 * GoldSrc .mdl structures. Each read advances an internal cursor.
 *
 * Usage:
 *   const r = new ByteReader(view, offset);
 *   const name = r.readCString(32);
 *   const count = r.readInt();
 *   for (let i = 0; i < count; i++) {
 *     const x = r.readFloat();
 *     const y = r.readFloat();
 *     const z = r.readFloat();
 *   }
 *
 * For a different region of the same buffer, construct a new reader
 * with the same buffer view but a different start offset — they
 * share the underlying DataView.
 */
export class ByteReader {
  private view: DataView;
  public cursor: number;

  constructor(view: DataView, startOffset: number = 0) {
    this.view = view;
    this.cursor = startOffset;
  }

  /** Move the cursor to an absolute offset. */
  seek(offset: number): void {
    this.cursor = offset;
  }

  /** Read a 4-byte signed little-endian int. */
  readInt(): number {
    const v = this.view.getInt32(this.cursor, true);
    this.cursor += 4;
    return v;
  }

  /** Read a 4-byte little-endian float. */
  readFloat(): number {
    const v = this.view.getFloat32(this.cursor, true);
    this.cursor += 4;
    return v;
  }

  /**
   * Read exactly `n` characters. The result is decoded as ASCII —
   * use for the .mdl format's fixed-width string fields.
   */
  readChars(n: number): string {
    let out = "";
    for (let i = 0; i < n; i++) {
      const c = this.view.getUint8(this.cursor + i);
      if (c === 0) break;
      out += String.fromCharCode(c);
    }
    this.cursor += n;
    return out;
  }

  /**
   * Read up to `maxLen` characters, stopping at the first null
   * byte. Returns the decoded string (trailing null bytes are
   * skipped but still advance the cursor).
   */
  readCString(maxLen: number): string {
    let end = this.cursor;
    while (end < this.cursor + maxLen && this.view.getUint8(end) !== 0) {
      end++;
    }
    const slice = new Uint8Array(this.view.buffer, this.view.byteOffset + this.cursor, end - this.cursor);
    const s = new TextDecoder("latin1").decode(slice);
    this.cursor += maxLen;
    return s;
  }

  /** Read a 3-float vector. */
  readVec3(): [number, number, number] {
    const x = this.readFloat();
    const y = this.readFloat();
    const z = this.readFloat();
    return [x, y, z];
  }
}