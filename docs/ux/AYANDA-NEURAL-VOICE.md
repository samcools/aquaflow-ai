# Ayanda Neural Voice

Ayanda is AquaFlow AI's single global voice/chat agent and is presented as a warm, professional South African female persona.

## Voice path

When OpenAI is configured, AquaFlow uses the OpenAI `/v1/audio/speech` API with `gpt-4o-mini-tts` and a user-selectable built-in voice. Coral is the default. Speech instructions request natural South African pronunciation and rhythm, a conversational human cadence and clear professional delivery. Browser speech synthesis is used only as the fallback when OpenAI neural speech is not configured.

## User choice

Users can open **Ayanda > AI & Voice Settings** and choose an OpenAI voice, preview it, select the application language and optionally provide a custom OpenAI voice ID. The selected language remains the locale for speech recognition and is supplied to the neural speech service.

## OpenAI API key handling

Users may enter an OpenAI API key in **AI & Voice Settings**. The key is sent over HTTPS to the AquaFlow server and held only in process memory for the authenticated session. The key is never returned by the API and is not stored in GitHub, browser local storage, the demo JSON store, logs or audit records. A server-configured `OPENAI_API_KEY` remains supported for managed deployments.

## Questions and commands

Grounded questions route through OpenAI when configured and fall back to AquaFlow's deterministic grounded assistant when it is not. Commands and record mutations continue through the governed AquaFlow command router with server-side RBAC, tenant isolation, validation and audit logging; enabling OpenAI never grants additional permissions.

## Branding and UI

The primary visible brand mark is the transparent Pyrneo wordmark. AquaFlow AI remains the product name in text. The separate AquaFlow droplet/icon is not displayed. Risk levels and lifecycle states use distinct colour treatments, and the Recovery Pulse card sizes to its content rather than stretching to match the Ayanda card.