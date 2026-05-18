# One-click deploy

## Fastest path (Windows)

```powershell
cd D:\Py_Projects\Outflo
.\deploy\one-click-deploy.ps1
```

Script will:

1. Generate `SECRET_KEY`, JWT secrets, system owner password  
2. Ask for MongoDB Atlas URI + OpenAI key  
3. Write `deploy/generated/render.env` and `vercel.env`  
4. Optionally run `vercel` / `render` CLI if installed  

Then paste env into [Render](https://render.com) and [Vercel](https://vercel.com).

**Docker not required.**

## Paid AI (no Ollama on cloud)

On Render, set:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_DEFAULT_MODEL=gpt-4o-mini
```

| Provider | Env |
|----------|-----|
| OpenAI | `AI_PROVIDER=openai` + `OPENAI_API_KEY` |
| Azure OpenAI | Same + `OPENAI_BASE_URL=https://RESOURCE.openai.azure.com/openai/deployments/DEPLOYMENT` |
| Anthropic | `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` |
| Groq / Together | `openai` + their OpenAI-compatible base URL |
| Local Ollama | `AI_PROVIDER=ollama` (local dev only) |

See `env.production.template` for all variables.
