# AquaFlow AI — Production Readiness

This document distinguishes what is implemented in the hackathon application from what remains integration/deployment work. It must be kept accurate; do not present planned capabilities as live.

## Implemented and testable in this repository

| Capability | Status | Notes |
|---|---|---|
| Responsive web application | Implemented | Desktop, tablet and mobile layouts |
| Demo authentication | Implemented | Signed expiring tokens; synthetic demo identity only |
| RBAC policy model | Implemented | Server-side permissions; unknown roles fail to read-only |
| Tenant-scoped JSON store | Implemented for demo | Tenant checks covered by automated tests |
| Programme/project CRUD | Implemented | Generic governed resource APIs |
| Milestones/work items/comments | Implemented | CRUD/archive/restore APIs and UI |
| Incident/work-order management | Implemented | Operational workflow data and UI |
| Asset/meter register | Implemented | Demo asset and meter intelligence workspace |
| NRW calculation | Implemented | Based on supplied observations; missing data is not invented |
| Revenue/finance tracking | Implemented | Forecast, AI estimate and verified realised values separated |
| Risks/interventions/notifications | Implemented | Governed records and workspace |
| Human approval decisions | Implemented | Explicit approve/reject API with audit trail |
| Audit activity | Implemented | User/AI/system activity stored in demo data store |
| Universal search | Implemented | Results filtered by permissions and tenant scope |
| CSV/executive JSON reporting | Implemented | Permission checked |
| Evidence/document metadata | Implemented | Secure private upload/download path for supported formats |
| AI executive briefing | Implemented | Deterministic, source-grounded demo assistant |
| AI command layer | Implemented | Governed navigation and selected project/work-item actions |
| Browser speech input/output | Implemented where browser supports it | One cancellable TTS path; does not guarantee a specific native voice |
| CI/testing | Implemented | Syntax, domain, RBAC, tenant and secret/runtime-data guards |

## Integration-ready / not yet production connected

| Capability | Status | Production requirement |
|---|---|---|
| PostgreSQL | Target schema supplied | Managed PostgreSQL, migrations, backups, RLS/tenant policy |
| Enterprise identity/MFA | Planned | SITA/municipal IdP using OIDC/SAML and governed role mapping |
| Dedicated African STT/TTS | Integration-ready | Validate provider, voice quality, languages, privacy and latency |
| Production LLM/RAG | Integration-ready | Approved provider, tool registry, prompt-injection controls, source citations |
| GIS | Integration-ready | Approved GIS service, spatial data governance and map UI |
| SCADA/telemetry/IoT | Integration-ready | Read-only adapters, buffering, validation and operational-security review |
| Billing/ERP | Integration-ready | Reconciliation rules, data contracts and financial controls |
| Object storage | Planned | Private bucket, malware scanning, encryption, retention and signed access |
| SIEM/observability | Planned | Central logs, metrics, traces, alerting and incident response |
| HA/DR | Planned | Multi-zone design, backups, restore testing and RTO/RPO |

## Production gates

A production deployment must not proceed until all applicable gates are satisfied:

1. Repository is private and branch protection is enabled.
2. Demo mode is disabled.
3. Production identity provider and MFA are configured.
4. Strong secrets are stored in a managed secret store, not `.env` files in deployment images.
5. PostgreSQL or approved durable database replaces the JSON demo store.
6. Tenant isolation is verified with API and database tests.
7. Evidence storage uses private object storage with malware scanning.
8. POPIA processing, retention and access-control assessments are approved.
9. Vulnerability, dependency, penetration and IDOR/BOLA tests pass.
10. AI provider/tool configuration is reviewed for prompt injection, exfiltration and cross-tenant leakage.
11. Backups and restore procedures are tested.
12. Monitoring, alerting and security incident response are operational.
13. External integrations are individually labelled live only after successful acceptance testing.

## Deployment principle

The hackathon product demonstrates the complete operating model. Production deployment must replace demo infrastructure deliberately rather than merely exposing the demo stack to the internet.
