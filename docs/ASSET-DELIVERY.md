# Asset delivery: why `tsmod.zip` must be chunked

**Status:** decided, not yet implemented
**Artifact:** `webxash/public/hl/tsmod.zip` — 516,960,756 bytes (493 MiB / 517 MB decimal)
**Related:** `specialists-browser-cloud-architecture.md` §3, §8.3 (Ernie), `vite-asset-headers.mjs`

Every layer between the server and the WASM filesystem has a per-object size
ceiling. The archive exceeds all of them. This is the measurement that decides
how assets get delivered.

## The ceilings

| Layer | Limit | 517 MB ZIP | How measured |
|---|---|---|---|
| Browser Cache Storage (`cache.put`) | between 100 MB and 492 MB | ❌ | single 492 MB entry `UnknownError`; single 100 MB entry OK; 496 MB as 62 × 8 MB OK |
| Browser IndexedDB (single value) | **133,169,152 B** (127 MiB) | ❌ | `The serialized keys and/or value are too large (size=516960813 bytes, max=133169152 bytes)` |
| Cloudflare CDN cache-file (Free/Pro/Business) | **512 MB** | ⚠️ **within 4%** | documented; Enterprise is 5 GB |
| Cloudflare Workers Cache API object | 512 MB | ⚠️ same | `developers.cloudflare.com/workers/platform/limits` |

Two of these are hard refusals. The third is worse in a quiet way: Cloudflare
does not error on an oversized object, it **passes the request through to the
origin without caching it**, so the edge quietly stops helping and the origin
takes every byte.

The ZIP is 493 MiB against a 512 MB ceiling. Whether that line is read as
512,000,000 or 536,870,912, the answer is either "3% too big" or "7% of
headroom". Both are unacceptable for an artifact that will be rebuilt whenever
the mod updates.

## Chunk size: 64 MB, not 256 MB

The architecture doc proposes "≤256 MB parts". **That does not fit.** A 256 MB
chunk is larger than IndexedDB's 127 MiB single-value limit, so a client using
IndexedDB as its store would fail on the first chunk — the same class of bug
one layer up.

The smallest ceiling is the one that has to be satisfied:

```
min(Cloudflare 512 MB, IndexedDB 133,169,152 B, Cache API ~100 MB+) = ~100 MB
```

Pick well under it:

| Size | Result |
|---|---|
| 256 MB | ❌ exceeds IndexedDB's 127 MiB |
| 128 MB | ⚠️ exactly at the IndexedDB boundary |
| **64 MB** | ✅ ~2× headroom everywhere; 8 chunks for this archive |
| 32 MB | ✅ conservative, 16 chunks, more requests |

**64 MB.** 8 parts plus a manifest.

## What chunking actually buys

It is not primarily a caching optimisation. It removes the
517-must-be-a-single-object assumption that every one of these layers imposes,
so the same artifact works on a CDN, in Cache Storage, in IndexedDB, and over
a plain origin without special-casing any of them.

Secondarily it makes the download **resumable**: a dropped transfer re-fetches
one 64 MB part instead of restarting 517 MB. Range requests are already
supported and advertised (`HTTP/2 206`, `Accept-Ranges: bytes`).

## Headers, and what is already correct

`vite-asset-headers.mjs` sets, for `/webXash/hl/` only:

```
Cache-Control: public, max-age=0, must-revalidate
Accept-Ranges: bytes
```

Deliberately **not** `immutable`: the URL is stable (the zip is gitignored, so
the path never changes) but the content changes on rebuild, and there is no
cache-bust in the URL. `max-age=0` means a conditional request each load —
a few hundred bytes for a `304` when unchanged, a correct re-download when
changed. App code keeps `cache-control: no-cache` so dev cache-busting is
unaffected; verified the scoped middleware does not leak onto it.

nginx equivalent is documented at the top of that file.

## Open question: is the browser HTTP cache usable at all?

In a real Vivaldi session, none of `max-age=0,must-revalidate`,
`immutable, max-age=31536000`, or `max-age=600` produced a cache hit —
`transferSize` was non-zero for **1 MB, 50 MB and 200 MB** files alike. The
response headers were confirmed correct on the wire *and* as received by the
browser. So the header is not the variable and it is not a size effect.

This does not block anything, because chunking does not depend on the browser
HTTP cache. But it is unexplained, and it is worth remembering that repeat
visits may re-download even after this ships. IndexedDB is the more
deterministic store for the parts and should be the first choice.

Note that `Response.status` **cannot** detect a cache hit from JS — a response
served from cache is exposed as a reconstructed `200`. Use
`performance.getEntriesByName(url).transferSize` (`0` = cached) or the
Network panel's transferred-bytes column. Two of my own early tests were
invalid for this reason.

## Discrepancy to resolve

`specialists-browser-cloud-architecture.md` §1 records "Engine shared memory /
COOP-COEP: **Not required** — no CheerpX". But every response this build serves
carries:

```
cross-origin-embedder-policy: credentialless
cross-origin-opener-policy: same-origin
```

Either they are unnecessary and should be dropped, or they are load-bearing for
something not yet identified. Worth resolving before prod, since COOP/COEP
affect cross-origin behaviour and are easy to leave in by accident.

## Implementation sketch

1. **Split** `tsmod.zip` into 8 × 64 MB parts + `manifest.json`
   (`{ version, size, parts: [{name, bytes, sha256}] }`). Content-address the
   version so the manifest URL changes with the bytes — this is what unlocks
   `immutable` later.
2. **Upload** parts + manifest to R2 under `assets.<domain>/ts/<version>/`.
   Each part is well under Cloudflare's ceiling, so the edge caches them all.
3. **Client** (`zip-helpers.ts`): read the manifest, fetch only missing parts,
   store each in IndexedDB keyed by version+name, concatenate in order,
   hand the assembled `ArrayBuffer` to the loader unchanged.
4. **Progress** becomes two-signal: parts downloaded vs bytes downloaded.
   Both are honest and both are cheap.

The loader's boot screen already reports real per-phase progress, so this
plugs into the existing `download` phase rather than adding a new one.