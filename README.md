# AquaFlow AI

**Turning Municipal Water Recovery Plans into Accountable Delivery**

AquaFlow AI is an AI-enabled municipal water-recovery and delivery-management platform that connects strategy, projects, incidents, infrastructure, work orders, meters, water losses, expenditure, revenue recovery, evidence, AI assistance and accountability.

This repository is the canonical source of truth for the SITA Hackathon AquaFlow AI project.

## Current product scope

The product now includes an integrated municipal command workspace with:

- secure demo authentication with server-side RBAC;
- tenant-scoped data access and audit history;
- executive command centre;
- programmes, projects, milestones and work items;
- incidents, work orders and operational zones;
- asset register and meter intelligence;
- configurable non-revenue-water calculations;
- contractors, risks, interventions and notifications;
- budgets, expenditure and revenue-recovery tracking;
- explicit separation of forecast, AI estimate and verified realised value;
- human approval decisions;
- secure document/evidence upload and governed download;
- universal permission-filtered search;
- CSV and executive JSON reporting;
- deterministic data-grounded AI briefing;
- governed AI/voice commands for navigation and selected project actions;
- a single cancellable browser TTS pipeline with best-available African voice selection;
- South African language selection where browser/provider support exists;
- responsive desktop, tablet and mobile design;
- synthetic hackathon demonstration data;
- CI validation, domain tests, RBAC tests and tenant-isolation tests.

## Important deployment status

The repository contains a **functional hackathon application** and a **production target architecture**, but does not falsely claim that every external system is live.

The following remain deployment/integration work unless explicitly configured and validated:

- SITA production hosting and identity;
- municipal billing/ERP feeds;
- GIS platform integration;
- SCADA/telemetry/IoT feeds;
- production PostgreSQL deployment;
- dedicated African STT/TTS provider;
- governed production LLM/RAG provider;
- enterprise object storage and malware scanning;
- production SIEM/observability and backup infrastructure.

The application reports those integrations as integration-ready unless a provider is actually configured.

## Master specification

Authoritative implementation specification:

`docs/prompts/AQUAFLOW-MASTER-PROMPT.md`

Architecture notes:

`docs/architecture/ARCHITECTURE.md`

Production PostgreSQL target schema:

`database/schema/production-postgresql.sql`

## Local run

Requirements: **Node.js 22+**.

```bash
cp .env.example .env
npm install
npm test
npm run check
npm start
```

Open:

`http://localhost:8000`

For local hackathon use, configure the demo credentials in `.env`. The application blocks production startup when demo mode/default unsafe configuration remains enabled.

## Data and privacy

`database/seed/demo.json` contains synthetic demonstration data only. On first start it is copied to `data/runtime.json`, which is ignored by Git.

Never commit:

- real municipal datasets;
- personal information;
- API keys or credentials;
- production database files;
- private evidence uploads;
- private keys;
- runtime logs containing sensitive information.

## Development workflow

- `main` — stable/demo-ready baseline
- `develop` — integrated development
- `feature/*` — new capability
- `fix/*` — defect remediation
- `security/*` — security remediation

Non-trivial changes should pass CI and be merged through pull requests with security/privacy impact and known limitations recorded.

## Product principle

**Problem → Decision → Ownership → Action → Evidence → Outcome → Accountability**
