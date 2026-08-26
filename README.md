# UMA college matcher

Standalone production-ready landing page for the approved Fallon UMA experience. This repository is isolated from the multi-tenant Lead Ventures platform and from other landing pages.

## Architecture

- `src/` contains the public static application.
- `src/data/uma-kayla-programs.csv` is the maintained program source for this campaign.
- The build validates that CSV and writes `src/data/uma-kayla-programs.json` for the browser and server function.
- `netlify/functions/submit-lead.js` is the only lead-submission path.
- `netlify.toml` publishes `src` and deploys the server function.
- LeadHoop routing, authorization, fixed fields, and submission controls are held in protected Netlify configuration rather than the public bundle.
- The browser sends form data by HTTPS POST to the same-site function. The function supplies the protected routing fields and controls the validation classification.

TrustedForm creates a new certificate for each visitor session. The approved Jornaya campaign creates the LeadiD token. The function records only whether each value was present.

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

## Deployment safeguards

The current operational configuration permits controlled validation submissions while preventing delivery to the client campaign. Real-lead delivery requires both the validation classification to be removed and the campaign activation lock to be enabled. Those two changes must happen only after Mariano reactivates the campaign and the project owner gives explicit approval.

The pages include `noindex, nofollow` while the temporary Netlify domain is in use. Remove that robots tag from both HTML documents only when the final custom domain is approved for public traffic.

## Rollback

In Netlify, open **Deploys**, select the last known-good production deploy, and choose **Publish deploy**. If submission must stop immediately, disable the server-side submission control in the protected site configuration without changing the browser bundle.

## Security

Never commit credentials, vendor responses, protected routing values, lead data, compliance certificates, or local deployment state. Browser responses must remain limited to the normalized outcomes used by the page.
