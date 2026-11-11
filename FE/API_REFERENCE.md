# MugeStudio API reference

This document describes the API contracts used in the demo and the proposed backend contracts for the UI. The interactive version is available at `/api-guide` in the app.

## Status and conventions

- **Implemented demo** endpoints are Next.js route handlers returning seed data from `fake-data/seed.ts`. They are read-only and do not persist changes to a server.
- **Proposed** endpoints are contracts for backend implementation. The corresponding UI actions are currently simulated in the browser and persisted in local storage.
- JSON success responses use `{ "data": ... }`. Errors use `{ "error": "Readable error message" }`.
- `{projectId}`, `{clipId}`, `{trackId}`, `{itemId}`, and `{generationId}` are URL path parameters.
- JSON requests use `Content-Type: application/json`. Audio uploads use `multipart/form-data`.
- Examples below omit authentication and pagination. IDs and timestamps are illustrative.

## UI action to API map

| UI button/action | Method | Endpoint | Status |
|---|---|---|---|
| Dashboard project cards; Workspace project list | GET | `/api/projects` | Implemented demo |
| Open project; project metadata | GET | `/api/projects/{projectId}` | Implemented demo |
| New project; Create project | POST | `/api/projects` | Proposed |
| Metadata: Save changes | PATCH | `/api/projects/{projectId}` | Proposed |
| Sound clip generation (prompt, reference, humming) | POST | `/api/projects/{projectId}/generations` | Proposed |
| Generation progress/result | GET | `/api/generations/{generationId}` | Proposed |
| Import sound; upload audio from import dialog | POST | `/api/projects/{projectId}/clips` | Proposed |
| Drag/move clip; adjust volume/fades | PATCH | `/api/projects/{projectId}/clips/{clipId}` | Proposed |
| Duplicate selected clip | POST | `/api/projects/{projectId}/clips/{clipId}/duplicate` | Proposed |
| Delete selected clip | DELETE | `/api/projects/{projectId}/clips/{clipId}` | Proposed |
| Editor: Add track | POST | `/api/projects/{projectId}/tracks` | Proposed |
| Change track settings | PATCH | `/api/projects/{projectId}/tracks/{trackId}` | Proposed |
| Editor: Export mix | POST | `/api/projects/{projectId}/exports` | Proposed |
| Open Storage; browse folders | GET | `/api/storage` | Implemented demo |
| Storage: New folder | POST | `/api/storage/folders` | Proposed |
| Storage: Upload file | POST | `/api/storage/files` | Proposed |
| Storage: Rename item | PATCH | `/api/storage/items/{itemId}` | Proposed |
| Storage: Delete item(s) | DELETE | `/api/storage/items/{itemId}` | Proposed |
| Storage: Download file/folder | GET | `/api/storage/items/{itemId}/download` | Proposed |
| Project: Log tab | GET | `/api/projects/{projectId}/logs` | Implemented demo |

Navigation buttons (Dashboard, Workspace, Storage, API guide) only change the page; they do not call an API.

## Implemented demo endpoints

### `GET /api/projects`

No request body or query parameters.

```json
{
  "data": [
    {
      "id": "midnight-in-kyoto",
      "name": "Midnight in Kyoto",
      "tracks": 4,
      "bpm": 96,
      "musicalKey": "C major",
      "status": "In progress"
    }
  ]
}
```

### `GET /api/projects/{projectId}`

No request body. Returns `404` if the project does not exist.

```json
{
  "data": {
    "id": "midnight-in-kyoto",
    "name": "Midnight in Kyoto",
    "description": "A late-night piano idea",
    "bpm": 96,
    "musicalKey": "C major",
    "status": "In progress"
  }
}
```

### `GET /api/projects/{projectId}/logs`

No request body. Returns an empty array when there are no logs for the project.

```json
{
  "data": [
    {
      "id": "log_123",
      "projectId": "midnight-in-kyoto",
      "action": "Sound generated",
      "detail": "Created a piano clip",
      "user": "Duc Anh",
      "type": "generate"
    }
  ]
}
```

### `GET /api/storage`

No request body or query parameters in the current demo.

```json
{
  "data": [
    {
      "id": "folder_123",
      "name": "References",
      "type": "folder",
      "parentId": null,
      "updatedAt": "2026-11-11T08:00:00.000Z"
    }
  ]
}
```

## Proposed endpoint request/response schemas

The schemas below are design contracts, not live routes. The `/api-guide` page contains the complete example for each endpoint.

### Projects

- `POST /api/projects` — body: `{ "name": "Midnight in Kyoto", "description": "A late-night piano idea", "bpm": 96, "musicalKey": "C major" }`. Returns `{ "data": { "id": "midnight-in-kyoto", "name": "Midnight in Kyoto", "tracks": 0, "bpm": 96, "musicalKey": "C major", "status": "Draft" } }`.
- `PATCH /api/projects/{projectId}` — send only changed fields, e.g. `{ "name": "Midnight in Kyoto (demo)", "bpm": 102 }`. Returns `{ "data": { "id": "midnight-in-kyoto", "name": "Midnight in Kyoto (demo)", "bpm": 102, "updatedAt": "2026-11-11T09:00:00.000Z" } }`.

### Generation

- `POST /api/projects/{projectId}/generations` — prompt mode JSON body: `{ "mode": "prompt", "prompt": "Dreamy piano with warm tape texture", "instrument": "Piano", "mood": "Dreamy", "durationSeconds": 8 }`. Reference audio should be sent as multipart form data. Returns a job ID and polling URL: `{ "data": { "generationId": "gen_01J...", "status": "queued", "projectId": "midnight-in-kyoto", "pollUrl": "/api/generations/gen_01J..." } }`.
- `GET /api/generations/{generationId}` — no body. Returns `{ "data": { "generationId": "gen_01J...", "status": "completed", "clip": { "id": "clip_123", "name": "Dreamy piano", "audioUrl": "/api/storage/files/file_123/content", "durationSeconds": 8 } } }`.

### Editor

- `POST /api/projects/{projectId}/clips` — body: `{ "fileId": "file_123", "trackId": "track_1", "startMs": 12000 }`. Returns the created clip with `id`, `fileId`, `trackId`, `startMs`, and `durationMs`.
- `PATCH /api/projects/{projectId}/clips/{clipId}` — body: `{ "trackId": "track_2", "startMs": 16000, "volume": 80, "fadeInMs": 500, "fadeOutMs": 1200 }`. Times are milliseconds; volume is 0–100.
- `POST /api/projects/{projectId}/clips/{clipId}/duplicate` — optional body: `{ "startMs": 24000 }`. Returns the new clip ID and source clip ID.
- `DELETE /api/projects/{projectId}/clips/{clipId}` — no body. Removes the arrangement clip but does not delete the underlying audio asset. Returns `{ "data": { "id": "clip_456", "deleted": true } }`.
- `POST /api/projects/{projectId}/tracks` — body: `{ "name": "Warm piano", "kind": "audio" }`. Returns the created track.
- `PATCH /api/projects/{projectId}/tracks/{trackId}` — body: `{ "name": "Warm piano", "volume": 75, "muted": false, "solo": false }`. Returns the updated track.
- `POST /api/projects/{projectId}/exports` — body: `{ "format": "wav", "sampleRate": 44100, "bitDepth": 16 }`. Returns `{ "data": { "exportId": "export_123", "status": "queued", "pollUrl": "/api/exports/export_123" } }`.

### Storage

- `POST /api/storage/folders` — body: `{ "name": "New folder", "parentId": null }`. Returns the created folder.
- `POST /api/storage/files` — multipart form fields `file` (binary audio) and optional `parentId`. Returns file metadata (`id`, `name`, `format`, `size`, `parentId`).
- `PATCH /api/storage/items/{itemId}` — body: `{ "name": "piano-final.wav", "parentId": "folder_456" }`. Returns the updated item.
- `DELETE /api/storage/items/{itemId}` — no body. Deleting a folder also deletes descendants. Returns `{ "data": { "id": "folder_123", "deleted": true, "deletedItemCount": 4 } }`.
- `GET /api/storage/items/{itemId}/download` — no body. Streams a file with `Content-Disposition: attachment`; folder downloads return an `application/zip` archive.

## Error response example

```json
{
  "error": "Project not found"
}
```

Recommended HTTP statuses: `400` invalid input, `401` unauthenticated, `403` forbidden, `404` missing resource, `409` name/duplicate conflict, `413` upload too large, and `500` unexpected server error.
