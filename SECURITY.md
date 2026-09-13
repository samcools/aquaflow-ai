# AquaFlow AI Security Policy

AquaFlow AI is intended for public-sector and municipal operational use. Security, privacy, auditability and least privilege are mandatory design requirements.

## Core controls

- Never commit passwords, API keys, tokens, certificates, database credentials or other secrets.
- Store secrets in approved environment or secret-management facilities.
- Enforce authentication, RBAC and tenant isolation server-side.
- Validate all user input and all AI tool parameters.
- Use parameterised database access and secure output encoding.
- Protect against CSRF, XSS, injection, IDOR/BOLA, session replay and privilege escalation.
- Maintain tamper-resistant audit trails for sensitive actions.
- Apply POPIA-aligned data minimisation, purpose limitation, access control and retention practices.
- Do not expose confidential municipal, customer or employee information in logs, prompts or client-side code.
- Treat uploaded documents and retrieved content as untrusted input for AI systems.
- AI models must never make authorisation decisions or directly manipulate production data without validated application tools.

## Reporting vulnerabilities

Do not disclose sensitive vulnerabilities in public issues. Use a private, authorised security channel for responsible disclosure.

## Repository hygiene

The `.gitignore` is a baseline only. Developers remain responsible for ensuring sensitive data is never committed. Rotate any secret immediately if accidental exposure occurs.
