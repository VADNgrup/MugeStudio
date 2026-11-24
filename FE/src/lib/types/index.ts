export type SoundColor = "blue" | "green" | "purple" | "amber" | "pink";

export type GenerationSettings = {
  prompt: string;
  instrument: string;
  mood: string;
  bpm: number;
  key: string;
  durationSeconds: number;
  effects: string[];
  negativePrompt: string;
};

export type GenerationStatus = "queued" | "running" | "succeeded" | "failed";

export type ClipGeneration = {
  status: GenerationStatus;
  serviceId: string;
  settings: GenerationSettings;
  fileName: string;
  metadataFileName: string;
  projectId?: string;
  audioUrl?: string;
  createdAt: string;
  isDemo: boolean;
};

export type Clip = {
  id: string;
  name: string;
  trackId: string;
  start: number;
  width: number;
  color: SoundColor;
  duration: string;
  volume?: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
  audioUrl?: string;
  generation?: ClipGeneration;
};

export type Track = {
  id: string;
  name: string;
  kind: "instrument" | "audio";
  color: SoundColor;
  volume: number;
  muted: boolean;
  solo: boolean;
};

export type Project = {
  id: string;
  name: string;
  detail: string;
  tracks: number;
  mood: string;
  color: "project-lilac" | "project-peach" | "project-mint";
  icon: string;
  description: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  bpm: number;
  musicalKey: string;
  status: "Draft" | "In progress" | "Complete";
};

export type StoredSound = {
  name: string;
  type: string;
  duration: string;
  size: string;
  color: SoundColor;
  audioUrl?: string;
};

export type StorageItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  format?: string;
  size?: number;
  updatedAt: string;
  color: SoundColor;
  content?: string;
  audioUrl?: string;
  projectId?: string;
  nameLocked?: boolean;
};

export type ProjectLog = {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  user: string;
  createdAt: string;
  type: "create" | "edit" | "generate" | "import" | "export";
};

export type AIService = {
  id: string;
  name: string;
  deployment: "local" | "cloud";
  provider: "ace-step" | "gemini-lyria" | "custom";
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  connection: "unknown" | "online" | "offline";
};
