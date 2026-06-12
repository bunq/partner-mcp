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

**`partner-api-swagger.yaml`** — Update the OpenAPI spec to reflect all changes.
Keep the same structure and formatting. Update request bodies, response schemas,
and endpoint descriptions as needed.

**`Partner_Onboarding_postman_collection.json`** — Update request bodies and URLs
to match the new API behaviour. Keep all existing pre-request scripts and test
scripts intact unless they're directly broken by the change.

---

### Step 4 — Update the documentation

For each affected doc page, rewrite the relevant sections to reflect the changes.
Keep the same tone and structure as the existing pages. Be specific — show the
new request/response format with a concrete example.

If a field was renamed or removed, show the old format and the new format
side by side so partners can see exactly what to change.

---

### Step 5 — Write the changelog entry

Add a new entry to `docs/changelog.md` at the top of the file with today's date.

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

### Step 6 — Open a GitHub PR

Create a pull request on `github.com/bunq/partner-mcp` with:

- **Branch name:** `update/mr-XXX-YYY-ZZZ` (using the MR numbers)
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
