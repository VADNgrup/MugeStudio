export type SoundColor = "blue" | "green" | "purple" | "amber" | "pink";

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
