# AquaFlow AI

**Turning Municipal Water Recovery Plans into Accountable Delivery**

AquaFlow AI is an AI-enabled municipal water recovery and delivery-management platform designed to connect strategy, projects, infrastructure, work items, incidents, expenditure, water losses, revenue recovery, evidence and accountability.

This repository is the canonical source of truth for the SITA Hackathon AquaFlow AI project.

## Current status

The `develop` branch contains the first executable hackathon MVP. It includes:

- authenticated AquaFlow dashboard;
- programme/project views and project creation;
- incident register and explainable incident prioritisation;
- work-order data model and API;
- revenue-recovery classifications;
- recent activity/audit trail;
- deterministic, data-grounded executive assistant;
- browser voice input/output where supported;
- responsive desktop, tablet and mobile UI;
- synthetic hackathon dataset;
- automated domain tests and GitHub Actions CI.

This MVP does **not** claim live SITA, municipal billing, GIS, SCADA, IoT or production LLM integrations. Those are integration-ready/planned capabilities described in the master specification.

## Master specification

The authoritative implementation prompt is:

`docs/prompts/AQUAFLOW-MASTER-PROMPT.md`

Architecture notes are in:

`docs/architecture/ARCHITECTURE.md`

## Local run

Requirements: Node.js 20+.

```bash
cp .env.example .env
npm install
npm test
npm start
```

Open:

`http://localhost:8000`

For local hackathon use, `.env.example` contains a clearly marked demo account. Change the password and session secret before sharing the environment. The server intentionally refuses to start in production with the default demo password or an unsafe session secret.

## Data

`database/seed/demo.json` contains synthetic demonstration data only. On first start it is copied to `data/runtime.json`, which is ignored by Git.

Never commit:

- real municipal datasets;
- personal information;
- API keys or credentials;
- production database files;
- private evidence uploads;
- runtime logs containing sensitive information.

## Development workflow

- `main` — stable/demo-ready baseline
- `develop` — integrated development
- `feature/*` — new capability
- `fix/*` — defect remediation
- `security/*` — security remediation

Non-trivial changes should be reviewed through pull requests with tests and security/privacy impact noted.

## Product principle

**Problem → Decision → Ownership → Action → Evidence → Outcome → Accountability**
