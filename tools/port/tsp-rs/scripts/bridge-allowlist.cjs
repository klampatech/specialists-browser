/**
 * The bridge's security floor, as a testable unit.
 *
 * The floor is the only thing standing between the bridge and being an
 * OPEN UDP RELAY: without it, anyone who can open a WebSocket can make
 * the host send packets to anything it can reach. The registry may tell
 * the bridge WHERE to send a packet; only the floor says whether it is
 * ALLOWED to.
 *
 * Extracted from the bridge so it can be unit-tested. The bug it locks in
 * is real: an unknown target used to be accepted at the WebSocket upgrade
 * and then closed, which a browser reads as "connected" — so the check
 * has to happen BEFORE the upgrade, not after.
 */

/**
 * Parse "27015-27022" or "27015,27017" into a Set of ports.
 *
 * A range, not a list, because the fleet's ports are contiguous and the
 * services that watch it must be able to see an instance that does not
 * exist yet.
 */
function parsePortRange(spec) {
  const out = new Set();
  for (const part of String(spec || '').split(',')) {
    const item = part.trim();
    if (!item) continue;
    const dash = item.indexOf('-');
    if (dash !== -1) {
      const lo = parseInt(item.slice(0, dash), 10);
      const hi = parseInt(item.slice(dash + 1), 10);
      if (Number.isInteger(lo) && Number.isInteger(hi)) {
        for (let p = lo; p <= hi; p++) out.add(p);
      }
      continue;
    }
    const n = parseInt(item, 10);
    if (Number.isInteger(n)) out.add(n);
  }
  return out;
}

/**
 * Build an allowlist from a host and a port spec.
 *
 * Both halves are required. A port range without a host floor would let
 * the bridge relay to any host on any of those ports; a host without a
 * port floor would let it relay to any port on that host. Both together
 * pin it to exactly one machine and one range.
 */
function createAllowlist({ host, ports }) {
  const allowedPorts = parsePortRange(ports);
  return {
    allowedHost: host,
    allowedPorts,
    /** Is this target inside the floor? */
    withinFloor(targetHost, targetPort) {
      return targetHost === host && allowedPorts.has(targetPort);
    },
  };
}

module.exports = { parsePortRange, createAllowlist };
