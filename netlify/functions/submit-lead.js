'use strict';

const FIELD_ALLOWLIST = new Set([
  'lead[firstname]',
  'lead[lastname]',
  'lead[email]',
  'lead[phone1]',
  'lead[service_trusted_form]',
  'lead[service_leadid]',
  'lead_consent[tcpa_consent]',
  'lead_education[program_id]',
  'lead_education[grad_year]',
  'lead_education[education_level_id]',
  'lead_address[address]',
  'lead_address[city]',
  'lead_address[state]',
  'lead_address[zip]',
  'subid2',
  'subid3',
  'subid4',
  'meta_event_id',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'campaign_id'
]);

const PROGRAMS = new Set(['227753', '227754', '227755', '227756']);
const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function key(parts) {
  return parts.join('_');
}

function setting(parts) {
  return process.env[key(parts)];
}

function enabled(parts) {
  return String(setting(parts)).toLowerCase() === 'true';
}

function reply(statusCode, body) {
  return { statusCode, headers: RESPONSE_HEADERS, body: JSON.stringify(body) };
}

function clean(value, limit) {
  return String(value || '').trim().slice(0, limit);
}

function clientAddress(event) {
  const forwarded = event.headers && (event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For']);
  return clean(forwarded ? forwarded.split(',')[0] : '', 64);
}

function hasSameOrigin(event) {
  const requestHost = clean(event.headers && (event.headers.host || event.headers.Host), 255);
  const requestOrigin = clean(event.headers && (event.headers.origin || event.headers.Origin), 500);
  if (!requestHost || !requestOrigin) return false;
  try {
    return new URL(requestOrigin).host === requestHost;
  } catch (error) {
    return false;
  }
}

function makePayload(event) {
  const inbound = new URLSearchParams(event.body || '');
  const outbound = new URLSearchParams();

  for (const [name, value] of inbound.entries()) {
    if (FIELD_ALLOWLIST.has(name)) outbound.set(name, clean(value, 500));
  }

  const programId = outbound.get('lead_education[program_id]');
  if (!PROGRAMS.has(programId)) return null;

  outbound.set('lead[media_type]', 'noncallcenter');
  outbound.set('lead[test]', enabled(['LEAD', 'TEST', 'FLAG']) ? 'true' : 'false');
  outbound.set('lead[ip]', clientAddress(event));
  outbound.set('lead[signup_url]', setting(['LEAD', 'SIGNUP', 'URL']) || '');
  outbound.set('campaign_code', setting(['LEADHOOP', 'CAMPAIGN', 'CODE']) || '');
  outbound.set('lead_education[campus_id]', setting(['LEADHOOP', 'CAMPUS', 'ID']) || '');
  outbound.set('lead_education[start_date]', 'Immediately');
  outbound.set('lead_background[internet_pc]', 'Y');

  const fixedFields = setting(['LEADHOOP', 'FIXED', 'FIELDS']);
  if (fixedFields) {
    const parsed = JSON.parse(fixedFields);
    Object.entries(parsed).forEach(function (entry) {
      outbound.set(entry[0], clean(entry[1], 500));
    });
  }

  return outbound;
}

async function recordProgramCap(programId) {
  const capEndpoint = setting(['PROGRAM', 'CAP', 'ENDPOINT']);
  const capCampaign = setting(['PROGRAM', 'CAP', 'CAMPAIGN']);
  if (!capEndpoint || !capCampaign || !PROGRAMS.has(programId)) return;
  try {
    await fetch(capEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign: capCampaign, programId })
    });
  } catch (error) {
    console.error(JSON.stringify({ event: 'program_cap_update', completed: false }));
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: Object.assign({ Allow: 'POST' }, RESPONSE_HEADERS), body: JSON.stringify({ outcome: 'unavailable' }) };
  }

  if (!hasSameOrigin(event) || (event.body || '').length > 100000) {
    return reply(400, { outcome: 'unavailable' });
  }

  const submissionEnabled = enabled(['LEAD', 'SUBMISSION', 'ENABLED']);
  const validationFlag = enabled(['LEAD', 'TEST', 'FLAG']);
  const campaignEnabled = enabled(['LEADHOOP', 'CAMPAIGN', 'ENABLED']);
  if (!submissionEnabled || (!validationFlag && !campaignEnabled)) {
    return reply(503, { outcome: 'unavailable' });
  }

  let payload;
  try {
    payload = makePayload(event);
  } catch (error) {
    return reply(503, { outcome: 'unavailable' });
  }
  if (!payload) return reply(400, { outcome: 'unavailable' });

  const certificatePresent = Boolean(payload.get('lead[service_trusted_form]'));
  const leadIdPresent = Boolean(payload.get('lead[service_leadid]'));
  console.info(JSON.stringify({ event: 'compliance_presence', trustedForm: certificatePresent, leadId: leadIdPresent }));

  const endpoint = setting(['LEADHOOP', 'ENDPOINT']);
  const authorization = setting(['LEADHOOP', 'AUTHORIZATION']);
  const rejectedRedirect = setting(['REJECTED', 'LEAD', 'REDIRECT']);
  if (!endpoint || !authorization || !rejectedRedirect || !payload.get('campaign_code') || !payload.get('lead_education[campus_id]') || !payload.get('lead[signup_url]')) {
    return reply(503, { outcome: 'unavailable' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 12000);
  try {
    const vendorResponse = await fetch(endpoint + '?' + payload.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization
      },
      signal: controller.signal
    });
    if (!vendorResponse.ok) return reply(502, { outcome: 'unavailable' });

    const vendorResult = await vendorResponse.json();
    if (vendorResult && vendorResult.status === 'success') {
      return reply(200, { outcome: 'accepted' });
    }

    if (vendorResult && vendorResult.status === 'failure') {
      const reasons = vendorResult.reason && Array.isArray(vendorResult.reason.base) ? vendorResult.reason.base : [];
      if (reasons.some(function (reason) { return /reached the monthly (offer|campaign) cap for program/i.test(String(reason)); })) {
        await recordProgramCap(payload.get('lead_education[program_id]'));
      }
      return reply(200, {
        outcome: 'redirect',
        location: rejectedRedirect
      });
    }
    return reply(502, { outcome: 'unavailable' });
  } catch (error) {
    console.error(JSON.stringify({ event: 'submission_error', completed: false }));
    return reply(502, { outcome: 'unavailable' });
  } finally {
    clearTimeout(timeout);
  }
};
