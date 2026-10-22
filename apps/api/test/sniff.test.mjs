import test from "node:test";
import assert from "node:assert/strict";
import { sniffImageMime } from "../dist/lib/sniffImage.js";

test("detects jpeg, png, webp and heic from bytes", () => {
  assert.equal(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])), "image/jpeg");
  assert.equal(sniffImageMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffImageMime(Buffer.from("RIFF0000WEBPVP8 ", "ascii")), "image/webp");
  assert.equal(sniffImageMime(Buffer.from("\0\0\0\x18ftypheic", "binary")), "image/heic");
});

test("rejects non-image data even if it would be labelled as an image", () => {
  assert.equal(sniffImageMime(Buffer.from("<html>nope</html>")), null);
  assert.equal(sniffImageMime(Buffer.alloc(0)), null);
});
