#!/bin/bash

# update.sh — bunq Partner MCP updater
# Usage: ./update.sh 234 251 267

if [ $# -eq 0 ]; then
  echo ""
  echo "Usage: ./update.sh <MR numbers>"
  echo "Example: ./update.sh 234 251 267"
  echo ""
  exit 1
fi

# Build MR list
MR_FORMATTED=$(for mr in "$@"; do echo "!$mr"; done | tr '\n' ' ')
MR_BRANCH=$(echo "$@" | tr ' ' '-')
TODAY=$(date +%Y-%m-%d)

PROMPT="I want to update the bunq Partner MCP server and GitBook documentation based on the following GitLab MRs that were just deployed to sandbox:

**MRs to include:** $MR_FORMATTED

Please do the following steps in order:

### Step 1 — Read the MRs
For each MR, fetch the full diff, description, and any review comments from GitLab.
Summarise what changed in plain English before doing anything else.

### Step 2 — Determine impact
Identify:
- Which API endpoints changed (new, modified, removed)
- Which request/response fields changed
- Any breaking changes partners need to act on
- Which doc pages are affected (chapter-0 through chapter-8)

### Step 3 — Update the GitHub repo
Clone https://github.com/bunq/partner-mcp and update as needed:
- src/tools.ts — fix tool schemas if fields/endpoints changed
- src/handler.ts — fix API calls if request bodies/paths changed
- docs/chapter-X/page.md — rewrite affected pages
- docs/changelog.md — add a new entry at the top

Changelog entry format:
## $TODAY

### What changed
[1-3 sentences, plain English, for a partner developer]

### What you need to do
[Only if breaking. Omit if purely additive. Mark with ⚠️]

### New capabilities
[Only if new endpoints/fields added. Omit otherwise.]

### Step 4 — Open a PR on github.com/bunq/partner-mcp
- Branch: update/mr-$MR_BRANCH
- Title: Update: [short description of main change]
- Description: plain-English summary + links to the GitLab MRs
- List every file changed

### Done — give me:
1. What changed in the API
2. Which files were updated
3. Link to the PR
4. Whether partners need to take any action"

echo "$PROMPT" | claude
