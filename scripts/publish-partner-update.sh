#!/bin/bash

# publish-partner-update.sh — bunq Partner MCP updater
# Usage: ./scripts/publish-partner-update.sh 63005
# Usage: ./scripts/publish-partner-update.sh 63005 63006 63007

GITLAB_REPO="gitlab.bunq.net/system/core"
CLAUDE_AWS_PROFILE="${CLAUDE_AWS_PROFILE:-bunq-services-production/BackendVibeCoder}"

if [ $# -eq 0 ]; then
  echo ""
  echo "Usage: ./scripts/publish-partner-update.sh <MR numbers>"
  echo "Example: ./scripts/publish-partner-update.sh 63005"
  echo "Example: ./scripts/publish-partner-update.sh 63005 63006 63007"
  echo ""
  exit 1
fi

if ! command -v glab &> /dev/null; then
  echo "❌ Error: glab is not installed or not in PATH"
  exit 1
fi

# GitBook writes edits back to origin/main and periodically reorganises the
# docs/ tree. Building on a stale base would resurrect deleted files and clobber
# live docs, so we refuse to run unless the working tree is clean and on the
# latest origin/main.
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: working tree is not clean. Commit or stash changes before updating."
  exit 1
fi

echo "  Syncing to latest origin/main..."
git fetch origin main --quiet
git checkout main --quiet
git merge --ff-only origin/main --quiet || {
  echo "❌ Error: local main has diverged from origin/main. Resolve before updating."
  exit 1
}

MR_BRANCH=$(echo "$@" | tr ' ' '-')
TODAY=$(date +%Y-%m-%d)
MR_FORMATTED=$(for mr in "$@"; do echo "!$mr"; done | tr '\n' ' ')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  bunq Partner MCP — Update Pipeline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  MRs:  $MR_FORMATTED"
echo "  Repo: $GITLAB_REPO"
echo "  Date: $TODAY"
echo ""

# ── Step 1: Fetch MR data ──────────────────────────────────────────────────
echo "┌─ Step 1/3: Fetching MR data from GitLab..."

MR_CONTENT=""
for MR in "$@"; do
  echo "│   Fetching !$MR description..."
  DESCRIPTION=$(glab mr view "$MR" --repo "$GITLAB_REPO" 2>/dev/null)
  if [ -z "$DESCRIPTION" ]; then
    echo "│   ❌ Could not fetch !$MR — check the MR number and your glab auth"
    exit 1
  fi

  echo "│   Fetching !$MR diff..."
  DIFF=$(glab mr diff "$MR" --repo "$GITLAB_REPO" 2>/dev/null)

  MR_CONTENT="$MR_CONTENT

=== MR !$MR ===
$DESCRIPTION

--- DIFF ---
$DIFF
"
  echo "│   ✓ !$MR fetched"
done
echo "└─ ✅ All MR data fetched"
echo ""

# ── Step 2: Build prompt ───────────────────────────────────────────────────
echo "┌─ Step 2/3: Building prompt..."

PROMPT="I want to update the bunq Partner MCP server and GitBook documentation based on the following GitLab MRs that were just deployed to sandbox.

**MRs:** $MR_FORMATTED

Here is the full content of each MR (description + diff):

$MR_CONTENT

Follow these steps in order. Do NOT commit or push anything until Step 5.

### Step 1 — Summarise what changed
Read the MR content above and summarise what changed in plain English before doing anything else.

### Step 2 — Determine impact
Identify:
- Which API endpoints changed (new, modified, removed)
- Which request/response fields changed
- Any breaking changes partners need to act on
- Which doc pages are affected (chapter-0 through chapter-8)

### Step 3 — Make the changes locally (do not commit yet)
Work in the current repo checkout. Edit only what the MRs actually change:
- partner-api-swagger.yaml — the maintained OpenAPI spec. Update the affected paths/schemas SURGICALLY (same rules as docs below). This file already exists — never regenerate it from scratch.
- src/tools.ts — fix tool schemas if fields/endpoints changed
- src/handler.ts — fix API calls if request bodies/paths changed
- docs/chapter-X/*.md — the affected doc pages
- docs/changelog.md — the changelog entry (see format below)

**Capability check — do this before writing any tool code:**
Some endpoints need client capabilities the MCP may not have yet (e.g. application-layer
request encryption via client.call(..., encrypt=true), attachment/binary upload, response
decryption). If an MR's endpoint needs a capability that src/bunq-client.ts does NOT already
support, DO NOT add a tool that silently won't work. Instead, note it clearly in your Step 4
summary as a required manual follow-up, and skip the non-functional tool. Only add tools whose
transport is already supported.

**Documentation editing rules — these are strict:**
- Make MINIMAL, SURGICAL edits. Change only the specific lines the MR affects. NEVER rewrite a whole page.
- PRESERVE the existing formatting exactly. Match the surrounding page's conventions:
  - '# Title' heading, short prose intro, then endpoint in a \`\`\`http fence and responses in \`\`\`json fences.
  - '##' section headers; '⚠️' prefix on critical warnings.
  - GitHub tables ('| Field | Type | Description |' with a '|---|---|---|' separator row) for field lists.
  - '>' blockquotes for callouts; relative links like ./page.md or ../chapter-3-onboarding/create-user-session.md.
- When adding a field to an existing table, add a row in the SAME table style — do not restructure the table or the page.
- Do NOT reflow, re-wrap, re-order, or re-title existing content. Do NOT touch pages the MRs do not affect.
- If a page has no relevant change, leave it byte-for-byte identical.
- If you update or add a doc page, keep docs/SUMMARY.md (the hand-maintained TOC) in sync — but only add/rename the affected entry.

**Changelog format** — edit docs/changelog.md above the '<!-- New entries are added above this line -->' marker:
- If a '## $TODAY' section already exists, APPEND bullets to its existing subsections. Do NOT create a second '## $TODAY' heading.
- Otherwise add a new dated section using this structure:

## $TODAY

### What changed
- [1-3 sentences per change, plain English, for a partner developer. Reference the MR, e.g. (MR !NNNNN).]

### What you need to do
[Only if breaking. Omit if purely additive. Mark with ⚠️]

### New capabilities
- [Only if new endpoints/fields added. Omit otherwise.]

### Step 4 — Show me the diff and STOP
Run 'git diff' (and 'git status' for any new files) and present the full diff for review.
Then STOP and wait for my approval. Do not commit, branch, or push until I confirm.

### Step 5 — After I approve: branch, commit, and open a PR
Only once I have approved the diff:
- Create branch: update/mr-$MR_BRANCH (if it already exists, append a short suffix so nothing is overwritten).
- Commit with a clear message referencing the MRs.
- Push and open a PR on github.com/bunq/partner-mcp using the gh CLI:
  - Title: Update: [short description of main change]
  - Description: plain-English summary + links to the GitLab MRs, and a list of every file changed.

### Done — give me:
1. What changed in the API
2. Which files were updated
3. Link to the PR
4. Whether partners need to take any action
5. Any required manual follow-ups (e.g. client capabilities not yet supported)"

echo "└─ ✅ Prompt ready"
echo ""

# ── Step 3: Send to Claude ─────────────────────────────────────────────────
echo "┌─ Step 3/3: Claude is working..."
echo "│"
echo "│   Reading MR, updating files, then showing the diff for review."
echo "│   This takes 1-3 minutes. Output appears when done."
echo "│"

# acceptEdits auto-applies local file edits but leaves git commit/push gated,
# so the automated run edits and shows the diff without publishing anything.
echo "$PROMPT" | AWS_PROFILE="$CLAUDE_AWS_PROFILE" claude -p --permission-mode acceptEdits

echo ""
echo "└─ ✅ Done"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Review the proposed diff above."
echo "  Approve it in the session to branch, commit, and open the PR."
echo "  Then merge the PR on github.com/bunq/partner-mcp to publish."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
