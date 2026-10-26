# GitHub App for the agent (the agent's own identity)

## The problem this solves

GitHub does not let a user approve a pull request they authored. The
repo's ruleset on `main` requires **one approving review** and has an
**empty bypass list**, so every PR opened under `klampatech` is
un-mergeable — Kyle is the author, so his approval does not count.

```
$ gh api repos/klampatech/specialists-browser/rulesets/25785510
  pull_request -> required_approving_review_count: 1
  bypass_actors: []
```

The app is a second identity. It opens the PR, Kyle reviews and approves
it as a human, and the rule is satisfied by a real second pair of eyes
rather than by removing the requirement.

**The approval half is Kyle's, and only Kyle's.** The agent opens PRs as
the app; Kyle reviews and approves as a human; then the agent merges.

**The agent must never submit a review itself.** See
[Agent never approves PRs](#agent-never-approves-prs) below — this is
enforced structurally, not by convention.

## Why an app and not a second user account

- An app is scoped: it can only touch the two repos it is installed on.
- Its access is a list of permissions, not "everything this account can do".
- It is revokable in one click, without touching Kyle's account.
- A bot *user* account would need a password and a second set of
  credentials that could leak, and it would look like a person.

## Current state (2026-10-25)

| | |
|---|---|
| App id | `5469987` (`bulletballet-bot`) |
| Owner | `klampatech` (a personal account — see the note below) |
| Installation | `175215428`, `repository_selection: selected` |
| Repos | `klampatech/specialists-browser`, `klampatech/webXash` |
| Permissions | `contents: write`, `pull_requests: write`, `metadata: read` |
| Private key | `~/.config/github-app/private-key.pem` (mode 600, never leaves this machine) |
| App id file | `~/.config/github-app/app-id` |

### The one browser step, already done

There is **no REST API for creating an app owned by a personal account**
(the OpenAPI spec has no such endpoint; `POST /users/{username}/settings/apps`
returns 404). It takes one browser visit:

1. <https://github.com/settings/apps/new> — name `bulletballet-bot`
2. **Permissions → Repository permissions:** `contents: write`,
   `pull_requests: write`, `metadata: read`
3. **Install the app** on `klampatech/specialists-browser` and
   `klampatech/webXash`
4. **Generate a private key**, then:

   ```bash
   mkdir -p ~/.config/github-app && chmod 700 ~/.config/github-app
   mv ~/Downloads/bulletballet-bot.*.pem ~/.config/github-app/private-key.pem
   chmod 600 ~/.config/github-app/private-key.pem
   ```

   The key may be generated on another machine — copy it over with `scp`.

### The `workflows` scope (the one gap)

The app cannot push a change to `.github/workflows/**`, because GitHub
refuses workflow-file changes from a token without the `workflows`
scope:

```
refusing to allow an OAuth App to create or update workflow
`.github/workflows/ci.yml` without `workflow` scope
```

Until that is added to the app's permissions, a branch that changes a
workflow file has to be pushed with the repo's SSH key. The PR is still
opened as the app, so the approval still works — only the push uses a
different credential. To close the gap, add **Workflows: read and write**
to the app's repository permissions.

## How the agent uses it

```bash
# a token for the app (minted per use; installation tokens last an hour)
TOKEN=$(~/.local/bin/mint-app-token.mjs 5469987)

# open a PR as the app
GH_TOKEN=$TOKEN gh pr create --title "..." --body "..."

# push a branch as the app — no setup needed, the helper does it
git push origin some-branch
```

`git push` works as the app because the repo's local credential helper
is reset and pointed at the app's helper:

```
$ git config --local --get-all credential.helper
store
                        # empty value = reset the inherited list
/home/kyle/.local/bin/github-app-credential.sh
```

The helper reads the app id from `~/.config/github-app/app-id`, so
nothing has to be exported. The token is minted **per request**: a cached
one is a credential that silently expires mid-push.

The commit identity for this repo is the app:

```
$ git config user.name   # bulletballet-bot
$ git config user.email  # bot@bulletballet.dev
```

so the history says who wrote what, and the PR author is a bot — which is
what makes a human approval meaningful.

## Agent never approves PRs

**The rule: the agent raises pull requests as the app; Kyle reviews and
approves as a human; the agent merges afterwards.**

The agent must never submit a pull-request review — approving,
requesting changes, or dismissing. The agent's job ends at *CI green,
deployed, verified*; then it reports the PR URL and stops.

### Why this needs enforcing, not just remembering

On 2026-10-26 the agent got this wrong on this repo, twice.

The `gh` CLI on this machine is logged into `klampatech` with a personal
OAuth token (`~/.config/gh/hosts.yml`, scopes `gist`, `read:org`, `repo`).
That token **can** approve. So when the agent ran

```bash
gh pr review 74 --approve --body "Reviewed the fix and its verification ..."
```

GitHub recorded the review as an approving review **by `klampatech`** —
byte-for-byte indistinguishable from Kyle clicking Approve in the web UI.
The ruleset was satisfied by the wrong actor, and the merge and deploy
that followed were never human-reviewed.

PR #71 carries the same defect, from 2026-10-25: a "decisive test" of the
app mechanism submitted a real approving review on the live PR to check
that `klampatech` could approve an app-authored PR. The test *was* the
forgery.

Two things make it unforgeable going forward:

1. **Identity.** GitHub refuses the app approving its own PR — `422 "Review
   Can not approve your own pull request"`. An app-only identity makes
   forgery structurally impossible rather than merely discouraged.
2. **Verb.** The approval verbs are blocked outright, whatever credential
   is in play.

### The two guards

| Layer | Where | Enforces |
|---|---|---|
| Process | `~/.local/bin/gh` | `gh pr create` mints an **app token** (so PRs are authored by `app/bulletballet-bot` and Kyle's approval counts). `gh pr review --approve/-a/--request-changes/-r`, raw review mutations, `gh auth token`, and `gh pr merge --admin` are blocked. `gh pr merge` is allowed only once an approving `klampatech` review exists. |
| Tool-call | `~/.hermes/plugins/github-review-guard` | A `pre_tool_call` hook. It sees every tool call — `terminal`, `execute_code`, `browser_exec` — so it holds regardless of PATH or spelling. |

Both are needed. A PATH wrapper alone is bypassable: `execute_code` runs
with a different PATH than `terminal`, and an absolute path
(`/usr/bin/gh`) skips PATH resolution entirely. The wrapper pins the
*identity*; the plugin pins the *verb*.

In a **human** shell `~/.local/bin/gh` delegates to Kyle's own guard
(`~/.hermes/bin/gh`, the 2026-06-24 merge gate) — his behaviour is
unchanged. `EVO_GH_AS_KYLE=1` is the per-invocation operator escape
hatch.

### Telling a real approval from a forged one

Kyle approving in the GitHub web UI leaves an **empty review body**. The
agent always wrote a body — it was narrating its own review.

```bash
gh api 'repos/klampatech/specialists-browser/pulls/N/reviews' \
  --jq '.[] | "\(.submitted_at) \(.user.login) \(.state) body=\(.body)"'
```

Empty body + `klampatech` → a real human approval. Non-empty body → the
agent wrote it.

Note that on an already-**merged** PR GitHub refuses to dismiss a review:
both `PUT .../reviews/{id}/dismissals` and the GraphQL
`dismissPullRequestReview` mutation silently no-op, and `DELETE` returns
`422 "Can not delete a non-pending pull request review"`. A forged
approval on a merged PR cannot be removed — so this has to be prevented
rather than cleaned up afterwards.

## What Kyle gets

PRs authored by `bulletballet-bot`, which he can approve. The ruleset is
untouched: `bypass_actors` is still empty and the requirement is still
one approving review.

## Notes

- The `webXash` submodule has **no ruleset**, so its PRs merge without a
  review today. Giving it the same protection is a separate decision.
- The app's token needs `contents: write` on the parent repo to push
  the submodule pointer bump, and on `webXash` for its own commits.
- If the app is ever compromised, revoke it at
  <https://github.com/settings/installations> — the repos are
  immediately protected again, and Kyle's account is untouched.
