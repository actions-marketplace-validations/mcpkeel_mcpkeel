// Builds npm-style archives in memory for the release tests: a tar writer
// small enough to read, so each test can also build a broken archive.
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

/** One 512-byte tar header, with a correct checksum unless told otherwise. */
export function header(name, size, type = "0", { prefix = "", badChecksum = false } = {}) {
  const h = Buffer.alloc(512);
  h.write(name, 0, 100, "utf8");
  h.write("0000644\0", 100);
  h.write("0000000\0", 108);
  h.write("0000000\0", 116);
  h.write(size.toString(8).padStart(11, "0") + "\0", 124);
  h.write("00000000000\0", 136);
  h.write(type, 156);
  h.write("ustar\0", 257);
  h.write("00", 263);
  h.write(prefix, 345, 155, "utf8");
  h.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of h) sum += byte;
  h.write((sum + (badChecksum ? 1 : 0)).toString(8).padStart(6, "0") + "\0 ", 148);
  return h;
}

export function entry(name, data, type = "0", options) {
  const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512);
  body.copy(padded);
  return Buffer.concat([header(name, body.length, type, options), padded]);
}

export function pax(records) {
  const lines = Object.entries(records).map(([k, v]) => {
    const rest = ` ${k}=${v}\n`;
    let length = rest.length + 1;
    while (`${length}${rest}`.length !== length) length++;
    return `${length}${rest}`;
  });
  return lines.join("");
}

/** A gzipped tar of `package/<path>` entries, as npm packs them. */
export function tgz(files, extra = []) {
  const parts = Object.entries(files).map(([path, text]) => entry(`package/${path}`, text));
  return gzipSync(Buffer.concat([...extra, ...parts, Buffer.alloc(1024)]));
}

export const sri = (bytes) => `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
