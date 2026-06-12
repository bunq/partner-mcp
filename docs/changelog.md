# Changelog

This changelog is updated automatically when Partner API changes are deployed to sandbox. Each entry is written for partner developers and describes what changed and what action (if any) is required.

---

## 2026-06-12

### What changed
- The `GET /notification-filter-failure` response now includes two new fields: `user_id` (the ID of the user whose notification filter failed) and `user_requested_id` (the ID of the requesting user when the filter was created via an API key, or `null` for direct user filters). Partners can now identify exactly which provisioned user a failure record belongs to without a separate lookup.
- Partner API calls that submit onboarding fulfillments (addresses, personal info, tax residency, nationality) on behalf of provisioned users no longer fail when the request originates from an IP address that resolves as masked or anonymised (e.g. behind a VPN, proxy, or corporate NAT). The IP country check is now bypassed for all `API_PARTNER` requests, so server-side integrations with dynamic or masked egress IPs will work without workarounds.

### New capabilities
- Use `user_id` and `user_requested_id` in webhook failure records to route or log failures per provisioned user directly from the failure list response (MR !63005).
- Partners whose users or servers previously received 400 errors due to masked-IP country verification can now submit all onboarding fulfillment endpoints without needing to whitelist or expose a fixed IP (MR !63263).

<!-- New entries are added above this line by the UPDATE.md script -->
