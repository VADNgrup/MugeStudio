export type ApiSpec = {
  group: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  status: "Implemented demo" | "Proposed";
  buttons: string[];
  description: string;
  request: string;
  response: string;
};

export const apiCatalog: ApiSpec[] = [
  {
    group: "Projects",
    method: "GET",
    path: "/api/projects",
    title: "List projects",
    status: "Implemented demo",
    buttons: ["Dashboard: project cards", "Workspace: project list"],
    description: "Returns all seeded projects.",
    request: "// No body or query parameters",
    response: `{
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
}`,
  },
  {
    group: "Projects",
    method: "GET",
    path: "/api/projects/{projectId}",
    title: "Get project details",
    status: "Implemented demo",
    buttons: ["Open a project", "Project metadata tab"],
    description: "Returns one project. The projectId is a path parameter.",
    request: `// Example: GET /api/projects/midnight-in-kyoto`,
    response: `{
  "data": {
    "id": "midnight-in-kyoto",
    "name": "Midnight in Kyoto",
    "description": "A late-night piano idea",
    "bpm": 96,
    "musicalKey": "C major",
    "status": "In progress"
  }
}`,
  },
  {
    group: "Projects",
    method: "POST",
    path: "/api/projects",
    title: "Create project",
    status: "Proposed",
    buttons: ["New project", "Create project"],
    description: "Create a project with its basic metadata.",
    request: `{
  "name": "Midnight in Kyoto",
  "description": "A late-night piano idea",
  "bpm": 96,
  "musicalKey": "C major"
}`,
    response: `{
  "data": {
    "id": "midnight-in-kyoto",
    "name": "Midnight in Kyoto",
    "tracks": 0,
    "bpm": 96,
    "musicalKey": "C major",
    "status": "Draft"
  }
}`,
  },
  {
    group: "Projects",
    method: "PATCH",
    path: "/api/projects/{projectId}",
    title: "Update project metadata",
    status: "Proposed",
    buttons: ["Metadata: Save changes"],
    description: "Update only the metadata fields supplied in the request.",
    request: `{
  "name": "Midnight in Kyoto (demo)",
  "description": "A late-night piano idea",
  "bpm": 102,
  "musicalKey": "D minor"
}`,
    response: `{
  "data": {
    "id": "midnight-in-kyoto",
    "name": "Midnight in Kyoto (demo)",
    "bpm": 102,
    "musicalKey": "D minor",
    "updatedAt": "2026-11-11T09:00:00.000Z"
  }
}`,
  },
  {
    group: "Generation",
    method: "POST",
    path: "/api/projects/{projectId}/generations",
    title: "Generate sound clip",
    status: "Proposed",
    buttons: ["Generate sound", "Generate from prompt/reference/humming"],
    description: "Starts an AI generation. Reference audio can be sent as multipart/form-data; prompt mode uses JSON.",
    request: `{
  "mode": "prompt",
  "prompt": "Dreamy piano with warm tape texture",
  "instrument": "Piano",
  "mood": "Dreamy",
  "durationSeconds": 8
}`,
    response: `{
  "data": {
    "generationId": "gen_01J...",
    "status": "queued",
    "projectId": "midnight-in-kyoto",
    "pollUrl": "/api/generations/gen_01J..."
  }
}`,
  },
  {
    group: "Generation",
    method: "GET",
    path: "/api/generations/{generationId}",
    title: "Check generation status",
    status: "Proposed",
    buttons: ["Generation progress/result"],
    description: "Poll this endpoint until the job is completed or failed.",
    request: `// Example: GET /api/generations/gen_01J...`,
    response: `{
  "data": {
    "generationId": "gen_01J...",
    "status": "completed",
    "clip": {
      "id": "clip_123",
      "name": "Dreamy piano",
      "audioUrl": "/api/storage/files/file_123/content",
      "durationSeconds": 8
    }
  }
}`,
  },
  {
    group: "Editor",
    method: "POST",
    path: "/api/projects/{projectId}/clips",
    title: "Import or add clip",
    status: "Proposed",
    buttons: ["Import sound", "Add selected project sounds", "Upload audio"],
    description: "Add an existing storage file to the project arrangement. For an uploaded file, upload it to storage first.",
    request: `{
  "fileId": "file_123",
  "trackId": "track_1",
  "startMs": 12000
}`,
    response: `{
  "data": {
    "id": "clip_456",
    "fileId": "file_123",
    "trackId": "track_1",
    "startMs": 12000,
    "durationMs": 8000
  }
}`,
  },
  {
    group: "Editor",
    method: "POST",
    path: "/api/projects/{projectId}/tracks",
    title: "Add track",
    status: "Proposed",
    buttons: ["Editor: Add track"],
    description: "Creates an audio track in the project.",
    request: `{
  "name": "Warm piano",
  "kind": "audio"
}`,
    response: `{
  "data": {
    "id": "track_1",
    "name": "Warm piano",
    "kind": "audio",
    "volume": 100,
    "muted": false,
    "solo": false
  }
}`,
  },
  {
    group: "Editor",
    method: "PATCH",
    path: "/api/projects/{projectId}/clips/{clipId}",
    title: "Move or edit clip",
    status: "Proposed",
    buttons: ["Drag clip", "Adjust clip position/volume/fades"],
    description: "Persist arrangement edits. Times are integer milliseconds; volume is a linear percentage from 0 to 100.",
    request: `{
  "trackId": "track_2",
  "startMs": 16000,
  "volume": 80,
  "fadeInMs": 500,
  "fadeOutMs": 1200
}`,
    response: `{
  "data": {
    "id": "clip_456",
    "trackId": "track_2",
    "startMs": 16000,
    "volume": 80,
    "fadeInMs": 500,
    "fadeOutMs": 1200
  }
}`,
  },
  {
    group: "Editor",
    method: "POST",
    path: "/api/projects/{projectId}/clips/{clipId}/duplicate",
    title: "Duplicate clip",
    status: "Proposed",
    buttons: ["Duplicate selected clip"],
    description: "Creates a copy of the selected clip, optionally at a new position.",
    request: `{
  "startMs": 24000
}`,
    response: `{
  "data": {
    "id": "clip_789",
    "sourceClipId": "clip_456",
    "startMs": 24000
  }
}`,
  },
  {
    group: "Editor",
    method: "DELETE",
    path: "/api/projects/{projectId}/clips/{clipId}",
    title: "Remove clip",
    status: "Proposed",
    buttons: ["Delete selected clip"],
    description: "Removes the clip from the arrangement; the stored audio file is not deleted.",
    request: "// No body",
    response: `{
  "data": {
    "id": "clip_456",
    "deleted": true
  }
}`,
  },
  {
    group: "Editor",
    method: "PATCH",
    path: "/api/projects/{projectId}/tracks/{trackId}",
    title: "Update track",
    status: "Proposed",
    buttons: ["Add track", "Change track volume/mute/solo"],
    description: "Save track settings. Track creation can use POST on /api/projects/{projectId}/tracks.",
    request: `{
  "name": "Warm piano",
  "volume": 75,
  "muted": false,
  "solo": false
}`,
    response: `{
  "data": {
    "id": "track_1",
    "name": "Warm piano",
    "volume": 75,
    "muted": false,
    "solo": false
  }
}`,
  },
  {
    group: "Storage",
    method: "GET",
    path: "/api/storage",
    title: "List storage items",
    status: "Implemented demo",
    buttons: ["Open Storage", "Browse folders"],
    description: "Returns seeded storage folders and files.",
    request: `// Optional future query: ?parentId=folder_123`,
    response: `{
  "data": [
    {
      "id": "folder_123",
      "name": "References",
      "type": "folder",
      "parentId": null,
      "updatedAt": "2026-11-11T08:00:00.000Z"
    }
  ]
}`,
  },
  {
    group: "Storage",
    method: "POST",
    path: "/api/storage/folders",
    title: "Create folder",
    status: "Proposed",
    buttons: ["Storage: New folder"],
    description: "Creates a folder under the supplied parent. Use null for a root folder.",
    request: `{
  "name": "New folder",
  "parentId": null
}`,
    response: `{
  "data": {
    "id": "folder_456",
    "name": "New folder",
    "type": "folder",
    "parentId": null
  }
}`,
  },
  {
    group: "Storage",
    method: "POST",
    path: "/api/storage/files",
    title: "Upload audio file",
    status: "Proposed",
    buttons: ["Storage: Upload file", "Import: Upload audio"],
    description: "Send multipart/form-data with file and optional parentId. Do not JSON/base64 encode large audio files.",
    request: `Content-Type: multipart/form-data
file: <binary audio file>
parentId: folder_123`,
    response: `{
  "data": {
    "id": "file_789",
    "name": "piano.wav",
    "type": "file",
    "format": "wav",
    "size": 2400000,
    "parentId": "folder_123"
  }
}`,
  },
  {
    group: "Storage",
    method: "PATCH",
    path: "/api/storage/items/{itemId}",
    title: "Rename or move item",
    status: "Proposed",
    buttons: ["Storage: Rename item"],
    description: "Rename an item and optionally move it to a different folder.",
    request: `{
  "name": "piano-final.wav",
  "parentId": "folder_456"
}`,
    response: `{
  "data": {
    "id": "file_789",
    "name": "piano-final.wav",
    "parentId": "folder_456"
  }
}`,
  },
  {
    group: "Storage",
    method: "DELETE",
    path: "/api/storage/items/{itemId}",
    title: "Delete item",
    status: "Proposed",
    buttons: ["Storage: Delete item", "Storage: Delete selected"],
    description: "Deletes an item. Deleting a folder also deletes its descendants.",
    request: "// No body",
    response: `{
  "data": {
    "id": "folder_123",
    "deleted": true,
    "deletedItemCount": 4
  }
}`,
  },
  {
    group: "Storage",
    method: "GET",
    path: "/api/storage/items/{itemId}/download",
    title: "Download file or folder",
    status: "Proposed",
    buttons: ["Storage: Download file", "Storage: Download folder"],
    description: "Streams a file (or ZIP for a folder) with Content-Disposition attachment.",
    request: `// No body
// Response: audio bytes or application/zip`,
    response: `HTTP/1.1 200 OK
Content-Type: audio/wav
Content-Disposition: attachment; filename="piano.wav"

<binary file content>`,
  },
  {
    group: "Projects",
    method: "GET",
    path: "/api/projects/{projectId}/logs",
    title: "List project activity",
    status: "Implemented demo",
    buttons: ["Project: Log tab"],
    description: "Returns activity log entries for the selected project.",
    request: `// Example: GET /api/projects/midnight-in-kyoto/logs`,
    response: `{
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
}`,
  },
  {
group: "Editor",
method: "POST",
path: "/api/projects/{projectId}/exports",
title: "Export project mix",
status: "Proposed",
buttons: ["Editor: Export mix"],
description: "Queues a mixdown export and returns a job to poll for its download URL.",
request: `{
  "format": "wav",
  "sampleRate": 44100,
  "bitDepth": 16
}`,
response: `{
  "data": {
"exportId": "export_123",
"status": "queued",
"pollUrl": "/api/exports/export_123"
  }
}`,
  },
];
