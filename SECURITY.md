# Security Policy

Smarter Weather takes the security of our developer platform seriously. This
document describes how to report vulnerabilities, what to expect after you
report, and what's in scope.

## Reporting a vulnerability

**Please do not open public GitHub issues for security reports.** Public
issues are visible to everyone and risk exposing users to attack before a fix
is available.

Use one of these private channels instead:

- **Preferred: GitHub private vulnerability reporting.** Go to the
  [Security tab](https://github.com/smarterweather/developer/security) on
  this repository and click **Report a vulnerability**. This creates a
  private advisory visible only to you and the Smarter Weather security team.
- **Email:** Send the details to alex@smarterweather.com with the subject
  line beginning `SECURITY:` so it routes correctly.

If the issue is actively being exploited, mark it clearly in the report and
include "URGENT" in the subject so it gets escalated immediately.

## Service Level Agreement

We commit to the following response timeline for valid reports:

| Stage | Target |
| ----- | ------ |
| Acknowledge receipt | Within 48 hours |
| Initial assessment and severity rating | Within 5 business days |
| Status update cadence | At least every 7 days while open |
| Fix or mitigation deployed | Within 90 days for high/critical severity, longer for low/medium with documented rationale |
| Public advisory published | After fix is deployed and a reasonable patch window has elapsed |

We will keep you informed throughout. If you don't hear from us within 48
hours, please follow up -- email occasionally goes to spam.

## Coordinated disclosure

We follow a 90-day coordinated disclosure model:

- We aim to ship a fix and publish an advisory within 90 days of acknowledging
  a high- or critical-severity report.
- If we need more time (for example, the fix requires coordination with
  upstream dependencies or a complex deployment), we'll discuss the timeline
  with you and document the reasoning.
- Once the fix is deployed and a reasonable patch window has passed, we
  publish a security advisory crediting the reporter (unless they prefer to
  remain anonymous).
- Please do not publicly disclose details of the vulnerability before the
  advisory is published.

## What's in scope

This security policy covers:

- The hosted Smarter Weather APIs at `api.smarterweather.com` and
  `mcp.smarterweather.com` (and any other `*.smarterweather.com` host
  controlled by Smarter Weather LLC).
- The developer dashboard at `smarterweather.com/developers`.
- The `@smarterweather/mcp-weather` and `@smarterweather/mcp-onboarding` npm packages (when published).
- Code in this repository (SDKs, examples, agent skills).
- The signing, hashing, and storage of API keys issued by the platform.

## What's out of scope

- Reports against domains we don't control. If you find an issue on a
  third-party that uses Smarter Weather, please report it to that party.
- Issues that require physical access to a device, social engineering of
  Smarter Weather staff, or root-level access to a developer's local
  machine.
- Self-XSS that requires the victim to paste attacker-controlled code into
  their own browser console.
- Missing security headers on documentation pages with no authenticated
  state.
- Volumetric DDoS reports without a novel amplification vector. We have
  upstream protections for these.
- Vulnerabilities in dependencies that we have not deployed. If you believe
  a deployed dependency contains a vulnerability we haven't addressed,
  please report it under the SLA above.

## Acceptable testing

When testing in good faith, please:

- Limit testing to your own accounts and your own data.
- Use minimal load -- don't run vulnerability scanners against production
  endpoints.
- Stop and report immediately if you accidentally access another user's
  data; do not download, exfiltrate, or share it.
- Do not test against denial of service.
- Don't social engineer or phish Smarter Weather staff or contractors.

We will not pursue legal action against good-faith security research that
follows this policy.

## Recognition

We do not currently operate a paid bug bounty program. We do publish
researcher acknowledgements with the corresponding advisory unless the
reporter prefers anonymity. If our program later becomes paid, we'll
backdate eligibility for reports that meet the criteria.

## Public-key encryption (optional)

If you would prefer to encrypt sensitive details, request our PGP key in
your initial report and we will send it back over the same channel.

## Out-of-band questions

For non-vulnerability security questions (architecture, compliance posture,
sub-processor list, data handling), see https://smarterweather.com/contact
or open a discussion using the **API contract question** issue template.
