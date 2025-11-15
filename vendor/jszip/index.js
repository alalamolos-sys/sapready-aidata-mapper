function buildCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc >>>= 1;
      }
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrcTable();

function crc32(input) {
  let crc = 0xffffffff;
  for (let i = 0; i < input.length; i += 1) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ input[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files) {
  const encoder = new TextEncoder();
  const fileDataParts = [];
  const centralDirectoryParts = [];
  const entries = [];

  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, contentBytes.length, true);
    localView.setUint32(22, contentBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);

    localHeader.set(nameBytes, 30);

    fileDataParts.push(localHeader);
    fileDataParts.push(contentBytes);

    entries.push({
      nameBytes,
      contentBytes,
      crc,
      localHeaderOffset: offset,
    });

    offset += localHeader.length + contentBytes.length;
  });

  let centralDirectorySize = 0;

  entries.forEach((entry) => {
    const centralHeader = new Uint8Array(46 + entry.nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, entry.crc, true);
    centralView.setUint32(20, entry.contentBytes.length, true);
    centralView.setUint32(24, entry.contentBytes.length, true);
    centralView.setUint16(28, entry.nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, entry.localHeaderOffset, true);

    centralHeader.set(entry.nameBytes, 46);

    centralDirectoryParts.push(centralHeader);
    centralDirectorySize += centralHeader.length;
  });

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const blobParts = [
    ...fileDataParts.map((part) => part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength)),
    ...centralDirectoryParts.map((part) => part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength)),
    endRecord.buffer.slice(endRecord.byteOffset, endRecord.byteOffset + endRecord.byteLength),
  ];

  return new Blob(blobParts, { type: "application/zip" });
}

export default class JSZip {
  constructor() {
    this.files = [];
  }

  file(name, content) {
    this.files.push({ name, content });
  }

  async generateAsync(options = { type: "blob" }) {
    const blob = buildZip(this.files);
    if (!options || options.type === "blob") {
      return blob;
    }
    if (options.type === "base64") {
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    return blob;
  }
}
