# AquaFlow Dashboard and Voice UX Rules

This document records the acceptance rules for the hackathon UI layer.

- Preserve the original Project Guardian-style visual language: deep navy header, compact horizontal navigation, KPI cards, white evidence panels, strong blue interaction colour and dense executive information hierarchy.
- AquaFlow branding must remain visible together with Pyrneo branding.
- Ayanda is one global chat/voice agent, not a separate instance per page.
- The same chatbot icon must be used in the header/navigation trigger, command-centre assistant card, global floating launcher and assistant panel.
- There must be one speech-recognition controller and one speech-synthesis controller. TTS must cancel existing playback before speaking to prevent double voice.
- “Hey, Ayanda” is the wake phrase. After a user gesture grants browser microphone access, the wake listener remains available while the application is open.
- The selected South African language locale is applied to speech recognition and speech synthesis. Exact installed locale voices are preferred; when no exact installed voice exists, the browser/OS locale fallback is used and the UI identifies this as the system voice rather than falsely naming an unavailable voice.
- Navigation and cached executive-status commands are handled locally where safe so they execute immediately. Authorised record mutations still go through the governed API, tenant checks, RBAC, validation and audit trail.
- The assistant icon and voice system must not change when the user changes workspace.
