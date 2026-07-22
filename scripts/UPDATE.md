# bunq Partner MCP — Update Script

Paste this prompt into your Claude terminal session (the one with GitLab access)
and replace the MR numbers at the top. Claude will do the rest.

---

## How to use

1. Open your terminal with Claude (the one connected to GitLab)
2. Copy everything from the `---PROMPT START---` line below
3. Replace `!XXX, !YYY` with the actual MR numbers you want to include
4. Paste into Claude and send

---PROMPT START---

I want to update the bunq Partner MCP server and Swagger spec based on the following
GitLab MRs that were just deployed to sandbox:

**MRs to include:** !XXX, !YYY, !ZZZ

Please do the following steps in order:

---

### Step 1 — Read the MRs

For each MR number above, use the GitLab tool to fetch:
- The MR title and description
- The full diff (which files changed and how)
- Any comments or review discussion that clarifies intent
- The labels (to understand if it's a breaking change, new feature, or bugfix)

Summarise what changed in plain English before proceeding.

---

### Step 2 — Determine impact

Based on the diffs, identify:

1. **Which API endpoints changed** (new, modified, or removed)
2. **Which request/response fields changed** (added, renamed, removed, type changes)
3. **Any breaking changes** — things partners need to update in their integration

---

### Step 3 — Update the MCP server

In the GitHub repo `bunq/partner-mcp`, update the following files as needed:

**`src/tools.ts`** — Update tool input schemas if:
- A field was added, renamed, or removed from a request body
- A new endpoint was added (add a new tool definition)
- An enum value changed

**`src/handler.ts`** — Update tool implementations if:
- The request body structure changed
- A new tool was added
- An endpoint path changed

**`partner-api-swagger.yaml`** — The maintained OpenAPI spec (this file exists in the
repo). Update the affected paths/schemas **surgically** — same rules as the docs in
Step 4. Never regenerate the file from scratch; keep its existing structure, ordering,
and formatting intact.

**Capability check (before writing tool code):** Some endpoints need client
capabilities `src/bunq-client.ts` may not have yet — e.g. application-layer request
encryption (`client.call(..., encrypt=true)`), binary/attachment upload, or response
decryption. If an MR's endpoint needs a capability the client does **not** already
support, do **not** add a tool that silently won't work. Flag it as a manual
follow-up in your summary and skip the non-functional tool.

---

### Step 4 — Show the diff, then open a GitHub PR after approval

First run `git diff` (and `git status` for new files) and present the full diff.
**Stop and wait for approval** before committing, branching, or pushing.

Once approved, create a pull request on `github.com/bunq/partner-mcp` with:

- **Branch name:** `update/mr-XXX-YYY-ZZZ` (using the MR numbers). If the branch
  already exists, append a short suffix so nothing is overwritten.
- **PR title:** `Update: [short description of main change]`
- **PR description:** Paste the plain-English summary from Step 2, plus links
  to the GitLab MRs that were the source

List every file you changed in the PR description so the reviewer knows
exactly what to check.

---

After all steps are done, give me a summary of:
1. What changed in the API
2. Which files were updated
3. A link to the PR
4. Whether partners need to take any action (breaking changes)

---PROMPT END---
