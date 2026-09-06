import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import * as CFB from "cfb";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? "report/hwp-extracted.txt";

if (!inputPath) {
  console.error("Usage: node tools/extract-hwp-text.mjs <file.hwp> [output.txt]");
  process.exit(1);
}

const file = fs.readFileSync(inputPath);
const cfb = CFB.read(file, { type: "buffer" });
const entries = cfb.FullPaths.map((fullPath, index) => ({ fullPath, content: cfb.FileIndex[index]?.content }))
  .filter((entry) => entry.content && /BodyText\/Section\d+$/i.test(entry.fullPath))
  .sort((a, b) => a.fullPath.localeCompare(b.fullPath, "en", { numeric: true }));

const headerEntry = cfb.FullPaths.map((fullPath, index) => ({ fullPath, content: cfb.FileIndex[index]?.content }))
  .find((entry) => /FileHeader$/i.test(entry.fullPath));
const isCompressed = headerEntry?.content ? Boolean(headerEntry.content.readUInt32LE(36) & 1) : true;

function unpack(content) {
  if (!isCompressed) return Buffer.from(content);
  try {
    return zlib.inflateRawSync(Buffer.from(content));
  } catch {
    try {
      return zlib.inflateSync(Buffer.from(content));
    } catch {
      return Buffer.from(content);
    }
  }
}

function readRecords(buffer) {
  const pieces = [];
  let offset = 0;

  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32LE(offset);
    offset += 4;

    const tagId = header & 0x3ff;
    let size = header >>> 20;
    if (size === 0xfff) {
      if (offset + 4 > buffer.length) break;
      size = buffer.readUInt32LE(offset);
      offset += 4;
    }

    if (size < 0 || offset + size > buffer.length) break;
    const record = buffer.subarray(offset, offset + size);
    offset += size;

    if (tagId === 67) {
      pieces.push(record.toString("utf16le"));
    }
  }

  return pieces.join("\n");
}

function clean(text) {
  return text
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => /[가-힣]/.test(line))
    .join("\n");
}

const rawText = entries.map((entry) => readRecords(unpack(entry.content))).join("\n");
const output = clean(rawText);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");

console.log(`sections=${entries.length}`);
console.log(`compressed=${isCompressed}`);
console.log(`chars=${output.length}`);
console.log(outputPath);
