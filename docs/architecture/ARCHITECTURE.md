# AquaFlow AI — MVP Architecture

## Status

This document describes the first executable hackathon MVP implemented on the `develop` branch. It does not claim live municipal, SITA, billing, GIS, SCADA, IoT or production AI integrations.

## Architecture

```text
Browser
  |
  | HTTPS in deployed environments
  v
Node.js / Express application
  |-- Authentication and signed session token validation
  |-- Server-side permission checks
  |-- Dashboard aggregation
  |-- Project / incident / work-order APIs
  |-- Deterministic demo assistant
  |-- Explainable incident-priority scoring
  |-- Audit activity writer
  |
  +--> Runtime JSON persistence (hackathon only)
  |      seeded from database/seed/demo.json
  |
  +--> Static responsive front end

Future governed adapters:
  ERP | Billing | GIS | SCADA | Telemetry | IoT | Identity | Document store | LLM/STT/TTS
```

## Current implementation

### Front end

The front end is a dependency-light responsive SPA implemented in `frontend/`. It provides:

- secure sign-in flow;
- executive command-centre metrics;
- project delivery view;
- incident register;
- explainable priority scores;
- revenue recovery classification;
- activity/audit feed;
- project creation;
- deterministic assistant queries;
- browser speech recognition when supported;
- one cancellable speech-synthesis pipeline;
- responsive desktop, tablet and mobile layouts.

### Back end

`backend/server.js` exposes authenticated APIs and serves the front end. The MVP includes:

- HMAC-signed session tokens with expiry;
- production startup guard against default credentials;
- server-side permissions;
- request-size limits;
- security headers via Helmet;
- basic in-memory rate limiting;
- input normalisation;
- controlled CRUD surfaces;
- activity auditing;
- correlation IDs on unexpected errors.

The current demo administrator has wildcard permissions only in demo mode. Production should replace demo authentication with an approved identity provider and granular RBAC stored in a durable data store.

### Data

`database/seed/demo.json` contains clearly labelled synthetic hackathon data. At first launch it is copied to `data/runtime.json`. Runtime data is deliberately excluded by `.gitignore`.

This JSON persistence layer is suitable only for the hackathon MVP. A production deployment should use a managed relational database, database migrations, tenant-scoped queries, encrypted backups and tested recovery procedures.

### AI and voice

The current assistant is **deterministic and data-grounded**. It does not require an external LLM and therefore cannot hallucinate arbitrary answers. It supports a defined set of executive questions over authorised application data.

The architecture is LLM-ready, but any future LLM integration must use:

`LLM -> authorised tool/API -> validation -> RBAC/tenant check -> service -> data store -> audit`

The browser voice layer uses the browser's available Web Speech implementation when supported. It attempts to select a requested language/appropriate installed voice, but it does not claim that an Ayanda voice or every South African language is available unless the runtime provider exposes it.

## Security boundaries

1. The client never decides permissions.
2. API mutation routes require authenticated server-side permission checks.
3. Runtime secrets are environment variables and must never be committed.
4. Runtime data is excluded from Git.
5. Demo credentials are blocked in production by startup checks.
6. Synthetic demo data is labelled as synthetic in UI and API responses.
7. Financial values distinguish forecast, AI estimate and verified realised recovery.
8. The assistant is read-oriented in the current MVP; high-impact AI actions require a later governed tool registry and explicit human confirmation.

## Next production increments

1. PostgreSQL and formal migrations.
2. Approved OIDC/SAML identity provider and MFA.
3. Fine-grained RBAC and tenant isolation persistence.
4. Dedicated audit store with tamper-evident controls.
5. Document/evidence storage with malware scanning and object-level authorisation.
6. Governed GIS adapter.
7. Meter/billing ingestion pipeline.
8. Approved STT/TTS provider for validated South African language coverage.
9. Governed LLM tool registry and RAG layer.
10. End-to-end security, accessibility and load testing.
