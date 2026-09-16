# UMA education mapping correction — pre-deployment report

## Authority and deployment target

The campaign owner confirmed the authoritative LeadHoop campaign 11856 posting specifications in this session on September 16, 2026. The accepted outbound IDs are **2331, 2332, 2333, 2334**. The earlier proposed inclusion of 2330 is superseded: 2330 is a recognized qualification but is ineligible for this campaign.

- Repository: `C:\Users\danie\uma-landing-page`
- Remote: `https://github.com/focusquestsrm/uma-landing-page.git`
- Local, remote, and Netlify production branch: `fallon-duplicate`
- Starting and currently published commit: `0f101064e58642fa9ce08ca35bb3bae2b239a313`
- Netlify site: `back2learn-uma` (`fc146de2-c110-4edc-bd04-3fb559ec1a95`)
- Production: `https://matchers.back2learn.com/uma`
- Starting working tree: clean. Correction remains uncommitted, unpushed, and undeployed pending explicit approval.

## Confirmed cause and evidence limits

The live HTML and both checked-in form pages assigned unapproved numeric values directly to education options. The browser serialized those values without mapping them. The function allowed the education field name but did not validate its value, so it could forward invalid IDs to LeadHoop. The server's fixed-field merge could also overwrite education; that was a confirmed vulnerability, not a confirmed cause of the historical rejections.

The initial deployment commit `3cc215f` already contains sequential IDs 2335, 2336, and 2337 for higher degrees. The ignored original supplied form instead assigns all degree options to 2334. This establishes the presence of the incorrect numeric assignments in the initial deployed implementation; it does not establish the original author's reasoning. No runtime off-by-one arithmetic, label conversion, or education storage/restoration was found.

The owner-supplied rejection evidence associates 2335 with No High School Diploma and 2336 with High School Diploma. The inspected live and repository HTML associate those IDs with Bachelor's and Master's degrees instead. Both observations are recorded here without claiming that today's form proves which labels historical visitors saw. Historical records were not modified or resubmitted.

## Previous mapping in the inspected live and repository forms

| Label | Previous value |
| --- | --- |
| GED | 2331 |
| High School Graduate | 2332 |
| Some College | 2333 |
| Associate's Degree | 2334 |
| Bachelor's Degree | 2335 |
| Master's Degree | 2336 |
| Doctoral Degree | 2337 |

## Corrected mapping

| Displayed label | Value | Outbound eligibility |
| --- | --- | --- |
| No High School Diploma | 2330 | Blocked; eligibility message |
| GED | 2331 | Accepted |
| High School Diploma | 2332 | Accepted |
| Some College (1–29 credits) | 2333 | Accepted |
| Some College (30–59 credits) | 2333 | Accepted |
| Some College (60+ credits) | 2333 | Accepted |
| Associates Degree | 2334 | Accepted |
| Bachelors Degree | 2334 | Accepted |
| Masters Degree | 2334 | Accepted |
| Doctorates/PhD | 2334 | Accepted |

Multiple labels intentionally share an ID, as specified by the campaign. Each displayed label maps to one ID. No High School Diploma remains selectable so the visitor can receive an honest eligibility explanation; it cannot progress or be posted.

## Complete path audit

- Active form definitions: `src/index.html` and `src/programs/connect/form-update-health.html`. Netlify publishes only `src`, with `/uma` rewrites pointing to the same pages. Both selects are generated from the shared approved mapping at build time.
- Data attributes and hidden fields: no education override or alternate mapping found. Regression checks reject a hidden education input in either form.
- Browser configuration: `src/js/education-levels.js` now owns labels, accepted IDs, and safe validation messages. It loads before `function2.js` in both forms.
- Storage: active session/local storage retains attribution, program selection, and privacy-safe submission state, not education. Stale education injected into a restored field is revalidated; unrelated education storage entries are not restored.
- Serialization: `function2.js` uses `URLSearchParams(new FormData(form))`. Education is checked on change, before step progression, and before final submission. The selected value is never substituted.
- Function: `submit-lead.mjs` delegates to `_shared/submit-lead-handler.js`. The handler checks exactly one raw education field against the accepted allowlist before normalization or storage. Missing, duplicate, malformed, and unaccepted values return HTTP 400 with a recoverable education validation response.
- Payload: the fixed-field merge cannot overwrite education. Immediately before the outbound `fetch`, the handler checks both the allowlist and equality with the original selection.
- Diagnostics: education rejection emits only `{"event":"education_validation_rejected","outboundRequests":0}`; no submitted value, consumer data, or consumer identifier is logged.
- User response: No High School Diploma shows a diploma/GED eligibility message. Other invalid values ask the visitor to select a valid education level. Messages contain no technical IDs. Server education validation returns the browser to step 2 and permits correction.
- Legacy material: `source-original/ForLV/form-update-health.html` is ignored archival input outside the publish directory. Local `.netlify` bundles and `.artifacts` QA copies are generated/ignored, not maintained production sources. They were not rewritten as campaign configuration.
- Fixtures: the server contract fixture now includes accepted education. Invalid numeric values remain only in regression scenarios and this investigation history, not active accepted configurations.

## Files changed

1. `src/js/education-levels.js` — shared approved mapping, allowlist, and messages (new).
2. `scripts/build-education-levels.js` — generate both static selects from that mapping (new).
3. `src/index.html` — corrected options and shared script.
4. `src/programs/connect/form-update-health.html` — identical corrected options and shared script.
5. `src/js/function2.js` — browser validation and recoverable server education errors.
6. `netlify/functions/_shared/submit-lead-handler.js` — raw validation, protected merge, final outbound guard, safe diagnostic.
7. `checks/education-contract.js` — independent specification and every published form mapping check (new).
8. `checks/function-contract.js` — invalid requests, diagnostics, and accepted payload preservation tests.
9. `checks/submission-qa.js` — browser rejection, stale storage, correction, and serialization tests.
10. `checks/interaction-qa.js` — education eligibility and progression on both routes at all four viewport sizes.
11. `package.json` — include education generation and contract checks.
12. `docs/Education-Mapping-Correction.md` — this report (new).

## Verification

- `npm run check`: passed. Includes program, production, education, function, feature, address, and submission contracts.
- Server regression: **23 invalid cases, zero mocked outbound requests**. Includes 2330, 2335, 2336, 2337, blanks, missing fields, arbitrary strings, padded/decimal/exponential values, oversized values, duplicate parameters, and an attempted fixed-field rescue of an invalid input. Invalid education also creates no Blob records.
- Valid server regression: **36 label/override cases** preserve the chosen approved ID (nine eligible displayed labels across four conflicting fixed-field values).
- Browser harness: **11 invalid cases, zero submission requests**; all nine accepted labels serialize their selected ID and permit submission. Server validation permits correction; pending/ambiguous duplicate safeguards still pass.
- `npm run check:limited-navigation`: passed at 390, 768, 1366, and 1440 pixels with zero submission requests.
- `npm run build`: passed; both education selects generated successfully.
- `npm run check:secrets`: passed for working tree and reachable Git history.
- `npm run check:interactions`: passed on both routes at 390, 768, 1366, and 1440 pixels. The expanded education checks ran 20 times (four program paths plus the direct form per viewport): 160 invalid progression/submission attempts remained blocked, and 180 accepted-label progression checks passed. Total submission requests: **0**; browser issues: **0**. TrustedForm and Jornaya tokens populated, no checkbox was present, and navigation, no-JavaScript visibility, and overflow checks passed.
- `node checks/browser-qa.js`: completed with no broken images, horizontal overflow, or browser issues; direct-form progression and compliance tokens were present. Its legacy missing-program-data probe blocks a static JSON URL rather than the current availability endpoint, so that probe is not evidence of availability-failure coverage; availability failure is covered by the function contracts.
- `git diff --check`: passed.

All submission tests use mocks; the local browser server cannot forward a lead to LeadHoop. No real or test lead was submitted to LeadHoop. No phone correction, campaign settings, credentials, program data, TCPA wording, checkbox, Jornaya disclosure label, tracking, address rules, graduation-year rules, redirect settings, CSS, or idempotency implementation was changed. The build in this local environment uses manual address fallback because no Google browser key is configured; Google address contracts still pass.

## Proposed commit and release gate

Proposed commit: `Fix UMA education mapping and reject ineligible submissions`

Final working-tree status: eight modified tracked files and four new files, exactly the twelve files listed above. No changes are staged or committed. Netlify configuration and the published commit remain unchanged.

Only 2331–2334 can pass the corrected outbound boundary. Production still runs the previous code until this correction is approved and deployed. Do not push or deploy before explicit user approval.
