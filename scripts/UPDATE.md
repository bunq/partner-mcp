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

I want to update the bunq Partner MCP server, Swagger, Postman collection, and GitBook
documentation based on the following GitLab MRs that were just deployed to sandbox:

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
4. **Which doc pages are affected** — map changes to the GitBook chapter structure:
   - Chapter 0: auth flow (installation, device, session, signing)
   - Chapter 1: OAuth client and callback URL
   - Chapter 2: user provision (create, monitor, close, token reset)
   - Chapter 3: onboarding (session, fulfillments, KYC/Incode)
   - Chapter 4: webhooks and notification filters
   - Chapter 5: monetary accounts (EUR and non-EUR)
   - Chapter 6: payments
   - Chapter 7: cards (credit, debit, update)
   - Chapter 8: compliance (attachments, user information inquiry)

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

### Step 4 — Update the documentation

Make **minimal, surgical** edits to the affected doc pages. Change only the specific
lines the MR affects — **never rewrite a whole page.**

**Preserve the existing formatting exactly.** Match the surrounding page's conventions:
- `# Title` heading, short prose intro, then the endpoint in a ` ```http ` fence and
  responses in ` ```json ` fences.
- `##` section headers; `⚠️` prefix on critical warnings.
- GitHub tables (`| Field | Type | Description |` with a `|---|---|---|` separator row)
  for field lists.
- `>` blockquotes for callouts; relative links like `./page.md` or
  `../chapter-3-onboarding/create-user-session.md`.

When adding a field to an existing table, add a row in the **same** table style — do
not restructure the table or the page. Do not reflow, re-wrap, re-order, or re-title
existing content. Do not touch pages the MRs do not affect; leave them byte-for-byte
identical.

If a field was renamed or removed, show the old format and the new format so partners
can see exactly what to change. If you add or rename a page, keep `docs/SUMMARY.md`
(the hand-maintained TOC) in sync — only the affected entry.

---

### Step 5 — Write the changelog entry

Add a changelog entry to `docs/changelog.md`, above the
`<!-- New entries are added above this line -->` marker.

If a `## YYYY-MM-DD` section for today already exists, **append** bullets to its
existing subsections — do **not** create a second heading for the same day.

The entry should be written for a **partner developer** — someone integrating
with the bunq Partner API. Write in plain English, not internal jargon.

Structure:
```markdown
## YYYY-MM-DD

### What changed
[1-3 sentences explaining what was updated and why]

### What you need to do
[Only include this section if partners need to change their integration.
If it's a purely additive change, omit this section.]

- [Specific action item]
- [Specific action item]

### New capabilities (if any)
[Only include if new endpoints or fields were added]
```

Mark breaking changes clearly with ⚠️.

---

### Step 6 — Show the diff, then open a GitHub PR after approval

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
