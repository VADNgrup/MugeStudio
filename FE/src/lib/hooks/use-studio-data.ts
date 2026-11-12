"use client";

import { initialClips, initialProjects, initialTracks, initialStorageItems, initialLogs, storedSounds } from "../data/seed";
import type { Dispatch, SetStateAction } from "react";
import type { Clip, Project, ProjectLog, StorageItem, StoredSound, Track } from "../types";
import { usePersistentState } from "./use-persistent-state";

export function useStudioData(projectId: string) {
  const [projects, setProjects] = usePersistentState<Project[]>("muge.projects", initialProjects);
  const [tracksByProject, setTracksByProject] = usePersistentState<Record<string, Track[]>>("muge.projectTracks", {});
  const [clipsByProject, setClipsByProject] = usePersistentState<Record<string, Clip[]>>("muge.projectClips", {});
  const [sounds, setSounds] = usePersistentState<StoredSound[]>("muge.sounds", storedSounds);
  const [storageItems, setStorageItems] = usePersistentState<StorageItem[]>("muge.storage", initialStorageItems);
  const [logs, setLogs] = usePersistentState<ProjectLog[]>("muge.logs", initialLogs);
  const tracks = tracksByProject[projectId] ?? initialTracks;
  const clips = clipsByProject[projectId] ?? initialClips;
  const setTracks: Dispatch<SetStateAction<Track[]>> = (next) => setTracksByProject((current) => ({
    ...current,
    [projectId]: typeof next === "function" ? next(current[projectId] ?? initialTracks) : next,
  }));
  const setClips: Dispatch<SetStateAction<Clip[]>> = (next) => setClipsByProject((current) => ({
    ...current,
    [projectId]: typeof next === "function" ? next(current[projectId] ?? initialClips) : next,
  }));

  return { projects, setProjects, tracks, setTracks, clips, setClips, sounds, setSounds, storageItems, setStorageItems, logs, setLogs };
}
