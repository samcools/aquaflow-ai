# OpenAI API Key Handling

AquaFlow never requires an API key to be committed to source control. Users may configure OpenAI from Ayanda's **AI & Voice Settings** panel.

Keys entered in the application are transmitted over HTTPS to the AquaFlow backend and stored only in process memory against a SHA-256 fingerprint of the authenticated session token. The raw session token is not used as the map key. The OpenAI key is never returned by the settings API, written to browser local storage, included in audit messages, stored in the demo JSON database, or committed to GitHub. Session entries expire after eight hours and disappear on service restart.

A managed deployment may alternatively provide `OPENAI_API_KEY` as a server environment variable. This remains outside source control.

OpenAI access does not bypass AquaFlow authorisation. Questions remain tenant-scoped and grounded on the authorised snapshot. Record-changing commands continue through the governed command router and retain server-side RBAC, validation, tenant isolation, confirmation requirements and audit logging.