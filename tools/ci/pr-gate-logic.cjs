/**
 * The pull-request gate's decision, as pure logic.
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * Because the first version of this gate had a FALSE NEGATIVE, and it
 * was silent.
 *
 * The check asks GitHub how many pull requests are associated with a
 * commit, and the natural way to count them is `--jq 'length'`. But
 * GitHub does not always answer with an array: when the token lacks the
 * `pull-requests` permission it answers with an ERROR OBJECT:
 *
 *     { "message": "Resource not accessible by integration",
 *       "documentation_url": "...", "status": "403" }
 *
 * And `jq 'length'` on an OBJECT returns the number of KEYS. That
 * response has three keys, so the gate read "3 pull requests" and
 * APPROVED A DIRECT PUSH TO MAIN.
 *
 * The gate is the thing standing between a direct push and production.
 * A gate that approves what it exists to refuse is worse than no gate,
 * because it looks like it is working.
 *
 * So: the count is only ever read from an actual array, and anything
 * else is a failure to verify — which fails closed.
 */

/**
 * How many pull requests are associated with this commit?
 *
 * @param body  the parsed API response.
 * @returns the count, or -1 if the response was not an array.
 */
function parsePullRequestCount(body) {
  if (!Array.isArray(body)) return -1;
  return body.length;
}

/**
 * May this commit deploy?
 *
 * Fails closed: if the answer could not be determined, the answer is no.
 */
function verdict(count) {
  if (count === -1) {
    return {
      ok: false,
      reason:
        'could not verify whether this commit came from a pull request ' +
        '(the API did not return a list). Refusing to deploy on an ' +
        'unverifiable commit.',
    };
  }
  if (count === 0) {
    return {
      ok: false,
      reason:
        'this commit is not associated with any pull request. Open a ' +
        'pull request instead of pushing to main.',
    };
  }
  return { ok: true, reason: `${count} pull request(s)` };
}

module.exports = { parsePullRequestCount, verdict };
