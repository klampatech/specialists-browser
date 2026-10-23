# Production Infrastructure

**Status:** provisioned, hardened, partially wired. Asset delivery live; game plane still local.

Everything here is **measured**, not estimated, except where explicitly marked `UNVERIFIED`.

---

## 1. Decision record

| Decision | Choice | Why |
|---|---|---|
| Object storage | **Cloudflare R2** | Egress is free. At 1,000 new players the payload costs **$0.36/mo on R2 vs ~$47 on S3**. That single number decided it. |
| Game/bridge host | **OVHcloud VPS-1 2027 LocalZone** | Unmetered traffic, 500 Mbps, $6.54/mo. |
| Region | **Dallas (`US-EAST-LZ-DAL`)** | Nearest to the US population centre; measured closer than Vint Hill VA from every major US metro. |
| Canonical domain | **`bulletballet.dev`** | HSTS-preloaded → browsers force HTTPS before the first packet. The WASM build needs a secure context anyway (`crypto.subtle`, COOP/COEP). |
| Vanity alias | **`bulletballet.party`** *(pending registration)* | 301 → `.dev`. Cheap-and-flat renewal ($5.18/yr). |
| App origin proxying | **DNS-only (grey cloud)** | Cloudflare's proxy enforces a ~100 s WebSocket idle timeout. The bridge is idle whenever nobody is playing — exactly where a 524 would land. |
| Engine licensing | **No copyrighted assets hosted** | See §7. |

### Cost, actual

```
OVH VPS-1 LZ Dallas        $6.54/mo
Cloudflare R2              $0.00/mo   (payload ~493 MB, far under 10 GB free tier)
Cloudflare DNS/SSL          free
Domain (.dev)              $8.20 first, $12.20/yr after
                           ────────
steady state               ~$7.57/mo
```

---

## 2. Host

```
name      vps-eebb5e11-vps-ovh-us
zone      os-us-east-lz-dal-vps-1
IPv4      40.160.225.81
IPv6      2604:2dc0:300::4::7a
OS        Ubuntu 26.04.1 LTS
kernel    7.0.0-38-generic
vCPU      2
RAM       3909 MB usable
disk      38 GB total, 34 GB free
SSH alias bb-prod / bulletballet
```

⚠️ **Latency caveat:** the developer's egress is `47.190.115.49`, **Plano, Texas** — ~30 miles from the box. Measured RTT to the VPS is **4.26 ms**. Every timing observed from this machine is a best case, not a representative player experience. Re-measure from a real remote client before trusting any latency claim.

---

## 3. Capacity — MEASURED (2026-10-23)

### The load test

Ran a dedicated server on port 27025 with **`maxplayers 32`**, `sys_ticrate 100`,
map `ts_casa`, and filled all **32 slots with bots** via `ts_bot_quota 32`.

**Bot activity was verified before trusting the numbers** — a cheap bot quota that
never fights would have produced a beautifully low and completely meaningless CPU
figure. `ts_status` confirmed real combat:

```
#28 Bot Link   frags=8  deaths=9   hp=56   held=0x0
#29 Bot Seraph frags=21 deaths=11  hp=100
#30 Bot Sati   frags=18 deaths=8   hp=38   spree=2
#31 Bot Rama   frags=15 deaths=13  held=0x1/1s
#32 Bot Kid    frags=14 deaths=8   hp=100
```

76 frags and 49 deaths accumulated. They fight.

### Results

| metric | value |
|---|---|
| CPU | **5.8% of one core** (5.6–5.8% across three 45 s windows) |
| RSS | **375 MB**, flat over 45 s — no leak |
| `sys_ticrate` | **100** |
| players | 32 (all slots filled, active combat) |

### How many fit on the VPS-1

**RAM binds. CPU is not close.**

```
RAM:  (3909 MB total − ~600 MB OS/Docker/Caddy/bridge) ÷ 375 MB  =  8.8  →  8 servers
CPU:  (2 vCores, ~50% reserved for bridge/Caddy/burst) = 1.0 core ÷ 5.8%  =  17 servers
```

### **8 servers × 32 players = 256 player capacity, one box.**

The architecture doc modelled **64 slots per VM** (8 instances × 8 players). With
32-player instances that is **4× the capacity per box** — 256. One VPS-1 covers a
long way past what a starting audience needs.

### Caveats — what would make this wrong

1. **Bots are not players.** A bot client sends no network traffic. 32 humans add
   per-client packet parsing and delta encoding every tick. Direction unknown,
   additive cost likely.
2. **`ts_casa` is a small map.** Entity count drives AI and touch-test cost. A
   larger map costs more per player.
3. **The measurement ran on different silicon.** Test host: Ryzen 7 5700U
   (16-thread mobile). VPS: **AMD EPYC-Genoa**, materially better per-thread.
   Favourable, but LocalZone vCores are shared and bursty, not dedicated.
4. **tickrate 100 is expensive.** Dropping to 30 would cut server CPU roughly
   3×. It buys CPU headroom, not RAM — RAM still binds at 8 either way.
5. **Container overhead is not included** in the 375 MB figure.

**Bottom line: 8 is a defensible plan, not a promise.** Item 1 is the one that could
move the number, and it is only answerable with real clients.

---

## 4. Access

Key-only. Password authentication is **disabled and confirmed refused**.

```bash
ssh bb-prod          # alias, IdentityFile ~/.ssh/id_specialists_ovh
```

- Login user: `ubuntu` (OVH creates an OS-named user; **root is disabled by default and was deliberately left that way**)
- `sudo` is **passwordless** for `ubuntu`
- Password lives at `~/.hermes/cache/scratch/_ovh_pw` — **inert**, since password auth is off. Delete on request.

### The sshd footgun — do not "tidy" this

Drop-in config is `/etc/ssh/sshd_config.d/00-specialists-hardening.conf`.

**The filename must sort before `50-cloud-init.conf`.** OpenSSH uses the **first** value obtained for a keyword, and cloud-init's `50-cloud-init.conf` contains `PasswordAuthentication yes`. A file named `60-*` sets `no`, appears correct, and is **silently ignored** — password login keeps working with no error anywhere.

Ubuntu ships this conflict by default: `50-cloud-init` says `yes`, `60-cloudimg-settings` says `no`, and `yes` wins.

**How to verify — do not trust the file, trust the effective config:**

```bash
sudo sshd -T | grep -i passwordauthentication    # must print "no"
```

Then actually attempt a password login. Both were required to catch this.

---

## 5. Hardening applied

| Control | State |
|---|---|
| Password auth | **off** — verified refused (`Permission denied (publickey)`) |
| Root login | **off** — `PermitRootLogin no` |
| `AllowUsers` | `ubuntu` only |
| `MaxAuthTries` | 3 · `LoginGraceTime` 30 |
| Firewall (ufw) | default-deny inbound; **22/tcp, 443/tcp, 27015/udp, 27017/tcp** |
| fail2ban | sshd jail, 6 strikes / 10 min / 1 h ban, ufw action |
| unattended-upgrades | enabled |
| Security patches | 140 applied, rebooted into new kernel |
| Swap | 2 GB (`/swapfile`) — headroom for burst container start |

### Ports

```
22/tcp      ssh, key-only
443/tcp     app + wss bridge (Caddy)          [not yet deployed]
27015/udp   GoldSrc game server               [not yet deployed]
27017/tcp   bridge, DIRECT                    TEMPORARY — see below
```

**`27017/tcp` is temporary.** The browser currently dials the bridge directly on 27017, and keeping it open preserves the working local multiplayer path. Once Caddy terminates TLS and proxies `/bridge` → `localhost:27017`, **delete this rule**.

---

## 6. DNS + edge

```
bulletballet.dev          A     40.160.225.81      proxied=false  (grey cloud)
assets.bulletballet.dev   CNAME  public.r2.dev    (Cloudflare-created)
```

`assets.bulletballet.dev` verified serving **HTTP/2 over real TLS** through Cloudflare's edge (`cf-cache-status: DYNAMIC`). Empty bucket returns 404, as expected.

### Cloudflare API token

Scoped, zone-limited to `bulletballet.dev`:

```
Account → Workers R2 Storage → Edit
Zone    → DNS                  → Edit
Zone    → Zone                 → Read
```

Two gotchas cost real time:

1. **Client IP filtering must be "Allow all IPs."** Set to Allow with an empty list, the token is refused at the *authentication* layer → `Invalid API Token`. Reads exactly like a bad token string.
2. **`/user/tokens/verify` only works for User-scoped tokens.** Using it to test an Account token produces a false negative. Test against `/zones?name=…` instead.

### R2 bucket layout

Keys mirror `webxash/public/hl/ts/` **exactly**, so the same client code works against a bucket or the dev server:

```
hl/ts/manifest.json
hl/ts/<version>/part-000.bin   …   part-007.bin
```

`<version>` is the first 12 hex of the archive's SHA-256, so a part URL can never change meaning — which is what makes `immutable` safe. The manifest is the mutable pointer and is published **last**.

**Status:** bucket created and custom domain attached. **Payload not yet uploaded.**

---

## 7. Legal posture — decided, not yet fully implemented

The repository is **asset-free by policy** and verified: the largest blob in git history is a disassembly of our own Rust port. Nothing from the TS distribution is committed.

**The rule that extends past git: R2 must not hold the copyrighted payload either.** 885 MB of Valve's and Rogue's maps, models, sounds and art, under our own account and served publicly, is the one unambiguously infringing act available in this project.

Consequences already accepted:

- R2 serves **only authored assets** — webxash build output, WASM, landing page.
- Users source the TS archive themselves.
- The chunked pipeline makes hosting it *convenient*, which is precisely why the rule needs stating.
- No advertising, no paid tier, no paywall. Monetisation is the point where tolerance ends.
- Descriptive naming, prominent unofficial/non-affiliation notice, and a published takedown contact.

**Not legal advice.** If this ever takes money, get counsel.

---

## 8. What is NOT done

| Item | State |
|---|---|
| Docker installed on the VPS | not started |
| Container image (`ts-server-dll/build-matrix/Dockerfile`) | still `/tmp`, never promoted |
| Game servers on the VPS | none — still on the dev host |
| Bridge on the VPS | none — still on the dev host |
| Caddy / TLS termination on 443 | not started |
| R2 payload upload | bucket ready, **not uploaded** |
| 8-container load proof | **single-instance load test DONE** (§3). Running 8 *concurrently* is still unverified. |
| Bridge registry / multi-target | not started |
| Production A2S service | dev-only middleware in `vite-a2s-plugin.mjs` |
| Control plane | **undecided** — see `CONTROL-PLANE.md` |
| COOP/COEP discrepancy | Ernie's doc says not required; served responses currently carry `credentialless` / `same-origin`. Unresolved. |