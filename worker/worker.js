// Dumb blob store for Money Tracker sync. It only ever sees an opaque 64-hex id and
// ciphertext it cannot read. Cloudflare Worker + one KV namespace bound as BLOBS.
const headers = {
  "access-control-allow-origin": "*", // no cookies involved; data is encrypted; the id is a 256-bit secret
  "access-control-allow-methods": "GET,PUT,OPTIONS",
  "access-control-allow-headers": "*",
  "cache-control": "no-store",
};
const MAX = 5_000_000; // bytes; a KV value may be 25 MiB, this app's data is a few hundred KB

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers });
    const id = new URL(req.url).pathname.slice(1);
    if (!/^[0-9a-f]{64}$/.test(id)) return new Response("bad id", { status: 400, headers });
    if (req.method === "PUT") {
      if (Number(req.headers.get("content-length")) > MAX) return new Response("too big", { status: 413, headers });
      const body = await req.arrayBuffer();
      if (body.byteLength > MAX) return new Response("too big", { status: 413, headers });
      await env.BLOBS.put(id, body);
      return new Response("ok", { headers });
    }
    const blob = await env.BLOBS.get(id, "arrayBuffer");
    return new Response(blob, { status: blob ? 200 : 404, headers });
  },
};
