# AquaFlow AI — Complete Master Build, Enhancement & Production-Readiness Prompt

**Repository:** `samcools/aquaflow-ai`  
**Canonical specification path:** `docs/prompts/AQUAFLOW-MASTER-PROMPT.md`  
**Product:** AquaFlow AI  
**Positioning:** **Turning Municipal Water Recovery Plans into Accountable Delivery**  
**Context:** SITA Hackathon / South African Government Digital Service Delivery  
**Brand:** Pyrneo  
**Primary use case:** Municipal water recovery, infrastructure delivery, non-revenue-water reduction, revenue protection, project execution and operational accountability  
**Document role:** Single source of truth for implementation, enhancement, validation and release decisions.

---

## 1. MASTER OPERATING INSTRUCTION

Act as one coordinated, senior multidisciplinary delivery team covering:

- Chief AI Architect;
- Chief Software Architect;
- Chief Data Architect;
- Chief Cloud Architect;
- Chief Information Security Officer;
- Chief Product Officer;
- Senior Full-Stack Engineering;
- Front-End Engineering;
- Back-End Engineering;
- Database Engineering;
- DevSecOps;
- MLOps / LLMOps;
- Conversational AI;
- Speech AI;
- UX/UI and accessibility design;
- project and programme management;
- municipal water operations;
- non-revenue-water management;
- revenue assurance;
- GIS and infrastructure analytics;
- POPIA and public-sector governance;
- quality engineering, automated testing and security assurance.

Your mandate is to **continue, stabilise, secure and extend the existing AquaFlow AI platform**.

Do **not** rebuild working functionality unnecessarily. Before making changes, inspect the current application architecture, routes, components, APIs, database, authentication model, permissions, AI tools, voice pipeline, integrations, logs, tests and deployment configuration.

Follow this implementation sequence:

**Inspect → Preserve → Repair → Extend → Secure → Integrate → Test → Optimise → Document.**

When the current implementation differs from this specification, preserve working behaviour where it is compatible with the product intent, fix material defects, and migrate deliberately rather than destructively.

Never claim that a feature, integration, model, security control, test, deployment or data feed is complete unless it has actually been implemented and validated.

---

## 2. PRODUCT VISION

Build AquaFlow AI as an intelligent municipal water-recovery and delivery-management platform that connects:

**Problem → Decision → Ownership → Action → Evidence → Outcome → Accountability.**

The system must connect strategy and recovery plans to actual execution across:

**Programme → Project → Milestone → Work Item → Incident → Work Order → Intervention → Evidence → KPI → Financial Outcome.**

AquaFlow AI must not become another static reporting dashboard. It must help authorised municipal users determine:

- what must be done;
- who owns each action;
- what is late;
- what is blocked;
- what has been completed;
- what evidence proves completion;
- what money has been approved, committed and spent;
- where water is being lost;
- where revenue is leaking;
- which incidents or assets require intervention;
- which commitments are at risk;
- what changed and who changed it;
- and what should happen next.

The defining executive question is:

> **What is preventing us from restoring water services, reducing losses and recovering revenue?**

The system must answer with evidence-based operational detail showing the problem, affected area, owner, intervention, deadline, risk, financial implication, evidence and recommended next action.

---

## 3. EXISTING WORKING BASELINE — PRESERVE FIRST

Treat the following as the baseline capability to preserve and improve:

- secure login;
- front-end application;
- back-end services;
- protected routes;
- persistent application data;
- project-management dashboard;
- project CRUD;
- milestones;
- work items;
- comments;
- activity history;
- recent activity;
- user and audit logs;
- responsive desktop, tablet and mobile layout;
- integrated text AI assistant;
- integrated voice assistant;
- hands-free page navigation;
- authorised voice-driven actions;
- multilingual South African language interaction;
- human-like African voice output;
- fast AI responses;
- demo data supporting the current platform narrative.

Do not create duplicate dashboards, duplicate assistants, duplicate menus, duplicate voice systems or parallel implementations of existing working features.

---

## 4. PRODUCT IDENTITY AND BRANDING

The product name everywhere must be:

# AquaFlow AI

Positioning line:

**Turning Municipal Water Recovery Plans into Accountable Delivery**

Use Pyrneo branding consistently across the application, demo environment, presentations and generated reports.

Remove all legacy references to:

**GovDelivery AI**

Use the AquaFlow AI logo with a transparent background where appropriate.

The experience should feel:

- premium;
- modern;
- executive;
- trustworthy;
- African;
- government-ready;
- technically credible;
- visually restrained rather than gimmicky.

---

## 5. APPLICATION SHELL AND RESPONSIVE DESIGN

Retain the existing premium dashboard design language and improve it where necessary.

The application must not stretch unattractively to the browser edges. Use a professionally constrained content width with responsive gutters and consistent spacing.

Support:

- large desktop monitors;
- normal desktop screens;
- laptops;
- Mac displays;
- tablets in portrait and landscape;
- smartphones.

Prevent:

- clipped cards;
- horizontal overflow;
- unreadable tables;
- misaligned forms;
- overflowing modal content;
- touch targets that are too small;
- fixed widths that break on tablets or mobile.

Where tables are dense, provide responsive alternatives such as stacked cards, horizontal scrolling with clear affordance, or column-priority views.

---

## 6. SECURE AUTHENTICATION AND SESSION MANAGEMENT

Maintain secure login and fix any authentication defects without unnecessarily replacing a working authentication model.

Implement or preserve:

- secure password handling;
- server-side session validation;
- secure cookies where applicable;
- session expiration;
- logout invalidation;
- MFA capability;
- failed-login controls;
- rate limiting;
- account-state checks;
- secure password reset flows if used;
- protected routes;
- server-side authorisation on every sensitive action.

Do not rely on client-side role checks as security controls.

Never expose authentication tokens, password hashes, reset tokens or secret material in logs or UI responses.

---

## 7. ROLE-BASED ACCESS CONTROL

Implement configurable, granular RBAC.

Potential roles include:

- System Administrator;
- Municipal Administrator;
- Executive;
- Programme Manager;
- Project Manager;
- Engineer;
- Field Technician;
- Finance User;
- Revenue Assurance User;
- Contractor;
- Auditor;
- Read-Only Oversight User.

Permissions must be granular and enforced server-side.

Examples of permissions:

- `programme.read`;
- `programme.create`;
- `programme.update`;
- `programme.archive`;
- `project.manage`;
- `incident.assign`;
- `workorder.close`;
- `finance.read`;
- `finance.approve`;
- `audit.read`;
- `user.manage`;
- `ai.execute_sensitive_action`.

Do not infer permission from a role label alone when a more specific permission model is available.

---

## 8. MULTI-TENANCY AND MUNICIPAL DATA ISOLATION

Design the platform for logical separation between municipalities, organisations or government entities.

Tenant isolation must exist at:

- authentication/session context;
- API/service layer;
- database query layer;
- search layer;
- AI retrieval layer;
- document access layer;
- analytics layer;
- export/reporting layer.

A user from Municipality A must not be able to retrieve Municipality B data unless explicitly authorised through a governed cross-tenant access model.

Never trust municipality, organisation, tenant or user identifiers supplied by the LLM or browser without server-side verification.

---

## 9. CORE PROJECT AND PROGRAMME MANAGEMENT

The existing platform must remain a fully functional project-management environment rather than a static dashboard.

Users with appropriate permissions must be able to:

- create programmes;
- create projects;
- view projects;
- edit projects;
- archive projects;
- restore authorised archived projects;
- create milestones;
- edit milestones;
- create work items;
- edit work items;
- assign work;
- reassign work;
- change ownership;
- set status;
- set priority;
- set start and due dates;
- manage dependencies;
- record blockers;
- add comments;
- maintain notes;
- associate evidence;
- monitor progress;
- search records;
- filter records;
- sort records;
- inspect project history.

All changes must persist and be auditable.

No button may appear operational while performing no action.

---

## 10. PROJECT DATA MODEL

A project should support, where applicable:

- project ID;
- programme;
- municipality;
- department;
- owner;
- sponsor;
- project manager;
- status;
- priority;
- start date;
- target date;
- actual completion date;
- baseline completion date;
- percentage progress;
- objectives;
- deliverables;
- milestones;
- dependencies;
- work items;
- blockers;
- risks;
- decisions;
- comments;
- attachments;
- evidence;
- budget;
- actual expenditure;
- forecast expenditure;
- expected benefit;
- realised benefit;
- audit trail.

---

## 11. DASHBOARD

The main dashboard should surface actionable information such as:

- total programmes;
- active projects;
- projects at risk;
- delayed projects;
- completed projects;
- milestones due;
- overdue work items;
- blocked items;
- critical incidents;
- open work orders;
- recent activity;
- financial performance;
- NRW indicators;
- revenue-recovery indicators;
- contractor performance;
- AI-generated insights;
- approvals requiring attention.

Dashboard cards and visualisations must drill into the underlying records where appropriate.

Avoid decorative metrics that cannot be traced to source data.

---

## 12. RECENT ACTIVITY

The **Recent Activity** area must populate whenever meaningful system activity exists.

Capture activities including:

- programme creation;
- project creation;
- project updates;
- milestone changes;
- work-item updates;
- status changes;
- assignments;
- comments;
- document uploads;
- work-order events;
- incident events;
- approvals;
- AI-assisted actions;
- voice-initiated actions;
- administrative changes;
- relevant authentication events.

Display:

- timestamp;
- user;
- action;
- affected record;
- context;
- link to the record.

Use pagination, cursor loading or progressive loading for long histories.

---

## 13. AUDIT, USER, SECURITY, AI AND SYSTEM LOGS

Maintain distinct but correlated log categories.

### User activity logs
Capture who did what and when.

### Security logs
Capture authentication attempts, permission changes, suspicious behaviour and security-relevant events.

### AI logs
Capture AI request metadata, tool invocation, action result, approvals and relevant model/agent identifiers without unnecessarily storing sensitive prompt content.

### System logs
Capture errors, service events, integration failures, job failures and infrastructure events.

The audit system must support questions such as:

- “Who updated Project X yesterday?”
- “Who changed this milestone?”
- “Who used the service at 14:35?”
- “What changed on this project this week?”
- “Who approved this intervention?”

Audit records for material actions should be tamper-resistant and available only to authorised users.

---

## 14. AI ASSISTANT ARCHITECTURE

Maintain a context-aware AI assistant supporting both text and voice.

The assistant may:

- answer questions about authorised application data;
- retrieve records;
- explain dashboards;
- navigate users to pages;
- create or update authorised records through tools;
- summarise project state;
- surface risks;
- generate executive briefings;
- assist with reporting.

The LLM must **never directly manipulate the production database**.

Use the pattern:

**User → AI → Intent / Reasoning → Authorised Tool or API → Validation → RBAC / Tenant Check → Service Layer → Database → Audit Event → User Confirmation.**

All tool parameters must be validated server-side.

---

## 15. HANDS-FREE APPLICATION CONTROL

Support natural conversational commands such as:

- “Create a new water recovery project.”
- “Open the Johannesburg programme.”
- “Add a milestone for pressure management.”
- “Move this work item to in progress.”
- “Assign the leak investigation to the engineering team.”
- “Add a comment.”
- “Archive this work item.”
- “Show overdue projects.”
- “What projects are at risk?”
- “Who changed this project?”
- “Show activity from Tuesday.”
- “Take me to the finance dashboard.”
- “Open the incident register.”

Simple deterministic commands such as navigation should not require expensive multi-step reasoning where a safe local intent handler is sufficient.

---

## 16. VOICE ARCHITECTURE

Use **one voice output pipeline only**.

The prior duplicate-voice defect must not recur.

Prevent:

- browser TTS and server TTS playing simultaneously;
- duplicate event listeners;
- duplicate synthesis requests;
- replay of stale responses;
- overlapping audio;
- queued old responses playing after a newer response.

Implement explicit cancellation or interruption behaviour where appropriate.

Voice input and voice output should expose visible state:

- listening;
- processing;
- speaking;
- interrupted;
- error.

---

## 17. AFRICAN VOICE EXPERIENCE

Preferred voice identity:

**Ayanda**

Where the chosen provider cannot supply that exact voice, use the best available natural African voice and document the actual provider/voice used.

Voice characteristics:

- human-like;
- professional;
- warm;
- confident;
- natural cadence;
- non-robotic;
- suitable for government and executive use.

Do not falsely claim an unsupported provider voice or language.

---

## 18. SOUTH AFRICAN LANGUAGE SUPPORT

Support conversational interaction, where provider quality is adequate, in:

- English;
- Afrikaans;
- isiZulu;
- isiXhosa;
- Sesotho;
- Setswana;
- Sepedi;
- Xitsonga;
- Tshivenda;
- siSwati;
- isiNdebele.

Implement automatic language detection where reliable.

Maintain context across language switches.

Prioritise:

- correct terminology;
- natural sentence structure;
- pronunciation quality;
- appropriate handling of names and place names;
- fluent responses rather than literal word-for-word translation.

If a selected STT/TTS provider has inadequate quality for a language, provide a transparent fallback rather than pretending native fluency.

---

## 19. AI RESPONSE PERFORMANCE

Reduce unnecessary latency.

Use, where technically appropriate:

- streamed text responses;
- fast speech start;
- intent routing;
- deterministic handling for simple commands;
- caching of safe repeated queries;
- efficient database queries;
- connection pooling;
- parallel retrieval;
- reduced prompt/context size;
- retrieval filtering;
- background processing only for non-blocking server tasks;
- incremental UI rendering.

Do not compromise authorisation, tenant isolation or auditability to gain speed.

---

## 20. MUNICIPAL WATER RECOVERY WORKSPACE

Create a dedicated Municipal Water Recovery workspace.

Model the operational chain:

**Water source → treatment → bulk supply → reservoir → distribution zone → meter → customer → billing → collection.**

The platform should connect recovery strategy to field execution and measurable outcomes.

---

## 21. WATER RECOVERY PROGRAMMES

A recovery programme should support:

- municipality;
- region;
- department;
- programme owner;
- responsible executive;
- programme manager;
- start date;
- target completion date;
- objectives;
- baseline indicators;
- target indicators;
- projects;
- milestones;
- interventions;
- risks;
- contractors;
- expenditure;
- evidence;
- expected benefit;
- realised benefit;
- status;
- audit history.

Users must be able to drill from municipality-level programme performance into projects, milestones, incidents, work orders and evidence.

---

## 22. NON-REVENUE WATER MANAGEMENT

Create a configurable NRW workspace supporting available indicators such as:

- system input volume;
- authorised consumption;
- billed authorised consumption;
- unbilled authorised consumption;
- apparent losses;
- real losses;
- meter inaccuracies;
- data-handling errors;
- unauthorised consumption;
- leak-related losses;
- district/zone performance;
- pressure-management indicators.

Do not invent missing values.

When required source data is unavailable, display:

**Data unavailable**

instead of fabricating or interpolating unsupported operational values.

Allow calculation methodology to be configured because municipal data maturity differs.

---

## 23. LEAK AND BURST MANAGEMENT

Provide an incident lifecycle:

**Detected → Verified → Assigned → Dispatched → Repair in Progress → Repaired → Verified → Closed.**

Capture where available:

- incident ID;
- municipality;
- ward;
- district/zone;
- GPS/location;
- asset;
- incident category;
- severity;
- estimated loss;
- detection time;
- acknowledgement time;
- dispatch time;
- repair start;
- repair completion;
- verification time;
- closure time;
- assigned team;
- contractor;
- photos;
- supporting evidence;
- comments;
- cost estimate;
- actual repair cost.

---

## 24. AI INCIDENT PRIORITISATION

Provide explainable **advisory** prioritisation based on authorised available factors such as:

- estimated water loss;
- asset criticality;
- population affected;
- hospital/school/community infrastructure impact;
- duration;
- recurrence;
- repair history;
- cost;
- service-delivery risk;
- environmental risk;
- downstream operational impact.

For every material AI recommendation, show where possible:

**Recommendation**  
**Reason**  
**Evidence**  
**Confidence / Risk Band**  
**Proposed Action**  
**Human Decision**

AI must remain advisory for consequential operational or financial decisions unless an explicitly approved governance policy authorises greater automation.

---

## 25. METER INTELLIGENCE

Support rules and anomaly detection for patterns such as:

- zero-consumption meters;
- unexpectedly low consumption;
- unexpectedly high consumption;
- sudden consumption changes;
- repeated estimated readings;
- long-unread meters;
- inactive accounts with usage;
- likely meter failure;
- inconsistent meter behaviour;
- possible tampering indicators;
- unusual account behaviour.

Flag cases for investigation.

Do not accuse a customer of fraud based solely on AI inference or statistical anomaly.

---

## 26. REVENUE RECOVERY

Create a Revenue Recovery dashboard connecting operational interventions to financial outcomes where source data exists.

Track where available:

- billed revenue;
- collections;
- outstanding balances;
- billing exceptions;
- meter exceptions;
- accounts reviewed;
- accounts corrected;
- recovered accounts;
- revenue at risk;
- expected recovery;
- AI-estimated recovery;
- verified realised recovery;
- intervention cost;
- benefit-to-cost indicators.

Always distinguish clearly between:

**Forecast**  
**AI Estimate**  
**Verified Realised Value**

Never present projected or estimated recovery as actual realised revenue.

---

## 27. WORK ORDERS

Support formal work orders linked to incidents, projects and interventions.

Work orders should support:

- work-order ID;
- description;
- municipality;
- location;
- asset;
- priority;
- assigned team;
- assigned contractor;
- SLA;
- required materials;
- estimated cost;
- approval state;
- work status;
- field updates;
- completion evidence;
- quality verification;
- close-out;
- audit history.

Users with permission should be able to create and update work orders through voice or text commands.

---

## 28. ASSET REGISTER

Support municipal water assets including:

- pipes;
- valves;
- meters;
- pumps;
- reservoirs;
- treatment facilities;
- pressure zones;
- telemetry devices;
- related infrastructure.

Associate assets with geographic information where available.

Maintain links to:

- incidents;
- work orders;
- maintenance history;
- inspection history;
- project interventions;
- documents;
- telemetry identifiers.

---

## 29. GIS AND MAP VIEW

Where authorised GIS data is available, provide interactive mapping for:

- incidents;
- leaks;
- bursts;
- work orders;
- reservoirs;
- assets;
- projects;
- risk zones;
- abnormal meter clusters;
- recovery interventions.

Support filters such as:

- municipality;
- region;
- ward;
- zone;
- incident type;
- severity;
- status;
- project;
- date range.

GIS must enhance the application but must not be a hard dependency for core project-management operation.

---

## 30. CONTRACTOR MANAGEMENT

Create contractor profiles supporting operational information such as:

- contractor identity;
- contracted work;
- assigned projects;
- SLAs;
- work orders;
- completion status;
- outstanding work;
- supporting documents;
- verification status;
- performance history.

Do not implement opaque automated contractor rankings that could improperly influence public procurement decisions.

If performance scoring is used, expose the underlying factors and source data.

---

## 31. FINANCIAL MANAGEMENT

Allow authorised users to track:

- approved budget;
- committed amount;
- actual expenditure;
- forecast expenditure;
- variance;
- project value;
- work-order value;
- contractor value;
- intervention cost;
- expected benefit;
- verified realised benefit.

Financial information must be permission-controlled and auditable.

Sensitive approval actions require explicit confirmation and must not be executed silently by the AI assistant.

---

## 32. EVIDENCE-BASED DELIVERY

Every material completion or outcome claim should be capable of being linked to evidence.

Evidence may include:

- photograph;
- document;
- invoice;
- engineering report;
- inspection record;
- signed completion record;
- meter reading;
- telemetry event;
- approval;
- timestamp;
- geolocation where lawfully and appropriately collected.

A project, milestone, incident or work order must not become **verified complete** merely because a user sets progress to 100%.

Implement a verification step where appropriate.

---

## 33. EXECUTIVE COMMAND CENTRE

Provide an executive view suitable for authorised:

- Municipal Managers;
- CIOs;
- CFOs;
- Water Executives;
- Infrastructure Executives;
- Programme Sponsors;
- Oversight Officials.

The command centre should quickly answer:

- Where are we?
- What is failing?
- What requires intervention?
- Where are we losing water?
- Where are we losing revenue?
- Which projects are late?
- Which commitments are not being delivered?
- Which incidents are critical?
- Who owns each problem?
- What should we act on next?

---

## 34. AI EXECUTIVE BRIEFING

Generate concise evidence-grounded briefings based strictly on authorised platform data.

Example queries:

- “Give me today's municipal water-recovery briefing.”
- “What needs the Municipal Manager's attention?”
- “Summarise the top five delivery risks.”
- “Which interventions produced measurable improvement?”
- “Show projects more than 30 days behind schedule.”
- “Where is revenue recovery below plan?”

Every generated insight should allow users to inspect supporting records where practical.

Never fabricate missing operational data.

---

## 35. PREDICTIVE INTELLIGENCE

Where sufficient validated historical data exists, progressively support predictive or risk analytics for:

- project delay;
- milestone slippage;
- SLA breach;
- asset failure;
- recurring bursts;
- abnormal consumption;
- high-risk zones;
- cost overruns;
- revenue leakage;
- contractor delivery risk;
- resource constraints.

Expose:

- confidence or risk band;
- contributing factors;
- source period;
- model/version where appropriate;
- limitations.

Do not deploy predictive claims when data maturity is inadequate.

---

## 36. HUMAN-IN-THE-LOOP APPROVAL

Require explicit confirmation for sensitive actions such as:

- deleting records;
- archiving major programmes;
- changing permissions;
- approving expenditure;
- modifying financial values;
- closing critical incidents;
- mass updates;
- bulk archive operations;
- external communications;
- high-impact automated actions.

Voice commands must follow exactly the same approval and authorisation rules as UI actions.

The assistant must never bypass RBAC, tenant boundaries or approval controls.

---

## 37. NOTIFICATIONS

Provide configurable notifications for meaningful events such as:

- overdue milestones;
- SLA breaches;
- high-severity incidents;
- stalled projects;
- approvals required;
- missing evidence;
- assigned work;
- contractor delays;
- budget thresholds;
- security events;
- failed integrations.

Avoid notification overload by allowing severity, channel and frequency controls.

---

## 38. DOCUMENT MANAGEMENT

Allow records to carry supporting documents.

Provide:

- secure upload;
- validation;
- metadata;
- ownership;
- timestamps;
- document type;
- version references;
- permissions;
- preview where practical;
- linking to programmes/projects/incidents/work orders/assets;
- safe download through authorised application endpoints.

Do not expose private storage buckets directly.

---

## 39. UNIVERSAL SEARCH

Implement fast search across authorised:

- programmes;
- projects;
- milestones;
- work items;
- incidents;
- work orders;
- assets;
- contractors;
- documents;
- comments;
- users;
- locations.

Apply tenant and permission filters **before** returning results.

Add semantic search only where it improves retrieval without weakening access control.

---

## 40. AI KNOWLEDGE LAYER / RAG

Use retrieval-augmented generation where appropriate for authorised municipal content such as:

- water recovery plans;
- project documentation;
- policies;
- engineering documents;
- procedures;
- meeting actions;
- regulations;
- internal reports.

Requirements:

- chunk and index securely;
- preserve tenant isolation;
- filter retrieval by permissions;
- expose source references where practical;
- protect against indirect prompt injection;
- never allow document text to override system policy or security rules;
- do not ingest sensitive documents unnecessarily.

---

## 41. DATA INGESTION

Support controlled ingestion through approved mechanisms such as:

- REST APIs;
- CSV;
- XLSX;
- approved database connectors;
- event feeds;
- IoT / telemetry streams where applicable.

Provide:

- import preview;
- field mapping;
- validation errors;
- duplicate detection;
- import status;
- import history;
- source metadata;
- corrective workflow or rollback where feasible.

Never silently accept malformed records.

---

## 42. API-FIRST AND INTEGRATION ARCHITECTURE

Expose governed APIs for interoperability.

Potential integration domains include:

- municipal ERP;
- billing systems;
- GIS;
- SCADA;
- telemetry;
- IoT meters;
- document management;
- finance platforms;
- identity providers;
- SITA environments;
- email/SMS/notification providers.

Use adapters or integration services rather than tightly coupling vendor-specific logic into core business services.

Every integration must clearly identify whether it is:

- **Live**;
- **Sandbox**;
- **Demo connector**;
- **Integration-ready**;
- **Planned**.

---

## 43. SECURITY BASELINE

Security is mandatory.

Implement or preserve, as applicable:

- HTTPS/TLS;
- encryption at rest;
- secure authentication;
- MFA capability;
- RBAC;
- least privilege;
- secure password handling;
- secret management;
- parameterised queries;
- strict input validation;
- output encoding;
- CSRF protection where applicable;
- XSS protection;
- secure CORS configuration;
- API rate limiting;
- secure HTTP headers;
- file upload validation;
- session expiration;
- account lockout/risk controls;
- audit logging;
- security logging;
- dependency scanning;
- vulnerability management;
- secure error handling.

Never hard-code:

- passwords;
- API keys;
- access tokens;
- database credentials;
- private keys;
- sensitive endpoints.

Use environment variables and approved secret stores.

---

## 44. POPIA AND PRIVACY

Design for POPIA-aligned privacy and governance.

Apply:

- data minimisation;
- purpose limitation;
- lawful processing;
- least privilege;
- retention controls;
- access management;
- auditability;
- breach-response capability;
- privacy by design;
- controlled export;
- appropriate redaction.

Do not expose personal information unnecessarily in:

- dashboards;
- AI prompts;
- vector stores;
- logs;
- analytics;
- reports;
- error messages.

---

## 45. AI SECURITY

Protect against:

- prompt injection;
- indirect prompt injection;
- malicious retrieved-document instructions;
- insecure tool invocation;
- privilege escalation;
- cross-user leakage;
- cross-tenant leakage;
- hallucinated identifiers;
- hallucinated tool parameters;
- data exfiltration;
- unsafe external actions.

Use an explicit tool registry.

Every action must be validated server-side.

Never trust an LLM-generated:

- user ID;
- municipality ID;
- tenant ID;
- role;
- permission decision;
- financial approval;
- sensitive action authorisation.

---

## 46. ACCESSIBILITY

Target WCAG 2.2 AA where practicable.

Provide:

- keyboard navigation;
- visible focus states;
- proper labels;
- meaningful headings;
- adequate contrast;
- scalable typography;
- screen-reader compatibility;
- accessible form validation;
- accessible status indicators;
- non-colour-only communication of status.

Voice is an additional interaction mode, not the only accessible method.

---

## 47. USER EXPERIENCE PRINCIPLES

Avoid dense, overwhelming screens.

Use:

- clear hierarchy;
- progressive disclosure;
- meaningful whitespace;
- concise labels;
- contextual actions;
- drill-down navigation;
- responsive cards;
- readable tables;
- consistent status chips;
- breadcrumbs where helpful;
- empty-state guidance;
- visible success/error feedback.

Do not bury important actions in inconsistent menus.

---

## 48. STATUS AND PROCESS FEEDBACK

For processes such as:

- imports;
- AI analysis;
- uploads;
- bulk operations;
- report generation;
- synchronisation;
- long-running calculations,

show clear status states such as:

- queued;
- processing;
- success;
- warning;
- failed;
- retry available.

Never leave users unsure whether an action completed.

---

## 49. ERROR HANDLING

Users must never see:

- raw stack traces;
- database errors;
- internal exception objects;
- `undefined`;
- `[object Object]`;
- secret values;
- internal API payloads.

Provide human-readable errors and remediation guidance where appropriate.

Log technical details securely.

Use correlation IDs for support and troubleshooting where useful.

---

## 50. REPORTING AND EXPORTS

Provide permission-controlled exports where appropriate in formats such as:

- PDF;
- CSV;
- XLSX.

Potential reports include:

- programme status;
- project performance;
- milestone status;
- water-loss trends;
- incident response;
- SLA performance;
- work-order performance;
- contractor delivery;
- revenue recovery;
- financial variance;
- audit activity.

Generated reports must identify:

- reporting period;
- generation time;
- data currency/as-of date;
- source context where relevant.

---

## 51. DEMONSTRATION DATA

Maintain meaningful hackathon demo data.

Use fictional, synthetic or appropriately anonymised records.

Populate enough interconnected data to demonstrate:

**Programme → Project → Milestone → Incident → Work Order → Intervention → Evidence → Verification → Outcome.**

Do not present demo data as real municipal operational data.

Clearly label demonstration/synthetic data where necessary.

---

## 52. HACKATHON DEMONSTRATION STORY

The platform must support a compelling end-to-end demonstration:

1. A municipality has a water-recovery plan, but execution is fragmented.
2. AquaFlow AI converts the plan into accountable programmes, projects, milestones and work.
3. A high-loss zone is identified from available data.
4. The system surfaces relevant incidents, project delays or abnormal consumption patterns.
5. The user asks: **“Ayanda, what is causing the greatest water loss?”**
6. The assistant retrieves authorised supporting evidence.
7. The user says: **“Create a priority intervention and assign it to the water engineering team.”**
8. AquaFlow creates the authorised record through a governed tool.
9. Field teams update the work order.
10. Evidence is uploaded.
11. Completion is verified.
12. Relevant operational and financial indicators update.
13. The executive dashboard demonstrates the connection between decision, execution and result.

The demo should prove that AquaFlow is an execution and accountability platform, not merely a dashboard or chatbot.

---

## 53. PERFORMANCE ENGINEERING

Optimise:

- database indexes;
- query design;
- API payload size;
- caching;
- image delivery;
- lazy loading;
- code splitting;
- pagination;
- connection pooling;
- AI context size;
- retrieval precision;
- speech latency;
- frontend rendering.

Do not solve performance problems by bypassing permission checks, validation or audit events.

---

## 54. OBSERVABILITY

Implement production-oriented observability for:

- application health;
- API latency;
- API errors;
- database performance;
- job failures;
- authentication anomalies;
- AI latency;
- AI tool failures;
- STT latency;
- TTS latency;
- integration failures;
- resource utilisation.

Use structured logs and appropriate metrics.

Do not log secrets or unnecessary personal information.

---

## 55. TESTING STRATEGY

Create or strengthen:

- unit tests;
- API tests;
- integration tests;
- database tests;
- authentication tests;
- authorisation tests;
- tenant-isolation tests;
- AI tool tests;
- voice workflow tests;
- security tests;
- accessibility checks;
- responsive UI tests;
- end-to-end tests.

Critical end-to-end workflows must include at minimum:

### Workflow A
**Login → Dashboard → Project → Update → Audit Trail**

### Workflow B
**Voice → Intent → Authorisation → Action → Confirmation → Audit Event**

### Workflow C
**Incident → Work Order → Assignment → Repair → Evidence → Verification → Closure**

### Workflow D
**Recovery Programme → KPI → Intervention → Outcome → Executive View**

---

## 56. SECURITY TEST CASES

Explicitly test:

- unauthorised API access;
- BOLA/IDOR;
- tenant isolation;
- role escalation;
- privilege escalation;
- prompt injection;
- indirect prompt injection;
- malicious document ingestion;
- malicious file upload;
- XSS;
- SQL/NoSQL injection where applicable;
- session replay;
- expired sessions;
- forged AI tool calls;
- cross-user AI context leakage;
- cross-tenant retrieval leakage;
- insecure direct storage access.

A feature is not complete merely because its happy path works.

---

## 57. CORE DATA MODEL

Design a coherent relational or hybrid data model around entities such as:

- User;
- Organisation;
- Municipality;
- Role;
- Permission;
- Programme;
- Project;
- Milestone;
- WorkItem;
- Comment;
- Activity;
- AuditEvent;
- Incident;
- WorkOrder;
- Asset;
- Meter;
- Zone;
- Contractor;
- Budget;
- Expenditure;
- RevenueRecord;
- Intervention;
- Indicator;
- Document;
- Evidence;
- Notification;
- AIInteraction;
- Approval;
- Risk.

Normalise appropriately while optimising high-volume operational queries.

Use stable collision-resistant identifiers such as UUIDs unless the existing architecture has a justified alternative.

---

## 58. NO FAKE FUNCTIONALITY

Do not create simulated functionality that appears live.

If an external system is not connected, label it accurately as:

- **Demo connector**;
- **Sandbox**;
- **Integration-ready**;
- **Planned**.

Do not claim live connectivity to:

- SITA;
- municipal billing;
- GIS;
- SCADA;
- IoT meters;
- finance systems;
- banking;
- identity providers;
- external government datasets

unless the integration is actually configured and tested.

---

## 59. FUTURE-READY EXTENSIONS

Design the architecture so future releases can support, without pretending these capabilities are already deployed:

### Municipal Digital Twin
Spatial representation of assets, incidents, projects, interventions and operational telemetry.

### IoT Water Intelligence
Smart-meter, pressure-sensor and telemetry ingestion.

### Predictive Maintenance
Asset-failure risk based on historical data and telemetry.

### Computer Vision
Controlled infrastructure inspection support using authorised imagery.

### Governed Agentic Workflow Automation
Multiple specialised agents operating only through authorised tools, policy checks and human approval.

### What-if Planning
Scenario modelling for intervention sequencing and capital allocation.

### Cross-Municipal Benchmarking
Governed, appropriately anonymised comparative performance analytics where lawful and institutionally approved.

---

## 60. IMPLEMENTATION PRIORITIES

### P0 — Stability and Security
Authentication, data integrity, broken routes, API defects, secure sessions, permissions, responsive layout and critical security controls.

### P1 — Existing Feature Completion
Project CRUD, milestones, work items, comments, recent activity, logs, voice commands, AI navigation and responsive behaviour.

### P2 — AquaFlow Core
Recovery programmes, incidents, work orders, interventions, assets, water KPIs and executive command centre.

### P3 — Revenue and Intelligence
Meter anomalies, NRW analytics, revenue recovery and explainable AI recommendations.

### P4 — Integration
GIS, telemetry, billing, finance, identity and document systems.

### P5 — Advanced AI
Predictive analytics, governed agentic workflows, what-if modelling and digital-twin capabilities where data maturity supports them.

---

## 61. GITHUB REPOSITORY AS SOURCE OF TRUTH

The canonical repository is:

`samcools/aquaflow-ai`

The canonical master prompt is:

`docs/prompts/AQUAFLOW-MASTER-PROMPT.md`

All project source-controlled assets should be stored in this repository, including:

- source code;
- configuration templates;
- database schema and migrations;
- tests;
- documentation;
- architecture decisions;
- CI/CD workflows;
- deployment manifests;
- infrastructure-as-code where used;
- non-sensitive demo seed data;
- implementation prompts and specifications.

Never store:

- live secrets;
- API keys;
- passwords;
- production credentials;
- private keys;
- confidential municipal datasets;
- unredacted personal data;
- runtime logs containing sensitive information;
- production database files;
- unrestricted user uploads.

Use `.env.example` for configuration names only and secure environment/secrets management for actual values.

---

## 62. REPOSITORY STRUCTURE

Target a maintainable structure such as:

```text
aquaflow-ai/
├── README.md
├── SECURITY.md
├── .gitignore
├── .env.example
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── api/
│   ├── deployment/
│   ├── hackathon/
│   └── prompts/
│       └── AQUAFLOW-MASTER-PROMPT.md
├── frontend/
│   ├── src/
│   ├── public/
│   └── tests/
├── backend/
│   ├── src/
│   ├── api/
│   ├── services/
│   ├── auth/
│   ├── ai/
│   ├── voice/
│   └── tests/
├── database/
│   ├── migrations/
│   ├── schema/
│   └── seed/
├── integrations/
│   ├── gis/
│   ├── telemetry/
│   ├── billing/
│   └── notifications/
├── infrastructure/
│   ├── docker/
│   ├── deployment/
│   └── terraform/
├── scripts/
├── tests/
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    └── pull_request_template.md
```

Adapt this structure to the actual framework and current implementation rather than forcing unnecessary rewrites.

---

## 63. GIT BRANCHING AND CHANGE CONTROL

Use:

- `main` for stable/demo-ready releases;
- `develop` for integrated development;
- `feature/*` for new capabilities;
- `fix/*` for bug fixes;
- `security/*` for security remediation where useful.

Examples:

- `feature/water-incidents`;
- `feature/revenue-recovery`;
- `feature/ayanda-voice`;
- `feature/gis-map`;
- `fix/duplicate-voice`.

Prefer pull requests for non-trivial changes.

PRs should identify:

- purpose;
- changes;
- security/privacy impact;
- tests performed;
- migration impact;
- screenshots for material UI changes where useful;
- rollback considerations.

Do not merge failing critical tests into `main`.

---

## 64. VERSIONING AND RELEASES

Use semantic or clearly governed release versioning.

For the hackathon, meaningful tags may include:

- `v0.1.0-baseline`;
- `v0.2.0-aquaflow-core`;
- `v0.3.0-voice`;
- `v0.4.0-water-intelligence`;
- `v1.0.0-hackathon-demo`.

Each demo-ready release must have a reproducible commit/tag and documented known limitations.

---

## 65. CI/CD AND QUALITY GATES

Create GitHub Actions or equivalent CI workflows appropriate to the actual stack.

Quality gates should include, where applicable:

- dependency installation;
- linting;
- type checking;
- unit tests;
- integration tests;
- build validation;
- security/dependency scanning;
- secret scanning;
- migration validation;
- frontend build;
- backend test suite.

Do not deploy production automatically from an unreviewed branch unless explicitly governed and approved.

---

## 66. ENVIRONMENT MANAGEMENT

Separate environments where appropriate:

- local development;
- test;
- demo/hackathon;
- staging;
- production.

Use environment-specific configuration without committing secrets.

Document required environment variables in `.env.example`.

Ensure demo configuration cannot accidentally write to production systems.

---

## 67. DEPLOYMENT

Document:

- runtime requirements;
- supported database;
- environment variables;
- build commands;
- migration commands;
- startup commands;
- reverse-proxy requirements where applicable;
- HTTPS requirements;
- backup/restore expectations;
- health checks;
- rollback procedure;
- deployment architecture.

Never claim deployment has been completed unless it has actually been performed and validated.

---

## 68. DEFINITION OF DONE

A feature is complete only when:

1. The UI works where a UI is required.
2. The API/service logic works.
3. Data persists correctly.
4. Tenant boundaries are preserved.
5. Permissions are enforced server-side.
6. Validation works.
7. Errors are handled safely.
8. Audit history is generated where required.
9. Mobile/tablet behaviour works where relevant.
10. Accessibility impact has been considered.
11. Security controls have been tested.
12. Relevant automated tests pass.
13. Documentation is updated.
14. Existing working functionality has not regressed.
15. No unimplemented capability is being represented as complete.

---

## 69. FINAL APPLICATION VALIDATION

Before declaring a release complete, audit:

- every menu item;
- every route;
- every button;
- every form;
- every filter;
- every modal;
- every CRUD workflow;
- authentication;
- session behaviour;
- permissions;
- tenant isolation;
- programme workflows;
- project workflows;
- incident workflows;
- work orders;
- revenue workflows;
- AI assistant;
- AI tool execution;
- voice commands;
- multilingual interaction;
- African voice playback;
- recent activity;
- audit logs;
- responsive desktop layout;
- tablet layout;
- mobile layout;
- accessibility basics;
- loading states;
- error states;
- empty states;
- document access;
- database persistence;
- security controls;
- integration failure handling.

Fix material defects discovered during implementation rather than merely listing them when they can reasonably be corrected.

---

## 70. REQUIRED DELIVERY OUTPUT

For each material release provide documented status for:

### Application
What is implemented and working.

### Architecture
Current architecture and important design decisions.

### Database
Schema, migrations and seed/demo data status.

### Security
Controls implemented, validation performed and outstanding risks.

### AI
Models/providers, tool registry, guardrails, retrieval approach and fallback behaviour.

### Voice
STT/TTS providers, actual voices, supported languages and known quality limitations.

### Integrations
Which integrations are live, sandbox, demo, integration-ready or planned.

### Testing
Automated tests, manual validation and known gaps.

### Deployment
Environment requirements and deployment status.

### Known Limitations
Anything incomplete, simulated, untested or dependent on unavailable data/services.

Never describe an unimplemented or untested capability as complete.

---

## 71. NON-NEGOTIABLE PRODUCT PRINCIPLE

Every major design and engineering decision must reinforce this chain:

**Problem → Decision → Ownership → Action → Evidence → Outcome → Accountability.**

AquaFlow AI must help municipal leaders move from plans and fragmented operational information to measurable delivery.

The final platform should make it possible for an authorised leader to ask:

> **“What is preventing us from restoring water services, reducing water losses and recovering municipal revenue?”**

and receive an evidence-grounded answer showing:

- the problem;
- the affected area;
- the responsible owner;
- the intervention;
- the deadline;
- the current status;
- the operational impact;
- the financial implication;
- the evidence;
- the risk;
- and the recommended next action.

That is the defining capability of **AquaFlow AI**.

---

# AquaFlow AI

**Turning Municipal Water Recovery Plans into Accountable Delivery**
