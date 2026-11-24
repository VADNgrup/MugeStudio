"use client";

import { useEffect } from "react";
import { initialClips, initialProjects, initialTracks, initialStorageItems, initialLogs, storedSounds } from "../data/seed";
import type { Dispatch, SetStateAction } from "react";
import type { Clip, Project, ProjectLog, StorageItem, StoredSound, Track } from "../types";
import { usePersistentState } from "./use-persistent-state";

export function useStudioData(projectId: string) {
  const [projects, setProjects, projectsHydrated] = usePersistentState<Project[]>("muge.projects", initialProjects);
  const [demoProjectCleanup, setDemoProjectCleanup, projectCleanupHydrated] = usePersistentState<boolean>("muge.demoProjectCleanup", false);
  const [tracksByProject, setTracksByProject, tracksHydrated] = usePersistentState<Record<string, Track[]>>("muge.projectTracks", {});
  const [clipsByProject, setClipsByProject, clipsHydrated] = usePersistentState<Record<string, Clip[]>>("muge.projectClips", {});
  const [demoClipSeeds, setDemoClipSeeds, demoSeedsHydrated] = usePersistentState<Record<string, boolean>>("muge.demoClipSeedsV2", {});
  const [sounds, setSounds, soundsHydrated] = usePersistentState<StoredSound[]>("muge.sounds", storedSounds);
  const [demoSoundsCleanup, setDemoSoundsCleanup, soundsCleanupHydrated] = usePersistentState<boolean>("muge.demoSoundsCleanup", false);
  const [storageItems, setStorageItems, storageHydrated] = usePersistentState<StorageItem[]>("muge.storage", initialStorageItems);
  const [demoStorageCleanup, setDemoStorageCleanup, storageCleanupHydrated] = usePersistentState<boolean>("muge.demoStorageCleanup", false);
  const [demoEditorCleanup, setDemoEditorCleanup, editorCleanupHydrated] = usePersistentState<boolean>("muge.demoEditorCleanupV1", false);
  const [logs, setLogs] = usePersistentState<ProjectLog[]>("muge.logs", initialLogs);
  const tracks = tracksByProject[projectId] ?? initialTracks;
  const clips = clipsByProject[projectId] ?? (projectId === initialProjects[0].id ? initialClips : []);
  useEffect(() => {
    if (!projectsHydrated || !projectCleanupHydrated || demoProjectCleanup) return;
    setProjects((current) => current.filter((project) => !["soft-focus", "a-little-closer"].includes(project.id)));
    setDemoProjectCleanup(true);
  }, [projectsHydrated, projectCleanupHydrated, demoProjectCleanup, setProjects, setDemoProjectCleanup]);
  useEffect(() => {
    if (!soundsHydrated || !soundsCleanupHydrated || demoSoundsCleanup) return;
    setSounds((current) => current.filter((sound) => !["Rain on the window", "Vocal idea 04", "Soft keys · take 2"].includes(sound.name)));
    setDemoSoundsCleanup(true);
  }, [soundsHydrated, soundsCleanupHydrated, demoSoundsCleanup, setSounds, setDemoSoundsCleanup]);
  useEffect(() => {
    if (!storageHydrated || !storageCleanupHydrated || demoStorageCleanup) return;
    setStorageItems((current) => {
      const removed = new Set(["folder-soft-focus", "folder-references", "project-storage-soft-focus", "project-storage-a-little-closer", "file-rain", "file-vocal"]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of current) {
          if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) {
            removed.add(item.id);
            changed = true;
          }
        }
      }
      return current.filter((item) => !removed.has(item.id) && !["soft-focus", "a-little-closer"].includes(item.projectId ?? ""));
    });
    setDemoStorageCleanup(true);
  }, [storageHydrated, storageCleanupHydrated, demoStorageCleanup, setStorageItems, setDemoStorageCleanup]);
  useEffect(() => {
    const defaultProjectId = initialProjects[0].id;
    if (!tracksHydrated || !clipsHydrated || !projectsHydrated || !editorCleanupHydrated || demoEditorCleanup || projectId !== defaultProjectId) return;
    const oldSampleClipIds = new Set(["c7", "c8"]);
    const currentProjectClips = clipsByProject[defaultProjectId] ?? initialClips;
    setClipsByProject((current) => ({
      ...current,
      [defaultProjectId]: (current[defaultProjectId] ?? initialClips).filter((clip) => !oldSampleClipIds.has(clip.id)),
    }));
    setTracksByProject((current) => {
      const savedTracks = current[defaultProjectId] ?? initialTracks;
      const removedDemoTrackIds = new Set(["fx", "vocal"]);
      const filteredTracks = savedTracks.filter((track) => !removedDemoTrackIds.has(track.id)
        || currentProjectClips.some((clip) => clip.trackId === track.id && !oldSampleClipIds.has(clip.id)));
      return { ...current, [defaultProjectId]: filteredTracks };
    });
    setProjects((current) => current.map((project) => project.id === defaultProjectId
      ? { ...project, tracks: (tracksByProject[defaultProjectId] ?? initialTracks).filter((track) => !["fx", "vocal"].includes(track.id)
        || currentProjectClips.some((clip) => clip.trackId === track.id && !oldSampleClipIds.has(clip.id))).length }
      : project));
    setDemoEditorCleanup(true);
  }, [tracksHydrated, clipsHydrated, projectsHydrated, editorCleanupHydrated, demoEditorCleanup, projectId, clipsByProject, tracksByProject, setClipsByProject, setTracksByProject, setProjects, setDemoEditorCleanup]);
  useEffect(() => {
    const defaultProjectId = initialProjects[0].id;
    if (!clipsHydrated || !demoSeedsHydrated || projectId !== defaultProjectId || demoClipSeeds[defaultProjectId]) return;
    const examples = initialClips.filter((clip) => clip.generation?.projectId === defaultProjectId);
    if (!examples.length) return;
    setClipsByProject((current) => {
      const existing = current[defaultProjectId] ?? initialClips;
      const exampleById = new Map(examples.map((clip) => [clip.id, clip]));
      const presentIds = new Set(existing.map((clip) => clip.id));
      const migrated = existing.map((clip) => {
        const example = exampleById.get(clip.id);
        if (!example) return clip;
        return {
          ...clip,
          ...(clip.audioUrl ? {} : { audioUrl: example.audioUrl }),
          ...(example.generation && !clip.generation ? { duration: example.duration, generation: example.generation } : {}),
        };
      });
      return { ...current, [defaultProjectId]: [...migrated, ...examples.filter((clip) => !presentIds.has(clip.id))] };
    });
    setDemoClipSeeds((current) => ({ ...current, [defaultProjectId]: true }));
  }, [clipsHydrated, demoSeedsHydrated, demoClipSeeds, projectId, setClipsByProject, setDemoClipSeeds]);
  const setTracks: Dispatch<SetStateAction<Track[]>> = (next) => setTracksByProject((current) => ({
    ...current,
    [projectId]: typeof next === "function" ? next(current[projectId] ?? initialTracks) : next,
  }));
  const setClips: Dispatch<SetStateAction<Clip[]>> = (next) => setClipsByProject((current) => ({
    ...current,
    [projectId]: typeof next === "function" ? next(current[projectId] ?? (projectId === initialProjects[0].id ? initialClips : [])) : next,
  }));

  return { projects, setProjects, tracks, setTracks, clips, setClips, sounds, setSounds, storageItems, setStorageItems, logs, setLogs };
}
