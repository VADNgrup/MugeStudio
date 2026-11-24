import type { AIService, Clip, Project, ProjectLog, StorageItem, StoredSound, Track } from "../src/lib/types";

export const initialAIServices: AIService[] = [
  { id: "ace-step-local", name: "ACE-Step 1.5 · Ubuntu", deployment: "local", provider: "ace-step", baseUrl: "http://127.0.0.1:8001", model: "acestep-v15-turbo", enabled: true, isDefault: true, connection: "unknown" },
  { id: "gemini-lyria-cloud", name: "Gemini · Lyria 3.5", deployment: "cloud", provider: "gemini-lyria", baseUrl: "https://generativelanguage.googleapis.com/v1beta/interactions", model: "lyria-3.5", enabled: false, isDefault: false, connection: "unknown" },
];

export const initialTracks: Track[] = [
  { id: "melody", name: "Melody", kind: "instrument", color: "blue", volume: 82, muted: false, solo: false },
  { id: "drums", name: "Drums", kind: "instrument", color: "green", volume: 76, muted: false, solo: false },
  { id: "bass", name: "Bass line", kind: "instrument", color: "purple", volume: 68, muted: false, solo: false },
];

export const initialClips: Clip[] = [
  { id: "c1", name: "Intro melody", trackId: "melody", start: 0, width: 18, color: "blue", duration: "0:08", audioUrl: "/demo-audio/kyoto-piano-sketch.wav", generation: { status: "succeeded", serviceId: "ace-step-local", projectId: "midnight-in-kyoto", audioUrl: "/demo-audio/kyoto-piano-sketch.wav", settings: { prompt: "Soft piano motif for a quiet Kyoto night", instrument: "Piano", mood: "Cinematic", bpm: 82, key: "C minor", durationSeconds: 8, effects: ["Reverb"], negativePrompt: "vocals" }, fileName: "Melody piano v1.wav", metadataFileName: "c1.meta", createdAt: "2026-11-24T08:00:00.000Z", isDemo: true } },
  { id: "c2", name: "Chorus hook", trackId: "melody", start: 20, width: 22, color: "blue", duration: "0:08", audioUrl: "/demo-audio/warm-drum-loop.wav", generation: { status: "succeeded", serviceId: "ace-step-local", projectId: "midnight-in-kyoto", audioUrl: "/demo-audio/warm-drum-loop.wav", settings: { prompt: "A warm restrained drum loop for a lo-fi chorus", instrument: "Drum", mood: "Lo-fi", bpm: 96, key: "C minor", durationSeconds: 8, effects: ["Tape saturation", "Reverb"], negativePrompt: "vocals" }, fileName: "Drum loop · warm.wav", metadataFileName: "c2.meta", createdAt: "2026-11-24T08:02:00.000Z", isDemo: true } },
  { id: "c3", name: "Kick · 01", trackId: "drums", start: 0, width: 10, color: "green", duration: "0:04", audioUrl: "/demo-audio/warm-drum-loop.wav" },
  { id: "c4", name: "Snare · 02", trackId: "drums", start: 10, width: 10, color: "green", duration: "0:04", audioUrl: "/demo-audio/warm-drum-loop.wav" },
  { id: "c5", name: "Kick · 01", trackId: "drums", start: 20, width: 10, color: "green", duration: "0:04", audioUrl: "/demo-audio/warm-drum-loop.wav" },
  { id: "c6", name: "Bass loop", trackId: "bass", start: 0, width: 34, color: "purple", duration: "0:08", audioUrl: "/demo-audio/deep-bass-loop.wav", generation: { status: "succeeded", serviceId: "ace-step-local", projectId: "midnight-in-kyoto", audioUrl: "/demo-audio/deep-bass-loop.wav", settings: { prompt: "A mellow deep bass phrase under a soft pop groove", instrument: "Guitar", mood: "Pop", bpm: 96, key: "C minor", durationSeconds: 8, effects: ["Chorus"], negativePrompt: "vocals" }, fileName: "Bass line · deep.wav", metadataFileName: "c6.meta", createdAt: "2026-11-24T08:04:00.000Z", isDemo: true } },
];

export const initialProjects: Project[] = [
  { id: "midnight-in-kyoto", name: "Midnight in Kyoto", detail: "Demo project · ready to edit", tracks: 3, mood: "Dream pop", color: "project-lilac", icon: "✳", description: "A little late-night magic, one layer at a time.", owner: "Duc Anh", createdAt: "Nov 8, 2026", updatedAt: "Nov 24, 2026", bpm: 96, musicalKey: "C minor", status: "In progress" },
];

export const storedSounds: StoredSound[] = [
  { name: "Drum loop · warm", type: "Drum loop", duration: "0:08", size: "353 KB", color: "green", audioUrl: "/demo-audio/warm-drum-loop.wav" },
  { name: "Melody piano v1", type: "Melody", duration: "0:08", size: "353 KB", color: "blue", audioUrl: "/demo-audio/kyoto-piano-sketch.wav" },
  { name: "Bass line · deep", type: "Bass", duration: "0:08", size: "353 KB", color: "purple", audioUrl: "/demo-audio/deep-bass-loop.wav" },
];

export const initialStorageItems: StorageItem[] = [
  { id: "folder-midnight", name: "Midnight in Kyoto", type: "folder", parentId: null, updatedAt: "Nov 11, 2026", color: "blue" },
  { id: "file-drum-loop", name: "Drum loop · warm.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 352844, updatedAt: "Nov 11, 2026", color: "green", audioUrl: "/demo-audio/warm-drum-loop.wav" },
  { id: "file-melody", name: "Melody piano v1.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 352844, updatedAt: "Nov 10, 2026", color: "blue", audioUrl: "/demo-audio/kyoto-piano-sketch.wav" },
  { id: "file-bass", name: "Bass line · deep.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 352844, updatedAt: "Nov 9, 2026", color: "purple", audioUrl: "/demo-audio/deep-bass-loop.wav" },
];

export const initialLogs: ProjectLog[] = [
  { id: "log-1", projectId: "midnight-in-kyoto", action: "Sound generated", detail: "Created “Chorus hook” from a text prompt", user: "Duc Anh", createdAt: "Today, 2:42 PM", type: "generate" },
  { id: "log-2", projectId: "midnight-in-kyoto", action: "Track updated", detail: "Adjusted Melody track volume to 82%", user: "Duc Anh", createdAt: "Today, 2:30 PM", type: "edit" },
  { id: "log-3", projectId: "midnight-in-kyoto", action: "Sound imported", detail: "Added “Drum loop · warm” to the arrangement", user: "Duc Anh", createdAt: "Today, 1:55 PM", type: "import" },
  { id: "log-4", projectId: "midnight-in-kyoto", action: "Project created", detail: "Started a new project from scratch", user: "Duc Anh", createdAt: "Nov 8, 2026 · 10:14 AM", type: "create" },
];
