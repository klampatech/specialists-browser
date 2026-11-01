# The admin console — runbook

This is the operator's document for the BulletBallet admin console: how to
reach it, how to give it its two secrets, how to keep RCON alive across a
replacement, and what to do when the console and the fleet disagree.

It is the companion to [`docs/ADMIN-CONSOLE.md`](ADMIN-CONSOLE.md), which is
the design and the measurements. This file is the procedure.

**Phase 5 built the mechanism. It did not cut over.** There is no console
running on `bb-prod` yet, no RCON password anywhere, and no public address
for the console. The cut-over is the manual procedure in §7, and it is done
by hand, after review.

---

## 1. Reaching the console

The console binds **`127.0.0.1:8095`** on the production host. It has no
public vhost, no DNS record and no route from the internet. The only way in
is an SSH tunnel:

```bash
tools/admin/tunnel.sh
# tunnel: the admin console is at http://127.0.0.1:8095/
```

The script is the command in the spec, plus the two things a bare `ssh -L`
does not do:

```bash
ssh -N -L 8095:127.0.0.1:8095 -i ~/.ssh/id_specialists_ovh bb-prod
```

- **It refuses to start twice.** A second tunnel on a port that is already
  forwarded fails deep inside `ssh`, late, with a message that reads like a
  network problem. The script checks the port *first* and says plainly that
  something is already listening, and that the console is already reachable.
- **It leaves nothing behind.** The tunnel is a child process and the script
  kills it on every path out — Ctrl-C, a failed start, an error. There is no
  state file and no lock file, and the local port is free again the moment
  the script ends. `ExitOnForwardFailure=yes` does the same on the other side
  of the handshake: if the forward cannot be bound, `ssh` exits rather than
  sitting there with a tunnel that does not work.

`tools/admin/tunnel.sh --check` reports whether the tunnel is already up and
what the console answers with. It is the first thing to run when the console
"is not there".

**The console is loopback-only on purpose.** It is not in the Caddy vhost,
it has no DNS record, and nothing in this phase may put it there. A public
vhost with a password in front of it puts an authentication surface on the
internet for a tool that has a private one available.

---

### 1.1 The orchestrator — where the fleet comes from

The console's other dependency is the **orchestrator**, at
**`http://127.0.0.1:8090`** (`ORCHESTRATOR_URL` in the deploy script). It
is on the same host, on loopback, and the console asks it one read-only
question:

```bash
curl -fsS http://127.0.0.1:8090/api/orchestrator | head -c 400
```

**What it is used for:** the console asks which instances are **deployed**,
and publishes exactly those. The orchestrator owns the fleet — it creates
and removes the containers — so it is the only service that can tell "this
instance exists and is sick" from "this instance was never created". That
difference is the health model: the RCON tri-state (`ok` / `refused` /
`unreachable`) exists to report it, and a port range cannot.

This is the reason the console shows **one** server on a one-instance
fleet. It used to enumerate the port range and publish all eight slots,
seven of them red cards for instances nobody ever created.

**When the orchestrator is down:** the console falls back to the port
range (`TS_PORT_BASE` + `TS_INSTANCE_COUNT`) — every port that *could* be
an instance — and it **says so** in the fleet response:

```json
{ "fleetSource": "port-range", "detail": "the orchestrator did not answer (…)" }
```

`fleetSource` is `"orchestrator"` when the list is the real fleet, and
`"port-range"` when it is the fallback. The console draws the fallback as
a warning in its log drawer. **An empty fleet with
`fleetSource: "orchestrator"` is a real answer** — the orchestrator says
there are no deployed instances — and it is not the same thing as the
fallback.

The orchestrator is asked at most **once every few seconds** (the list is
cached, and a broken orchestrator is not re-asked on every request), and
the ask has a **two-second deadline**: a hung orchestrator cannot hang
the console's fleet endpoint.

---

## 2. The RCON secret — provisioned once, by hand

### 2.1 The shape

One file on the host, read by two services:

| | |
|---|---|
| **Path** | `/srv/ts-admin/rcon_password` |
| **Owner** | `root` |
| **Group** | `tsrcon` (gid **10007**) |
| **Mode** | **0640** |
| **Contents** | the password and nothing else (one line, no whitespace) |
| **Readers** | the admin console (uid **10006**) and the game server (uid **10001**) |
| **Provisioned** | **once, by hand** — it is a secret, and it is not in the repository |

The console reads it through `RCON_PASSWORD_FILE`, mounted **read-only** into
the container. The game server's entrypoint reads the **same file** and
appends `rcon_password "<value>"` to the **copy** of `server.cfg` that the
engine execs — the committed `tools/deploy/config/server.cfg` stays
secret-free, and the git history stays clean.

### 2.2 Why mode 0640, and not 0600

**0600 is impossible here, and pretending otherwise is how this breaks.**

The spec's §3.4 says "mode 0600, owned by the admin service's uid". That is
right for a secret with **one** reader. This one has **two**:

- the admin console runs as uid **10006** (`admin`);
- the game server runs as uid **10001** (`gameserver`).

They are different uids on purpose — two services that can read each other's
files are two services with one blast radius. A file owned by 10006 with mode
0600 is therefore **unreadable by the game server**, and the boot-config path
would have to read a *second* copy of the secret. Two copies of a secret
drift apart: one gets rotated and the other does not, and the symptom is
every instance reporting `refused` with nothing in the logs to say why. That
is the exact failure this design exists to prevent.

So the file is owned by **root** and readable by a **shared group**:

- `root:tsrcon`, mode **0640** — the console's user is a member of `tsrcon`,
  and the game container is started with `--group-add 10007`, so both uids
  can read it and nobody else can;
- **0644** would be world-readable: every uid on the box, and every container
  that is not carefully fenced, could read the password;
- **0600 owned by root** would be readable by neither of them;
- **0600 owned by 10006** would be readable by the console only, which is the
  case above.

The file is never writable by either reader. The console mounts it `:ro` and
the game container mounts it `:ro`, so a compromised game server cannot
change the fleet's password.

### 2.3 The commands

**Once, on `bb-prod`, by hand:**

```bash
# 1. The shared group. Its gid is FIXED (10007): the group inside the
#    console image and the group on the host have to be the same number,
#    and the game container is given it with --group-add.
sudo groupadd --gid 10007 tsrcon

# 2. The console's own user on the host. The uid is FIXED (10006) for the
#    same reason: the state directory and the audit log are owned by it.
sudo groupadd --gid 10006 bbadmin
sudo useradd --uid 10006 --gid 10006 --groups tsrcon \
    --shell /usr/sbin/nologin bbadmin

# 3. The state directory. The console's uid owns it, because the console
#    writes the audit log into it.
sudo mkdir -p /srv/ts-admin/auth /srv/ts-admin/audit
sudo chown 10006:10006 /srv/ts-admin /srv/ts-admin/auth /srv/ts-admin/audit
sudo chmod 0700 /srv/ts-admin /srv/ts-admin/auth
sudo chmod 0750 /srv/ts-admin/audit

# 4. The secret itself. Forty random letters and digits, no whitespace
#    (the engine reads the password as ONE argument) and no quotes (the
#    config's own quoting would break).
sudo sh -c 'umask 077; LC_ALL=C tr -dc "A-Za-z0-9" < /dev/urandom | head -c 40 > /srv/ts-admin/rcon_password'
sudo chown root:tsrcon /srv/ts-admin/rcon_password
sudo chmod 0640 /srv/ts-admin/rcon_password

# 5. Check the shape. The VALUE is not printed, ever.
ls -l /srv/ts-admin/rcon_password    # root tsrcon 0640
```

**To read it** (to apply it at runtime, §4), as the operator:

```bash
sudo cat /srv/ts-admin/rcon_password
```

**To rotate it:** write a new value the same way, then re-apply it to every
instance (§4). The console reads the file **at startup**, so the console
container has to be replaced for it to pick up a new password.

### 2.4 The rule the service enforces

`RCON_PASSWORD` (the environment variable) is still supported — the interim
and the tests use it — and `RCON_PASSWORD_FILE` is the production path.

**If both are set, the service refuses to start** and says why. Two ways to
say one thing is how a secret ends up being the wrong one, and the symptom
of a wrong password is a fleet that is entirely `refused` and says nothing
about why.

A `RCON_PASSWORD_FILE` that cannot be read is also a refusal to start, with
the path in the message. The console without a password is worse than a
console that will not start: it reports every instance as `refused`, which
looks exactly like a network fault.

---

## 3. The administrator's password record

The console has **one** administrator and **one** password, and it is not
the RCON password. It is stored as a **scrypt record** at
`/srv/ts-admin/auth/auth.json`, mode 0600, and the plaintext is never
written to disk.

`adminctl` is the CLI that writes it, and **the console's own image
carries it** (`/app/services/admin/adminctl.mjs`). So the record is
written by running the CLI **in that image, as the console's own uid** —
no host node, no root, and exactly the uid the console will read the
record as:

```bash
# The record's directory has to exist and be owned by the uid that writes
# it -- the deploy script creates it, and this runbook creates it above.
sudo chown 10006:10006 /srv/ts-admin/auth

# The image the deploy is running. `admin:0.1` is the default tag;
# after a deploy it is `admin:<the commit's sha>`.
ADMIN_IMAGE=admin:0.1

# Hash the password and write the record, in one go.
#
# `hash` reads the password from stdin with the echo OFF -- a password in
# `ps` output or in the shell history is a password somebody else has --
# and prints the record; `set-password` reads that record and writes it
# ATOMICALLY (a temporary file and a rename, so the console never reads
# a half-written record). The record goes through a file inside the
# container, which is thrown away with `--rm`.
sudo docker run --rm -it \
  -v /srv/ts-admin/auth:/srv/ts-admin/auth \
  "$ADMIN_IMAGE" \
  sh -c 'node /app/services/admin/adminctl.mjs hash > /tmp/record.json \
    && node /app/services/admin/adminctl.mjs set-password \
         --path /srv/ts-admin/auth/auth.json < /tmp/record.json'
```

**`adminctl` refuses to run as root.** The record belongs to the uid the
console runs as — a root-owned file in the console's state directory is a
file the console may not be able to read, and a console nobody can log
into. It also refuses to write into a directory owned by somebody else.
The image's `USER` is that uid (10006), so the command above runs as it
without saying so.

**On a host that has node**, the same CLI is shipped to
`/home/ubuntu/adminctl/` by the deploy workflow, and the equivalent is:

```bash
sudo -u '#10006' node /home/ubuntu/adminctl/adminctl.mjs hash \
  | sudo -u '#10006' node /home/ubuntu/adminctl/adminctl.mjs set-password \
      --path /srv/ts-admin/auth/auth.json
```

The password is never an argument, in either form.


**The record is read at the moment of the login**, not once at startup, so a
password changed this way takes effect without restarting the console.

**The auth directory is mounted as a DIRECTORY, read-only** — not as a file.
`adminctl` writes atomically with a rename, and a rename replaces the
directory entry; a bind-mounted *file* would keep pointing at the old inode
and the console would read the old password forever.

---

## 4. RCON on an instance

### 4.1 Enabling it at runtime

The engine accepts the password as a command, and it takes effect
**immediately** — no restart, no kicked players:

```bash
printf 'rcon_password "<value>"\n' | docker exec -i ts-0 sh -c 'cat > /tmp/console.pipe'
```

`<value>` is the contents of `/srv/ts-admin/rcon_password`. Repeat for every
instance (`ts-0` … `ts-7`).

The console pipe is `/tmp/console.pipe` inside the game container: the
entrypoint creates it and wires it to the engine's stdin.

### 4.2 When it is needed

**A runtime password is per instance.** The engine holds one `rcon_password`
cvar, in one container's memory. There is no fleet-wide setting.

So:

- **A new instance needs it too.** The orchestrator creates game containers
  (`tools/deploy/run-instance.sh`), and a container that has just been
  created has never seen the password. **Every new instance — including one
  the orchestrator creates on its own during a scale-out — comes up without
  RCON until the password is applied to it.**
- **If an instance is replaced and the password is not re-applied, that
  instance is unreachable to the console** and shows as `refused`. The other
  instances are unaffected: RCON is per instance, so one replacement does
  not take the fleet down — but that instance is invisible to the console
  until it is applied again.
- The **durable** answer is the boot config: with the secret file mounted,
  the entrypoint appends `rcon_password "<value>"` to the config the engine
  execs, and the password is there before the engine starts. That is what
  the file is for.

**The runtime password survives a map change** — measured, §2.2: the engine
re-execs `server.cfg`, and the re-exec does not touch a cvar the file never
mentions. It does **not** survive a **container restart**, which is why the
boot config exists.

**A missing secret does not stop a game server from starting.** If the file
is absent, the entrypoint says so and the instance boots with RCON off. A
missing optional secret must never stop a game server from starting; that
would be a much worse outage than the one it prevents.

### 4.4 The engine's RCON is not on the internet

**Measured on `bb-prod`, 2026-10-31.** This is worth knowing before the cut-over,
because the natural fear is that turning RCON on puts a remote-code-ish surface on
the public internet. It does not.

- **The game server binds loopback.** `ss -lunp` on the host shows
  `UNCONN 0 0 127.0.0.1:27015` — the engine's UDP socket, which is where RCON
  lives, is bound to `127.0.0.1`, not to `0.0.0.0`.
- **The firewall allows no UDP at all.** `ufw status` on the host: `22/tcp`,
  `443/tcp`, `80/tcp`, and nothing else. Not one UDP port is open.
- **The only public path to the game is the bridge**, over WebSocket on 443, and
  it relays to the loopback socket.

So the engine's RCON is reachable from **the host, and nowhere else** — which is
exactly where the console runs. The 40-character password and the engine's own
rate limiter are the second and third layers, not the first.

**What this does NOT change:** the secret is still in the game server's logs
(§5), and the logs are on this box. The exposure is the **log**, not the
**network**. Do not let "it is not on the internet" become a reason to skip §5.

### 4.5 The boot config, in one paragraph

`tools/deploy/config/server.cfg` is committed and stays secret-free. The
entrypoint copies it to `$GAME_TS/server.cfg` and appends the password from
the mounted secret file **to the copy**. The engine re-execs `server.cfg` on
every map change, so a password that exists only on the command line is lost
at the first map change unless it is in a file the engine execs. The
committed file never changes, and the password is never printed.

---

## 5. The game server's logs are the secret too

**The engine prints the whole RCON datagram, password included, on every
command.** This is not a flaw in the console — it is a fact about the engine
(`SV_RemoteCommand`, `engine/server/sv_client.c`):

```
Rcon from 127.0.0.1:
<the datagram, password and all>
```

The fleet runs with `-log`, so the password is in the game server's stdout
and in its log file, **once per command**.

**So the game server's logs are as secret as the password file.** Same
access rules. Same backup rules. Same "nobody reads this" rules that apply
to `/srv/ts-admin/rcon_password`.

And the consequence, stated plainly: **a password that anyone can read out
of a log is a password to treat as compromised when the logs are.** If the
game server's logs are ever readable by somebody who should not have them,
the password is to be rotated — not "monitored".

**HOW LONG THE PASSWORD STAYS READABLE IN THE LOGS.** Not "until the logs
rotate", which is vague — the console keeps writing it, so the window never
closes on its own. The fleet's docker logs are capped at three 10 MB files
(`LOG_MAX_SIZE` / `LOG_MAX_FILE` in `deploy-services.sh`), and the console's
own probe issues a handful of RCON commands per instance every few seconds,
so the password is re-written into the log continuously. The consequence is
that the secret is readable from the rotated logs for **days**, not hours,
and that clearing the logs does not clear the secret — it only rewrites it
into a fresh file a few seconds later.

So the rule is not "rotate the password when the logs rotate". It is:

1. **The logs are secret.** Same access rules as the password file, from
   the moment the first RCON command is sent.
2. **If the logs have been readable by somebody who should not have them,
   rotate the password** — write a new value into
   `/srv/ts-admin/rcon_password`, re-apply it to every instance
   (§4), and delete the old logs.
3. **Deleting the logs is not a remediation on its own.** It removes the
   old copies; the console writes the current one again seconds later. The
   password is only safe once the *access* is fixed.

The console itself never logs the password, never returns it, and never
writes it to the audit log. The engine does, and the engine is not ours.

---

## 6. When the console and the fleet disagree

The console's health is the **RCON tri-state**, and it is the honest one:

| State | What it means | What it does NOT mean |
|---|---|---|
| `ok` | The engine answered over RCON. | — |
| `refused` | The engine **is there** and would not talk to us: no `rcon_password` set on that instance, or the wrong one. | **Not** "the server is down". |
| `unreachable` | No usable answer at all: the instance is not there, the port is wrong, or the reply never came back. | Not "the password is wrong". |

**`refused` means the console cannot talk to the server — not that the
server is down.** The instance is running, taking players and serving its
map; the console simply has no way in. Read it as a *password* problem, and
the checks are, in order:

1. Does this instance have the password at all? A new or replaced instance
   does not (§4.2). Apply it.
2. Is the console's password the same one? The console reads it at startup;
   a rotated secret needs the console container replaced.
3. Are both sources set on the console? If `RCON_PASSWORD` **and**
   `RCON_PASSWORD_FILE` are set, the service refuses to start (§2.4).

**`unreachable` on every instance at once** is a different problem: the
fleet is down, the ports moved, or the console is pointed at the wrong host.
`unreachable` on one instance and `ok` on the rest is an instance that is
not running.

The console's own status endpoint and `/admin/servers` carry the tri-state
per instance, so the question "is it the console or is it the fleet?" is
answerable without reading a single log.

---

## 7. The cut-over (by hand, after review)

Nothing in this phase does any of the following. It is the checklist for
the operator who does the cut-over.

1. **Provision the secret** (§2) and **the administrator's record** (§3) on
   `bb-prod`. Until the secret is there, the deploy **skips the console** —
   loudly — and deploys the rest of the control plane, because the console
   has not been cut over and the registry, the orchestrator and the bridge
   have players on them. A secret that is **empty** or **world-readable**
   stops the deploy: that is an operator's mistake, not a cut-over that has
   not happened yet.
2. **Deploy the console** — the deploy workflow streams the `admin:<sha>`
   image and runs `deploy-services.sh`, which builds the image from the
   repository when it is there and replaces the `admin` container. The
   console's container has **no docker socket**, binds loopback only, and
   mounts the secret read-only.
3. **Open the tunnel** (§1) and log in.
4. **Enable RCON on the instances** (§4.1) — runtime first, so no player is
   kicked. The boot config makes it durable for the instances that are
   replaced later.
5. **Check the tri-state** (§6): every instance `ok`.

---

## 8. What this phase deliberately does not do

- **No public exposure.** No Caddy vhost, no DNS record, no route from the
  internet.
- **No docker socket in the console's container.** The console uses RCON
  precisely so that it does not need one; a socket there would be
  root-equivalent on the host.
- **No secret in the repository.** The CI job builds the console image and
  checks that it carries no `*.bsp`, `*.pak`, `*.mdl`, no `rcon_password`
  file and no `auth.json`; a unit test walks the repository for an
  `rcon_password` with a value in it.
- **No `rcon_password` in `tools/deploy/config/server.cfg`.** It is
  committed, and it stays secret-free.
- **No second administrator, no roles, no change to the auth, the session,
  the lockout, the CSRF gate or the audit.** They are reviewed and proven.
