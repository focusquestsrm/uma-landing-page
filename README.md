# UMA college matcher

Standalone production-ready landing page for the approved Fallon UMA experience. This repository is isolated from the multi-tenant Lead Ventures platform and from other landing pages.

## Architecture

- `src/` contains the public static application.
- `netlify/functions/submit-lead.js` is the only lead-submission path.
- `netlify.toml` publishes `src` and deploys the server function.
- LeadHoop routing, authorization, fixed fields, and submission controls are held in protected Netlify configuration rather than the public bundle.
- The browser sends form data by HTTPS POST to the same-site function. The function supplies the protected routing fields and controls the validation classification.

TrustedForm creates a new certificate for each visitor session. The approved Jornaya campaign creates the LeadiD token. The function records only whether each value was present.

## Deployment safeguards

The current operational configuration permits controlled validation submissions while preventing delivery to the client campaign. Real-lead delivery requires both the validation classification to be removed and the campaign activation lock to be enabled. Those two changes must happen only after Mariano reactivates the campaign and the project owner gives explicit approval.

The pages include `noindex, nofollow` while the temporary Netlify domain is in use. Remove that robots tag from both HTML documents only when the final custom domain is approved for public traffic.

## Rollback

In Netlify, open **Deploys**, select the last known-good production deploy, and choose **Publish deploy**. If submission must stop immediately, disable the server-side submission control in the protected site configuration without changing the browser bundle.

## Security

Never commit credentials, vendor responses, protected routing values, lead data, compliance certificates, or local deployment state. Browser responses must remain limited to the normalized outcomes used by the page.
