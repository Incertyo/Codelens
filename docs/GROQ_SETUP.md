# Local Groq setup

CodeLens supports Groq through its OpenAI-compatible chat adapter. No additional package is needed. The shared generation options select best-effort JSON Schema mode only for the HTTPS api.groq.com endpoint, because the notes schema contains optional fields that Groq strict mode does not accept. Local Zod validation, bounds, source-reference checks and the counted retry remain enforced.

1. Create an API key at https://console.groq.com/keys.
2. Open the project's ignored `.env.local` locally. Never paste its contents or the API key into chat.
3. Replace the existing provider settings with the values below. Replace `LLM_API_KEY` with the Groq key, replacing the previous provider's key. Keep the existing Redis settings.

```dotenv
AI_ENABLED=true
LLM_PROVIDER=openai-compatible
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-20b
LLM_API_KEY=PASTE_YOUR_GROQ_KEY_HERE
AI_DAILY_LIMIT=1000
```

The owner authorized any fast, free-tier model suitable for code analysis after the requested Qwen model's retirement was identified. The selected model is `openai/gpt-oss-20b`, which Groq lists with structured-output support and a free tier. No latency, output-quality or live quota measurement has been performed. Groq's deprecation page lists `qwen/qwen3-32b` as shut down for free/developer accounts on July 17, 2026, with an enterprise exception.

4. Save the file. Restart the local production server from the project directory with `npm run start -- --hostname 127.0.0.1 --port 3001`. Environment overrides set in the terminal take precedence over the file; use a fresh terminal without the old provider overrides.
5. Reload the workspace and request notes or advice explicitly. This sends source to Groq and spends provider quota. No live provider request has been made during this setup work.

The 1,000-call daily setting is CodeLens's application ceiling, not a guarantee of Groq account quota. Minute limits and the fail-closed Redis limiter remain in effect.

References: https://console.groq.com/docs/openai, https://console.groq.com/docs/deprecations, https://console.groq.com/docs/structured-outputs.

Keep `AI_ENABLED=false` while installing a new key. After replacing the key, set `AI_ENABLED=true` and restart the server. Credentials must never be printed, copied to another file or committed. No new environment variable, dependency or route is introduced.

Regression coverage uses the real AI SDK and local HTTP provider/limiter fixtures. It reproduces a strict-schema configuration rejection and verifies valid notes, invalid-schema and out-of-source-reference handling, counted retries and endpoint-specific option selection. Hosted Groq behavior and account quota have not been tested by the agent.
