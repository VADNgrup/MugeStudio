# MugeStudio frontend

A Next.js prototype for an AI-assisted music creation studio. Routes live under `src/app`, with project data, types, hooks, storage logic, and API clients organized under `src/lib`.

## Pages

- `/dashboard` — recent activity and projects.
- `/workspace` — two tabs: overview and project list.
- `/workspace/[projectId]/metadata` — project details.
- `/workspace/[projectId]/generation` — AI sound-generation demo.
- `/workspace/[projectId]/edit` — multi-track song editor.
- `/workspace/[projectId]/logs` — project activity.
- `/storage` — folder and audio-file management, including rename, delete, upload, and download.
- `/api-guide` — UI button-to-API mapping with example inputs, outputs, and implementation status.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo data is in `fake-data/seed.ts` and is re-exported through `src/lib/data`; changes are saved in browser local storage. The `/api/projects`, `/api/projects/[projectId]`, `/api/projects/[projectId]/logs`, and `/api/storage` endpoints return seed data. AI generation and playback are simulated; no backend or AI provider is connected. See [API_REFERENCE.md](./API_REFERENCE.md) or `/api-guide` for current endpoints and proposed request/response contracts.