# Ayanda Single Voice Architecture

AquaFlow must expose exactly one global Ayanda voice experience.

- One speech-recognition controller is allowed across the application.
- One audio-output path is allowed: OpenAI neural TTS when configured. Browser text-to-speech is not used as an audible fallback because it can introduce robotic or inconsistent voices.
- The voice picker contains only curated neural voices. South African/African delivery is expressed through TTS instructions and, where an eligible custom African voice ID is supplied, that custom voice is preferred.
- “Hi Ayanda” and “Hey Ayanda” are wake phrases. After sign-in, AquaFlow starts the wake listener automatically. A browser may still require the user to grant microphone permission once; no separate microphone-button click should be required after permission is granted.
- The selected voice is global and must remain unchanged when navigating between pages.
- Existing audio must be cancelled before a new response starts.
- Ayanda answers only the question asked. She does not append unrelated facts, recommendations, or follow-up prompts unless the user requests them.
- Voice questions and typed questions use the same governed assistant query route. Commands use the governed command route with RBAC, tenant isolation, validation and audit logging.
