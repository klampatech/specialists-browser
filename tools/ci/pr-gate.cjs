#!/usr/bin/env node
/**
 * Refuse a commit that did not come through a pull request.
 *
 *   node tools/ci/pr-gate.cjs <commit-sha>
 *
 * Exits 0 if the commit is associated with at least one pull request,
 * and 1 otherwise — including when the answer could not be determined.
 *
 * The permission this needs is `pull-requests: read`. Without it the API
 * answers with an error object rather than a list, and a gate that
 * cannot tell the difference approves the thing it exists to refuse.
 */
const { parsePullRequestCount, verdict } = require('./pr-gate-logic.cjs');

async function main() {
  const sha = process.argv[2] || process.env.SHA;
  const repo = process.env.REPO || process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!sha || !repo || !token) {
    console.error('::error::pr-gate: SHA, REPO and a token are all required');
    process.exit(1);
  }

  const url = `https://api.github.com/repos/${repo}/commits/${sha}/pulls`;
  let body;
  let status;
  try {
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'specialists-pr-gate',
      },
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
    body = await res.json();
  } catch (e) {
    console.error(`::error::pr-gate: the API call failed: ${e.message}`);
    process.exit(1);
  }

  console.log(`  commit:  ${sha}`);
  console.log(`  repo:    ${repo}`);
  console.log(`  api:     HTTP ${status} — ${Array.isArray(body) ? 'a list' : 'NOT a list'}`);

  if (status !== 200) {
    console.error(`::error::pr-gate: the API answered HTTP ${status}.`);
    console.error(`::error::${JSON.stringify(body).slice(0, 300)}`);
    console.error('::error::The workflow needs `pull-requests: read` to use this gate.');
    process.exit(1);
  }

  const count = parsePullRequestCount(body);
  const v = verdict(count);
  console.log(`  pull requests: ${count}`);
  if (!v.ok) {
    console.error(`::error::pr-gate: ${v.reason}`);
    process.exit(1);
  }
  console.log(`  ok — ${v.reason}`);
}

main().catch((e) => {
  console.error(`::error::pr-gate: ${e.message}`);
  process.exit(1);
});
