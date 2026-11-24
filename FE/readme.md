# MugeStudio frontend

A Next.js prototype for an AI-assisted music creation studio. Routes live under `src/app`, with project data, types, hooks, storage logic, and API clients organized under `src/lib`.

## Pages

- `/dashboard` — recent activity and projects.
- `/workspace` — two tabs: overview and project list.
- `/workspace/[projectId]/metadata` — project details.
- `/workspace/[projectId]/generation` — central per-project clip list with a side settings inspector for the selected clip, plus the bilingual (English/Japanese) generation form. The default project includes three ready-to-play demo clips; each has an immutable ID/filename and editable `.meta` settings. New jobs use demo audio until an AI backend is connected.
- `/workspace/[projectId]/edit` — multi-track editor using the same per-project clips as generation. Play/pause schedules the WAV clips in arrangement time; drag or click the red playhead to seek, and drag sounds from the library onto a track. Includes track renaming, clip trimming, and non-overlapping repositioning.
- `/workspace/[projectId]/logs` — project activity.
- `/storage` — folder and audio-file management, including rename, delete, upload, download, and playback for bundled demo WAV files in `public/demo-audio/`.
- `/ai-services` — configure local/cloud generation endpoints, choose a default, enable/disable services, and check supported `/health` endpoints. Includes ACE-Step local and Gemini Lyria cloud examples.
- `/api-guide` — UI button-to-API mapping with example inputs, outputs, and implementation status.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo data is in `fake-data/seed.ts` and is re-exported through `src/lib/data`; changes are saved in browser local storage. The built-in demo has one project, `Midnight in Kyoto`, with three source-aligned tracks, six arrangement clips, and three generated-clip records. Drum, piano, and bass samples are playable WAV files in `public/demo-audio/`; the editor transport plays the arrangement and generated clips link to their matching sample. Generation itself is simulated and does not call an AI provider. The `/api/projects`, `/api/projects/[projectId]`, `/api/projects/[projectId]/logs`, and `/api/storage` endpoints return seed data. AI service settings are metadata only and do not store API keys. See [API_REFERENCE.md](./API_REFERENCE.md), `/api-guide`, [frontend architecture](../.docs/architecture.md), or [backend plan](../BE/readme.md).
