import type { Clip, Project, ProjectLog, StorageItem, StoredSound, Track } from "../src/lib/types";

export const initialTracks: Track[] = [
  { id: "melody", name: "Melody", kind: "instrument", color: "blue", volume: 82, muted: false, solo: false },
  { id: "drums", name: "Drums", kind: "instrument", color: "green", volume: 76, muted: false, solo: false },
  { id: "bass", name: "Bass line", kind: "instrument", color: "purple", volume: 68, muted: false, solo: false },
  { id: "fx", name: "Atmosphere", kind: "instrument", color: "amber", volume: 54, muted: false, solo: false },
  { id: "vocal", name: "Vocal lead", kind: "audio", color: "pink", volume: 88, muted: false, solo: false },
];

export const initialClips: Clip[] = [
  { id: "c1", name: "Intro melody", trackId: "melody", start: 0, width: 18, color: "blue", duration: "0:08" },
  { id: "c2", name: "Chorus hook", trackId: "melody", start: 20, width: 22, color: "blue", duration: "0:12" },
  { id: "c3", name: "Kick · 01", trackId: "drums", start: 0, width: 10, color: "green", duration: "0:04" },
  { id: "c4", name: "Snare · 02", trackId: "drums", start: 10, width: 10, color: "green", duration: "0:04" },
  { id: "c5", name: "Kick · 01", trackId: "drums", start: 20, width: 10, color: "green", duration: "0:04" },
  { id: "c6", name: "Bass loop", trackId: "bass", start: 0, width: 34, color: "purple", duration: "0:16" },
  { id: "c7", name: "Slow-rise pad", trackId: "fx", start: 29, width: 17, color: "amber", duration: "0:08" },
  { id: "c8", name: "Vocal idea", trackId: "vocal", start: 6, width: 28, color: "pink", duration: "0:14" },
];

export const initialProjects: Project[] = [
  { id: "midnight-in-kyoto", name: "Midnight in Kyoto", detail: "Updated 12 min ago", tracks: 8, mood: "Dream pop", color: "project-lilac", icon: "✳", description: "A little late-night magic, one layer at a time.", owner: "Duc Anh", createdAt: "Nov 8, 2026", updatedAt: "Nov 11, 2026", bpm: 96, musicalKey: "C minor", status: "In progress" },
  { id: "soft-focus", name: "Soft focus", detail: "Updated yesterday", tracks: 5, mood: "Lo-fi", color: "project-peach", icon: "◒", description: "Soft beats and a slower kind of afternoon.", owner: "Duc Anh", createdAt: "Nov 5, 2026", updatedAt: "Nov 10, 2026", bpm: 82, musicalKey: "A minor", status: "Draft" },
  { id: "a-little-closer", name: "A little closer", detail: "Updated 3 days ago", tracks: 12, mood: "Indie folk", color: "project-mint", icon: "⌁", description: "Guitar sketches and a song taking shape.", owner: "Duc Anh", createdAt: "Nov 2, 2026", updatedAt: "Nov 8, 2026", bpm: 108, musicalKey: "G major", status: "Complete" },
];

export const storedSounds: StoredSound[] = [
  { name: "Drum loop · warm", type: "Drum loop", duration: "0:08", size: "1.8 MB", color: "green" },
  { name: "Melody piano v1", type: "Melody", duration: "0:16", size: "3.2 MB", color: "blue" },
  { name: "Bass line · deep", type: "Bass", duration: "0:12", size: "2.6 MB", color: "purple" },
  { name: "Rain on the window", type: "Texture", duration: "0:24", size: "4.1 MB", color: "amber" },
  { name: "Vocal idea 04", type: "Vocal", duration: "0:09", size: "1.4 MB", color: "pink" },
  { name: "Soft keys · take 2", type: "Keys", duration: "0:18", size: "3.6 MB", color: "blue" },
];

export const initialStorageItems: StorageItem[] = [
  { id: "folder-midnight", name: "Midnight in Kyoto", type: "folder", parentId: null, updatedAt: "Nov 11, 2026", color: "blue" },
  { id: "folder-soft-focus", name: "Soft focus", type: "folder", parentId: null, updatedAt: "Nov 10, 2026", color: "purple" },
  { id: "folder-references", name: "References", type: "folder", parentId: null, updatedAt: "Nov 9, 2026", color: "amber" },
  { id: "file-drum-loop", name: "Drum loop · warm.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 1887436, updatedAt: "Nov 11, 2026", color: "green", content: "Demo audio placeholder for Drum loop · warm." },
  { id: "file-melody", name: "Melody piano v1.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 3355443, updatedAt: "Nov 10, 2026", color: "blue", content: "Demo audio placeholder for Melody piano v1." },
  { id: "file-bass", name: "Bass line · deep.wav", type: "file", parentId: "folder-midnight", format: "WAV", size: 2726298, updatedAt: "Nov 9, 2026", color: "purple", content: "Demo audio placeholder for Bass line · deep." },
  { id: "file-rain", name: "Rain on the window.mp3", type: "file", parentId: "folder-references", format: "MP3", size: 4299161, updatedAt: "Nov 8, 2026", color: "amber", content: "Demo audio placeholder for Rain on the window." },
  { id: "file-vocal", name: "Vocal idea 04.wav", type: "file", parentId: "folder-soft-focus", format: "WAV", size: 1468006, updatedAt: "Nov 7, 2026", color: "pink", content: "Demo audio placeholder for Vocal idea 04." },
];

export const initialLogs: ProjectLog[] = [
  { id: "log-1", projectId: "midnight-in-kyoto", action: "Sound generated", detail: "Created “Chorus hook” from a text prompt", user: "Duc Anh", createdAt: "Today, 2:42 PM", type: "generate" },
  { id: "log-2", projectId: "midnight-in-kyoto", action: "Track updated", detail: "Adjusted Melody track volume to 82%", user: "Duc Anh", createdAt: "Today, 2:30 PM", type: "edit" },
  { id: "log-3", projectId: "midnight-in-kyoto", action: "Sound imported", detail: "Added “Drum loop · warm” to the arrangement", user: "Duc Anh", createdAt: "Today, 1:55 PM", type: "import" },
  { id: "log-4", projectId: "midnight-in-kyoto", action: "Project created", detail: "Started a new project from scratch", user: "Duc Anh", createdAt: "Nov 8, 2026 · 10:14 AM", type: "create" },
];
