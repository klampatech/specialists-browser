/**
 * Ask the public production API how many people are actually connected.
 *
 * WHY NOT SSH
 * -----------
 * The e2e scripts used to shell out to `ssh bb-prod` and read the
 * bridge's /health endpoint. That works on one machine and nowhere else:
 * `bb-prod` is an SSH host ALIAS, and on a CI runner it resolves to
 * nothing — so the first CI run reported "0 connections" for a browser
 * that was in fact playing fine.
 *
 * The same signal is available publicly. The registry's human count
 * comes from the bridge's live WebSocket count, so `/api/servers`
 * reports exactly what the bridge knows — just one hop later.
 *
 * That is better than the SSH version for another reason: it exercises
 * the whole public chain, browser → bridge → registry → public API,
 * rather than peeking at one component from the inside.
 *
 * The count is the bridge's OPEN WEBSOCKETS, so it is immediate and has
 * no ghost-player lag. The registry refreshes it on its metrics tick
 * (8s), so callers should poll rather than read once.
 */

const REGISTRY_URL =
  process.env.PROD_REGISTRY_URL || 'https://bulletballet.dev/api/servers';

/**
 * Total humans connected across the fleet.
 *
 * @returns the count, or -1 if the API could not be reached. -1 is
 * deliberately not 0: "I could not tell" and "nobody is there" are
 * different answers, and conflating them makes a broken probe look like
 * a passing test.
 */
async function publicHumans(url = REGISTRY_URL) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return -1;
    const body = await res.json();
    const servers = body.servers || [];
    let total = 0;
    for (const s of servers) {
      total += s.humans ?? 0;
    }
    return total;
  } catch {
    return -1;
  }
}

/**
 * Poll until the human count reaches `target`, or the deadline passes.
 *
 * @returns the highest count seen, which is what the verdicts are
 *          judged on — the peak is the number of people who were in the
 *          server AT THE SAME TIME, which is the only thing a
 *          "can two players be here together" question can mean.
 */
async function peakHumans(target, { timeoutMs = 180_000, intervalMs = 3000, url = REGISTRY_URL } = {}) {
  const deadline = Date.now() + timeoutMs;
  let peak = 0;
  while (Date.now() < deadline) {
    const n = await publicHumans(url);
    if (n > peak) peak = n;
    if (peak >= target) return peak;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return peak;
}

module.exports = { publicHumans, peakHumans, REGISTRY_URL };
