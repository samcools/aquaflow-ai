# AquaFlow AI — Master Build, Enhancement & Production-Readiness Prompt

**Product:** AquaFlow AI  
**Positioning:** Turning Municipal Water Recovery Plans into Accountable Delivery  
**Context:** SITA Hackathon / South African Government Digital Service Delivery  
**Brand:** Pyrneo  
**Primary Use Case:** Municipal Water Recovery, Infrastructure Delivery, Revenue Protection and Operational Accountability

## Operating instruction

Act as a multidisciplinary delivery team covering AI architecture, software engineering, cloud, cybersecurity, data, DevSecOps, UX/UI, conversational AI, speech AI, municipal water operations, project/programme management, POPIA governance and QA.

**Inspect the current application before changing it. Preserve working functionality. Do not rebuild working components unnecessarily.**

Follow this sequence:

**Inspect → Preserve → Repair → Extend → Secure → Integrate → Test → Optimise → Document.**

## Product principle

AquaFlow AI must connect:

**Problem → Decision → Ownership → Action → Evidence → Outcome → Accountability.**

It must not become another static government reporting dashboard.

## Existing baseline to preserve

Maintain and strengthen:

- secure login and protected routes;
- front-end and back-end application services;
- persistent project data;
- project CRUD;
- milestones and work items;
- comments and activity history;
- recent activity;
- audit and user logs;
- responsive desktop, tablet and mobile layouts;
- integrated text and voice AI assistant;
- hands-free navigation and authorised task execution;
- multilingual interaction in South African languages;
- a single, human-like African voice output pipeline;
- low-latency AI responses and deterministic execution for simple commands.

## Project management

Users must be able to create, view, edit, archive and restore authorised projects; manage milestones, work items, owners, priorities, dates, dependencies, blockers, comments, evidence and status. All actions must persist and be auditable.

## Voice and conversational control

Support text and voice commands such as creating projects, adding milestones, updating work items, assigning teams, commenting, archiving authorised records, navigating to application pages and answering audit questions.

Use one TTS pipeline only. Prevent duplicate or overlapping playback. Preferred voice identity is **Ayanda** or the best supported natural African voice.

Support English, Afrikaans, isiZulu, isiXhosa, Sesotho, Setswana, Sepedi, Xitsonga, Tshivenda, siSwati and isiNdebele where provider quality is adequate. Do not falsely claim language support.

## AquaFlow municipal water workspace

Model the operational chain:

**Water source → treatment → bulk supply → reservoir → distribution zone → meter → customer → billing → collection.**

Create programme, project, intervention, incident, work-order and KPI views that allow municipal users to drill from recovery strategy into execution.

## Non-revenue water

Support configurable monitoring of:

- system input volume;
- billed authorised consumption;
- unbilled authorised consumption;
- apparent losses;
- real losses;
- metering issues;
- leaks;
- illegal connections;
- billing anomalies;
- district or zone performance.

Never fabricate missing operational values. Display **Data unavailable** when source data is absent.

## Leak and burst management

Workflow:

**Detected → Verified → Assigned → Dispatched → Repair in Progress → Repaired → Verified → Closed.**

Capture incident ID, location, municipality, ward, zone, asset, severity, estimated loss, timestamps, assigned team, contractor, photographs, evidence and comments.

## AI prioritisation

Provide explainable advisory prioritisation based on factors such as estimated water loss, asset criticality, population affected, hospitals/schools affected, incident duration, recurrence, repair history, cost and risk.

Show recommendation, reason, evidence, confidence and proposed action. Require human decision-making for material actions.

## Meter intelligence and revenue recovery

Detect and flag zero consumption, abnormal low/high consumption, sudden changes, repeated estimates, long-unread meters, inactive accounts with usage, possible meter failure, possible tampering and other anomalies.

Do not accuse customers of fraud based solely on AI inference.

Track billed revenue, collections, outstanding balances, billing exceptions, recovered accounts, revenue at risk, projected recovery and verified realised recovery. Clearly distinguish forecast, AI estimate and realised value.

## Work orders and assets

Support formal work orders linked to incidents and projects, including description, location, priority, team, contractor, SLA, materials, cost estimate, approvals, status, field updates, evidence, quality verification and close-out.

Maintain asset records for pipes, valves, meters, pumps, reservoirs, treatment facilities, pressure zones, telemetry devices and related infrastructure.

## GIS

Where approved GIS data is available, provide interactive maps for incidents, leaks, bursts, work orders, reservoirs, assets, projects, high-risk zones and abnormal meter clusters. GIS must enhance the application, not become a hard dependency.

## Executive command centre

Provide a concise executive view answering:

- Where are we?
- What is failing?
- What requires intervention?
- Where are we losing water?
- Where are we losing revenue?
- Which projects are late?
- Who owns the problem?
- What should we act on next?

AI executive briefings must be grounded in authorised source records and allow drill-down to evidence.

## Predictive intelligence

Where sufficient historical data exists, progressively support delay risk, SLA breach risk, asset failure risk, recurring burst patterns, abnormal consumption, high-risk zones, cost overrun risk and revenue leakage. Expose confidence/risk bands and contributing factors. Do not deploy predictive claims where data maturity is inadequate.

## Human approval

Require confirmation for sensitive actions such as deleting records, archiving major programmes, approving expenditure, changing permissions, closing critical incidents, mass updates and external communications.

Voice commands must obey exactly the same permissions as UI actions.

## Roles and permissions

Support configurable RBAC for roles such as system administrator, municipal administrator, executive, programme manager, project manager, engineer, field technician, finance user, revenue assurance user, contractor, auditor and read-only oversight user.

Permissions must be granular and enforced server-side.

## Security and POPIA

Implement or preserve TLS, encryption at rest, MFA capability, least privilege, secure sessions, password protection, secret management, input validation, output encoding, parameterised queries, CSRF/XSS protections, secure CORS, rate limiting, file validation, audit logging and security monitoring.

Never hard-code secrets.

Apply POPIA-aligned data minimisation, purpose limitation, lawful processing, retention, access control, breach-response capability and privacy-by-design.

## AI security

Protect against prompt injection, indirect prompt injection, insecure tool invocation, data exfiltration, privilege escalation, malicious document instructions, hallucinated tool parameters and cross-user leakage.

Use:

**LLM → authorised application tool/API → validation → RBAC check → service/database.**

The LLM must never directly manipulate production databases or decide permissions.

## Multi-tenancy

Provide logical tenant isolation between municipalities or organisations at both application and data-access layers. Cross-tenant access must require explicit governed authorisation.

## Accessibility and UX

Target WCAG 2.2 AA where practicable. Ensure keyboard access, visible focus, labels, contrast, screen-reader support, accessible forms and responsive layout.

Use Pyrneo branding consistently. Product name is **AquaFlow AI**. Remove all legacy **GovDelivery AI** references.

## Integration architecture

Use governed adapters for future ERP, billing, GIS, SCADA, telemetry, IoT, document management, finance, identity, SITA and notification integrations.

Support validated ingestion via REST APIs, CSV, XLSX, approved database connectors and telemetry/event feeds. Provide preview, mapping, validation errors, duplicate detection and import history.

## No fake functionality

Do not present unconfigured integrations, predictive models or municipal data feeds as live. Label them accurately as **Demo connector**, **Sandbox**, or **Integration-ready**.

## Priority order

**P0 — Stability:** authentication, data integrity, routes, APIs, responsive layout and security.  
**P1 — Existing Feature Completion:** project CRUD, milestones, work items, comments, recent activity, logs and voice commands.  
**P2 — AquaFlow Core:** municipal programmes, incidents, work orders, interventions, water KPIs and executive dashboard.  
**P3 — Revenue & Intelligence:** meter anomalies, NRW analytics, revenue recovery and explainable recommendations.  
**P4 — Integration:** GIS, telemetry, billing, finance and document systems.  
**P5 — Advanced AI:** predictive analytics, tightly governed agentic workflows and digital-twin capabilities where data maturity supports them.

## Definition of done

A feature is complete only when:

1. UI works.
2. API works.
3. Data persists.
4. Permissions are enforced.
5. Validation works.
6. Errors are handled.
7. Audit history is generated where required.
8. Mobile and tablet behaviour works.
9. Security controls are tested.
10. Relevant automated tests pass.
11. Existing working functionality has not regressed.

## Final validation

Audit every menu, route, button, form, filter, modal, CRUD workflow, authentication path, permission rule, project workflow, municipal-water workflow, voice command, language path, AI tool, recent activity feed, audit log, responsive layout, error state, accessibility requirement and data-isolation boundary.

Fix material defects found during implementation rather than merely listing them when they can reasonably be corrected.

## Delivery output

Document:

- application state;
- architecture;
- database schema and migrations;
- security controls and outstanding risks;
- AI models/providers, tools and guardrails;
- STT/TTS implementation and languages;
- integrations and whether each is live, sandbox, demo or planned;
- test coverage and validation performed;
- deployment requirements;
- known limitations.

Never describe unimplemented or untested functionality as complete.
