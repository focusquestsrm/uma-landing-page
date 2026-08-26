# UMA college matcher

Standalone production-ready landing page for the approved Fallon UMA experience. This repository is isolated from the multi-tenant Lead Ventures platform and from other landing pages.

## Architecture

- `src/` contains the public static application.
- `src/data/uma-kayla-programs.csv` is the maintained program source for this campaign.
- The build validates that CSV and writes `src/data/uma-kayla-programs.json` for the browser and server function.
- `netlify/functions/submit-lead.js` is the only lead-submission path.
- Netlify Blobs store `uma-program-availability` holds non-PII runtime status separately from the CSV.
- The visitor, protected management, and scheduled reset functions read/write only validated `uma-health:<program-id>` records.
- `netlify.toml` publishes `src` and deploys the server function.
- The landing page contains the complete three-step inquiry form. Program cards select the exact configured program and scroll to that form without navigating away.
- `src/programs/connect/form-update-health.html` remains available as a directly loadable form route.
- LeadHoop routing, authorization, fixed fields, and submission controls are held in protected Netlify configuration rather than the public bundle.
- The browser sends form data by HTTPS POST to the same-site function. The function supplies the protected routing fields and controls the validation classification.

TrustedForm creates a new certificate for each visitor session. The approved Jornaya campaign creates the LeadiD token. The function records only whether each value was present. Meta Pixel records PageView and fires Lead only after a successful LeadHoop response. Google Places enhances U.S. address entry when a restricted browser key is configured; manual entry always remains available.

## Program configuration

Edit `src/data/uma-kayla-programs.csv` to manage the campaign program list. Each row requires a numeric `program_id`, a nonblank `program_name`, `active` set to `true` or `false`, and a unique positive `display_order`.

- Add a program by adding a complete row with an approved LeadHoop program ID.
- Remove a program by deleting its row.
- Reorder programs by assigning unique `display_order` values.
- Deactivate a program by changing `active` to `false`; inactive rows are retained in the maintained source but omitted from visitor choices and rejected by the server.

Run `npm run build` after editing. The build stops on missing files, empty data, malformed rows, missing or duplicate IDs, blank names, invalid active values, or duplicate display orders. Never substitute programs from another school or campaign.

## Server configuration

`.env.example` lists the required setting names with nonfunctional placeholders. Real values belong only in encrypted Netlify environment variables. The server fails closed if a required value is missing or malformed, if the request origin is not explicitly allowed, or if the selected program is not active in the generated configuration.

No application-level rate limiter is included because an in-memory counter is not reliable across serverless instances. Configure traffic controls at the Netlify edge if they become necessary.

Accepted and business-failed outcomes use separate server-side redirect variables even when both currently point to the same destination. Technical failures remain retryable and do not redirect as accepted.

## Program availability operations

See `docs/Program-Availability-Data-Model.md` and `docs/Program-Availability-Operations.md` for the Blob schema, monthly capped-program restoration, protected manual status changes, and recovery process. Supporting design, requirements, and production-safe verification documents are in `docs/`.

## Interaction regression checks

With Chrome running in remote-debugging mode on port `9223` and the built `src` directory served on port `8888`, run `npm run check:interactions`. An optional base URL can be passed directly to `checks/interaction-qa.js` for deployed-site verification.

The interaction suite tests every program card and ID, all form steps without final submission, direct-route refresh, Back/Forward behavior, JavaScript-disabled visibility, compliance tokens, content visibility, and overflow at 390, 768, 1366, and 1440 pixels. It fails if the submission function is called.

## Deployment safeguards

Production submission controls remain server-side in encrypted Netlify configuration. The application has no browser-visible mode switch. Set `LEAD_SUBMISSION_ENABLED=false` and redeploy to stop submissions immediately.

The production pages are indexable and use canonical URLs for `https://uma.back2learn.com`.

## Rollback

In Netlify, open **Deploys**, select the last known-good production deploy, and choose **Publish deploy**. If submission must stop immediately, disable the server-side submission control in the protected site configuration without changing the browser bundle.

## Security

Never commit credentials, vendor responses, protected routing values, lead data, compliance certificates, or local deployment state. Browser responses must remain limited to the normalized outcomes used by the page.
