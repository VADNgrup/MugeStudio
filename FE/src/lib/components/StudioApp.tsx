"use client";

import {
  AudioLines,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Cloud,
  Server,
  Clock3,
  Copy,
  Disc3,
  Download,
  FileAudio,
  FileMusic,
  Folder,
  FolderPlus,
  Gauge,
  Headphones,
  Home,
  Library,
  LayoutGrid,
  Mic2,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Redo2,
  Search,
  Pencil,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Undo2,
  Upload,
  Volume2,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import ApiGuide from "./ApiGuide";
import AIServiceManager from "./AIServiceManager";
import { initialAIServices, initialClips, initialProjects, initialTracks, storedSounds } from "../data/seed";
import { useStudioData } from "../hooks/use-studio-data";
import { usePersistentState } from "../hooks/use-persistent-state";
import { downloadBlob as triggerDownload, formatStorageSize, getItemBytes, getStorageDescendantIds, hasSiblingName, makeFolderArchive } from "../storage/files";
import type { AIService, Clip, GenerationSettings, Project, ProjectLog, StorageItem, StoredSound, Track } from "../types";

type View = "editor" | "generate" | "storage" | "dashboard" | "workspace" | "metadata" | "logs" | "api-guide" | "ai-services";
type GenerateMode = "prompt" | "reference" | "hum";

const waveform = [28, 54, 35, 75, 43, 88, 59, 35, 68, 96, 48, 72, 30, 55, 81, 43, 65, 92, 40, 60, 33, 73, 52, 86, 38, 63, 45, 80, 57, 34, 69, 94, 46, 74, 39, 61];
const colorNames = ["blue", "green", "purple", "amber", "pink"] as const;
const timelineDurationSeconds = 40;
const demoAudioByName: Record<string, string> = {
  "Drum loop · warm": "/demo-audio/warm-drum-loop.wav",
  "Melody piano v1": "/demo-audio/kyoto-piano-sketch.wav",
  "Bass line · deep": "/demo-audio/deep-bass-loop.wav",
};

function soundAudioUrl(sound: StoredSound) {
  return sound.audioUrl ?? demoAudioByName[sound.name];
}

function demoAudioForInstrument(instrument: string) {
  if (instrument === "Drum") return "/demo-audio/warm-drum-loop.wav";
  if (instrument === "Guitar") return "/demo-audio/deep-bass-loop.wav";
  return "/demo-audio/kyoto-piano-sketch.wav";
}

const demoAudioWaveforms: Record<string, number[]> = {
  "/demo-audio/warm-drum-loop.wav": [56, 48, 57, 16, 51, 57, 10, 49, 57, 48, 15, 57, 46, 10, 57, 48, 57, 25, 50, 57, 10, 48, 56, 48, 24, 57, 46, 10, 57, 51, 56, 39, 44, 56, 16, 47],
  "/demo-audio/kyoto-piano-sketch.wav": [26, 27, 25, 28, 18, 28, 28, 22, 27, 27, 27, 27, 22, 26, 27, 27, 28, 18, 28, 28, 27, 28, 18, 27, 27, 25, 26, 18, 27, 27, 24, 28, 19, 28, 28, 22],
  "/demo-audio/deep-bass-loop.wav": [44, 35, 44, 43, 34, 44, 41, 33, 44, 40, 31, 44, 38, 30, 44, 36, 33, 44, 34, 44, 42, 33, 44, 40, 31, 44, 38, 30, 44, 37, 29, 44, 35, 44, 43, 33],
};

function waveformForClip(clip: Clip) {
  const audioUrl = clip.audioUrl ?? clip.generation?.audioUrl;
  return audioUrl ? demoAudioWaveforms[audioUrl] ?? waveform : waveform;
}

function formatClipDuration(seconds: number) {
  const wholeSeconds = Math.floor(seconds).toString().padStart(2, "0");
  return `0:${wholeSeconds}${seconds % 1 ? `.${Math.round((seconds % 1) * 10)}` : ""}`;
}

function parseClipDuration(duration: string) {
  const [clock, fraction] = duration.split(".");
  const [minutes, seconds] = clock.split(":").map(Number);
  return (minutes || 0) * 60 + (seconds || 0) + (fraction ? Number(`0.${fraction}`) : 0);
}

function ensureProjectStorageFolder(items: StorageItem[], projectId: string, projectName: string) {
  const existing = items.find((item) => item.type === "folder" && (item.projectId === projectId || (!item.projectId && item.parentId === null && item.name === projectName)));
  if (existing) return { items, folderId: existing.id };
  const folderId = `project-storage-${projectId}`;
  return { items: [...items, { id: folderId, name: projectName, type: "folder" as const, parentId: null, updatedAt: "Just now", color: "blue" as const, projectId }], folderId };
}

function metadataFileContent(clip: Clip) {
  if (!clip.generation) return "";
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify({
    id: clip.id,
    name: clip.name,
    fileName: clip.generation.fileName,
    metadataFileName: clip.generation.metadataFileName,
    projectId: clip.generation.projectId,
    audioUrl: clip.generation.audioUrl,
    status: clip.generation.status,
    serviceId: clip.generation.serviceId,
    createdAt: clip.generation.createdAt,
    isDemo: clip.generation.isDemo,
    settings: clip.generation.settings,
  }, null, 2))}`;
}

function upsertClipMetadataFile(items: StorageItem[], clip: Clip, projectId: string, projectName: string) {
  if (!clip.generation) return items;
  const { items: withFolder, folderId } = ensureProjectStorageFolder(items, projectId, projectName);
  const metaItem: StorageItem = {
    id: `meta-${clip.id}`, name: clip.generation.metadataFileName, type: "file", parentId: folderId,
    format: "META", size: new TextEncoder().encode(decodeURIComponent(metadataFileContent(clip).split(",").slice(1).join(","))).length,
    updatedAt: "Just now", color: clip.color, content: metadataFileContent(clip), projectId, nameLocked: true,
  };
  return withFolder.some((item) => item.id === metaItem.id) ? withFolder.map((item) => item.id === metaItem.id ? metaItem : item) : [...withFolder, metaItem];
}

function upsertGeneratedAudioFile(items: StorageItem[], clip: Clip, projectId: string, projectName: string) {
  if (!clip.generation || clip.generation.status !== "succeeded") return items;
  const { items: withFolder, folderId } = ensureProjectStorageFolder(items, projectId, projectName);
  const audioItem: StorageItem = {
    id: `audio-${clip.id}`, name: clip.generation.fileName, type: "file", parentId: folderId, format: "WAV",
    size: 352_844, updatedAt: "Just now", color: clip.color, audioUrl: clip.generation.audioUrl ?? demoAudioForInstrument(clip.generation.settings.instrument), projectId, nameLocked: true,
  };
  const existing = withFolder.find((item) => item.id === audioItem.id) ?? withFolder.find((item) => item.type === "file" && item.parentId === folderId && item.name === audioItem.name);
  return existing ? withFolder.map((item) => item.id === existing.id ? { ...audioItem, id: item.id } : item) : [...withFolder, audioItem];
}

function findAvailableClipStart(desired: number, width: number, trackClips: Clip[], excludedId: string, snap: boolean) {
  const maxStart = Math.max(0, 100 - width);
  const step = snap ? 5 : 1;
  const candidates: number[] = [];
  for (let position = 0; position <= maxStart; position += step) candidates.push(position);
  if (!candidates.includes(maxStart)) candidates.push(maxStart);
  candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired));
  return candidates.find((position) => !trackClips.some((clip) => clip.id !== excludedId && position < clip.start + clip.width - 0.05 && position + width > clip.start + 0.05)) ?? null;
}

export default function StudioApp() {
  const router = useRouter();
  const pathname = usePathname();
  const projectId = pathname.split("/")[2] || initialProjects[0].id;
  const { projects: projectList, setProjects: setProjectList, tracks, setTracks, clips, setClips, sounds, setSounds, storageItems, setStorageItems, logs, setLogs } = useStudioData(projectId);
  const [aiServices, setAiServices] = usePersistentState<AIService[]>("muge.aiServices", initialAIServices);
  const [selectedServiceId, setSelectedServiceId] = usePersistentState("muge.selectedAIService", initialAIServices[0].id);
  const currentProject = projectList.find((project) => project.id === projectId) ?? projectList[0] ?? initialProjects[0];
  const tab = pathname.split("/")[3] ?? "metadata";
  const view: View = pathname === "/workspace" ? "workspace"
    : pathname === "/api-guide" ? "api-guide"
    : pathname === "/ai-services" ? "ai-services"
    : pathname.startsWith("/storage") ? "storage"
    : pathname === "/" || pathname === "/dashboard" ? "dashboard"
    : tab === "generation" ? "generate"
    : tab === "edit" ? "editor"
    : tab === "logs" ? "logs" : "metadata";
  const projectName = currentProject.name;
  const activeService = aiServices.find((service) => service.id === selectedServiceId && service.enabled)
    ?? aiServices.find((service) => service.isDefault && service.enabled)
    ?? aiServices.find((service) => service.enabled);
  const setView = (nextView: View) => {
    if (nextView === "dashboard") router.push("/dashboard");
    else if (nextView === "workspace") router.push("/workspace");
    else if (nextView === "storage") router.push("/storage");
    else if (nextView === "api-guide") router.push("/api-guide");
    else if (nextView === "ai-services") router.push("/ai-services");
    else router.push(`/workspace/${currentProject.id}/${nextView === "editor" ? "edit" : nextView === "generate" ? "generation" : nextView}`);
  };
  const [selectedClip, setSelectedClip] = useState("c2");
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(96);
  const [snap, setSnap] = useState(true);
  const [generateMode, setGenerateMode] = useState<GenerateMode>("prompt");
  const [prompt, setPrompt] = useState("");
  const [activeGenerations, setActiveGenerations] = useState(0);
  const generating = activeGenerations > 0;
  const [modal, setModal] = useState<"import" | "project" | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const addLog = (action: string, detail: string, type: ProjectLog["type"]) => {
    setLogs((current) => [{ id: `log-${Date.now()}`, projectId: currentProject.id, action, detail, user: "Duc Anh", createdAt: "Just now", type }, ...current]);
  };
  const selected = clips.find((clip) => clip.id === selectedClip);
  useEffect(() => setBpm(currentProject.bpm), [currentProject.id, currentProject.bpm]);
  useEffect(() => {
    const demoFiles: Record<string, string> = {
      "file-drum-loop": "/demo-audio/warm-drum-loop.wav",
      "file-melody": "/demo-audio/kyoto-piano-sketch.wav",
      "file-bass": "/demo-audio/deep-bass-loop.wav",
    };
    const projectClips = clips.filter((clip) => clip.generation && (!clip.generation.projectId || clip.generation.projectId === currentProject.id));
    const needsAudioMigration = storageItems.some((item) => demoFiles[item.id] && item.audioUrl !== demoFiles[item.id]);
    const needsClipFiles = projectClips.some((clip) => {
      const generation = clip.generation!;
      const audioUrl = generation.audioUrl ?? demoAudioForInstrument(generation.settings.instrument);
      return !storageItems.some((item) => item.id === `meta-${clip.id}`)
        || (generation.status === "succeeded" && !storageItems.some((item) => item.name === generation.fileName && item.audioUrl === audioUrl));
    });
    if (!needsAudioMigration && !needsClipFiles) return;
    setStorageItems((current) => {
      let next = current.map((item) => demoFiles[item.id] ? { ...item, format: "WAV", size: 352844, audioUrl: demoFiles[item.id] } : item);
      for (const clip of projectClips) {
        if (!next.some((item) => item.id === `meta-${clip.id}`)) next = upsertClipMetadataFile(next, clip, currentProject.id, currentProject.name);
        if (clip.generation?.status === "succeeded" && !next.some((item) => item.name === clip.generation?.fileName && item.audioUrl === (clip.generation.audioUrl ?? demoAudioForInstrument(clip.generation.settings.instrument)))) {
          next = upsertGeneratedAudioFile(next, clip, currentProject.id, currentProject.name);
        }
      }
      return next;
    });
  }, [clips, currentProject.id, currentProject.name, storageItems, setStorageItems]);

  function addTrack() {
    const id = `track-${Date.now()}`;
    setTracks((current) => [...current, {
      id, name: `New track ${current.length - 4}`, kind: "audio",
      color: colorNames[current.length % colorNames.length], volume: 80, muted: false, solo: false,
    }]);
    setProjectList((current) => current.map((project) => project.id === currentProject.id ? { ...project, tracks: tracks.length + 1 } : project));
    addLog("Track added", "Added a new audio track to the arrangement", "edit");
    showToast("Track added to your arrangement");
  }

  function duplicateClip() {
    if (!selected) return;
    const start = findAvailableClipStart(selected.start + selected.width + 2, selected.width, clips.filter((clip) => clip.trackId === selected.trackId), selected.id, snap);
    if (start === null) { showToast("No free space on this track / トラックに空きがありません"); return; }
    const { generation: _generation, ...arrangementClip } = selected;
    const duplicate = { ...arrangementClip, id: `clip-${Date.now()}`, name: `${selected.name} copy`, start };
    setClips((current) => [...current, duplicate]);
    setSelectedClip(duplicate.id);
    showToast("Clip duplicated");
  }

  function generateClip(settings: GenerationSettings) {
    if (!activeService) {
      showToast("Add and enable an AI service before generating sound");
      return;
    }
    const clipSettings = { ...settings, durationSeconds: Math.max(1, Math.min(10, settings.durationSeconds)) };
    if (generateMode === "prompt" && clipSettings.prompt.trim().length < 4) {
      showToast("Add a little more detail to your prompt");
      return;
    }
    const id = `clip-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
    let track = tracks.find((candidate) => findAvailableClipStart(0, 17, clips.filter((item) => item.trackId === candidate.id), "", snap) !== null);
    if (!track) {
      track = { id: `track-${Date.now()}`, name: `New audio track ${tracks.length + 1}`, kind: "audio", color: colorNames[tracks.length % colorNames.length], volume: 80, muted: false, solo: false };
      setTracks((current) => [...current, track!]);
      setProjectList((current) => current.map((project) => project.id === currentProject.id ? { ...project, tracks: tracks.length + 1 } : project));
    }
    const start = findAvailableClipStart(0, 17, clips.filter((item) => item.trackId === track.id), "", snap) ?? 0;
    const createdAt = new Date().toISOString();
    const clip: Clip = {
        id,
        name: clipSettings.prompt.trim() ? clipSettings.prompt.trim().slice(0, 32) : `${clipSettings.instrument} idea`,
        trackId: track.id,
        start,
        width: 17,
        color: track.color,
        duration: formatClipDuration(clipSettings.durationSeconds),
        audioUrl: demoAudioForInstrument(clipSettings.instrument),
        generation: { status: "running", serviceId: activeService.id, settings: clipSettings, fileName: `${id}.wav`, metadataFileName: `${id}.meta`, projectId: currentProject.id, audioUrl: demoAudioForInstrument(clipSettings.instrument), createdAt, isDemo: true },
      };
    setActiveGenerations((count) => count + 1);
    setClips((current) => [...current, clip]);
    setStorageItems((current) => upsertClipMetadataFile(current, clip, currentProject.id, currentProject.name));
    addLog("Generation started", `Started “${clip.name}” with ${activeService.name}`, "generate");
    window.setTimeout(() => {
      const completed: Clip = { ...clip, generation: { ...clip.generation!, status: "succeeded" } };
      setClips((current) => current.map((item) => item.id === id ? completed : item));
      setStorageItems((current) => upsertGeneratedAudioFile(upsertClipMetadataFile(current, completed, currentProject.id, currentProject.name), completed, currentProject.id, currentProject.name));
      setSounds((current) => [{ name: clip.name, type: "AI generation (demo)", duration: clip.duration, size: "353 KB", color: clip.color, audioUrl: clip.audioUrl }, ...current]);
      addLog("Sound generated", `Saved “${clip.name}” as ${clip.generation!.fileName} (demo audio)`, "generate");
      setActiveGenerations((count) => Math.max(0, count - 1));
      showToast("Demo clip saved with its metadata");
    }, 1800);
  }

  function updateGeneratedClip(clipId: string, patch: Partial<Clip>) {
    const existing = clips.find((item) => item.id === clipId);
    if (!existing?.generation) return;
    const updated = { ...existing, ...patch, id: existing.id, duration: patch.generation?.settings ? formatClipDuration(patch.generation.settings.durationSeconds) : existing.duration, generation: { ...existing.generation, ...(patch.generation ?? {}), fileName: existing.generation.fileName, metadataFileName: existing.generation.metadataFileName } };
    setClips((current) => current.map((item) => item.id === clipId ? updated : item));
    setStorageItems((current) => upsertClipMetadataFile(current, updated, currentProject.id, currentProject.name));
    addLog("Clip metadata updated", `Updated metadata for ${updated.generation.fileName}`, "edit");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")} aria-label="Go to dashboard">
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.2} /></span>
          <span className="brand-copy"><strong>muge<span>studio</span></strong><small>MAKE MUSIC, YOUR WAY</small></span>
        </button>
        <div className="workspace-switcher">
          <span className="workspace-avatar">M</span><span className="workspace-name"><strong>My workspace</strong><small>Free plan</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav">
          <NavButton icon={<Home size={17} />} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          <NavButton icon={<Clapperboard size={17} />} label="Workspace" active={view === "workspace" || view === "editor" || view === "generate" || view === "metadata" || view === "logs"} onClick={() => setView("workspace")} />
          <NavButton icon={<Library size={17} />} label="Storage" active={view === "storage"} onClick={() => setView("storage")} />
          <NavButton icon={<Server size={17} />} label="AI services" active={view === "ai-services"} onClick={() => setView("ai-services")} />
          <NavButton icon={<BookOpen size={17} />} label="API guide" active={view === "api-guide"} onClick={() => setView("api-guide")} />
        </nav>
        <div className="nav-label project-nav-label">YOUR PROJECTS <button onClick={() => setModal("project")} aria-label="Create project"><Plus size={14} /></button></div>
        <div className="project-shortcuts">
          {projectList.map((project) => <button key={project.id} className="project-shortcut" onClick={() => router.push(`/workspace/${project.id}/metadata`)}>
            <span className={`project-dot ${project.color}`} />{project.name}<MoreHorizontal size={15} />
          </button>)}
        </div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><span className="upgrade-icon"><Sparkles size={16} /></span><strong>Make more music</strong><p>Unlock longer generations and more sounds.</p><button onClick={() => showToast("You're on the list for Studio Pro ✨")}>Explore Studio Pro <ChevronRight size={14} /></button></div>
          <button className="help-link" onClick={() => showToast("Help center is coming soon")}><CircleHelp size={16} /> Help & feedback</button>
          <button className="profile"><span className="profile-avatar">D</span><span><strong>Duc Anh</strong><small>Personal workspace</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>My workspace</span><ChevronRight size={14} /><strong>{view === "dashboard" ? "Dashboard" : view === "storage" ? "Storage" : view === "workspace" ? "Workspace" : view === "api-guide" ? "API guide" : view === "ai-services" ? "AI services" : projectName}</strong>{view !== "dashboard" && view !== "storage" && view !== "workspace" && view !== "api-guide" && view !== "ai-services" && <><ChevronRight size={14} /><span>{view === "generate" ? "Sound clip generation" : view === "editor" ? "Song editation" : view === "logs" ? "Log" : "Metadata"}</span></>}</div>
          <div className="topbar-actions"><button className="icon-button notification-button" aria-label="Notifications" onClick={() => showToast("You’re all caught up")}><Bell size={17} /><i /></button><span className="topbar-divider" /><button className="user-chip" onClick={() => showToast("Account settings")}><span className="profile-avatar small">D</span><ChevronDown size={14} /></button></div>
        </header>

        {view === "workspace" && <WorkspaceOverview projects={projectList} onOpen={(id) => router.push(`/workspace/${id}/metadata`)} onCreate={() => setModal("project")} />}
        {view !== "dashboard" && view !== "storage" && view !== "workspace" && view !== "api-guide" && view !== "ai-services" && <ProjectTabs active={tab} onSelect={(nextTab) => router.push(`/workspace/${currentProject.id}/${nextTab}`)} />}
        {view === "api-guide" && <ApiGuide />}
        {view === "ai-services" && <AIServiceManager services={aiServices} onChange={setAiServices} onDefaultChange={setSelectedServiceId} onToast={showToast} />}
        {view === "metadata" && <MetadataPage project={currentProject} onSave={(patch) => {
          setProjectList((current) => current.map((item) => item.id === currentProject.id ? { ...item, ...patch, updatedAt: "Just now", detail: "Updated just now" } : item));
          addLog("Project metadata updated", `Saved project details for “${currentProject.name}”`, "edit");
          showToast("Project details saved");
        }} />}
        {view === "logs" && <LogsPage logs={logs.filter((log) => log.projectId === currentProject.id)} />}
        {view === "editor" && <EditorView projectName={projectName} tracks={tracks} clips={clips} sounds={sounds} selectedClip={selectedClip} setSelectedClip={setSelectedClip}
          playing={playing} setPlaying={setPlaying} bpm={bpm} setBpm={setBpm} snap={snap} setSnap={setSnap}
          onGenerate={() => setView("generate")} onAddTrack={addTrack} onDuplicate={duplicateClip}
          onDelete={() => { if (!selected) return; setClips((current) => current.filter((clip) => clip.id !== selected.id)); setSelectedClip(""); showToast("Clip removed from arrangement"); }}
          onImport={() => setModal("import")} showToast={showToast}
          updateTrack={(id, patch) => setTracks((current) => current.map((track) => track.id === id ? { ...track, ...patch } : track))}
          updateClip={(id, patch) => setClips((current) => current.map((clip) => clip.id === id ? { ...clip, ...patch } : clip))}
          addClip={(clip) => setClips((current) => [...current, clip])} />}
        {view === "generate" && <GenerateView projectId={currentProject.id} mode={generateMode} setMode={setGenerateMode} prompt={prompt} setPrompt={setPrompt}
          services={aiServices} selectedServiceId={activeService?.id ?? ""} onSelectService={setSelectedServiceId} clips={clips} generating={generating}
          onManageServices={() => setView("ai-services")} onGenerate={generateClip} onUpdateClip={updateGeneratedClip}
          onOpenInEditor={(clip) => { setSelectedClip(clip.id); setView("editor"); }} showToast={showToast} />}
        {view === "storage" && <StorageView items={storageItems} setItems={setStorageItems} showToast={showToast} />}
        {view === "dashboard" && <DashboardView projects={projectList} setView={setView} openProject={(id) => router.push(`/workspace/${id}/metadata`)} onCreate={() => setModal("project")} showToast={showToast} />}
      </section>

      {modal && <Modal type={modal} sounds={sounds} projects={projectList} onClose={() => setModal(null)} onImport={(sound) => {
        const track = tracks[tracks.length - 1] ?? initialTracks[0];
        const librarySound = sounds.find((item) => item.name === sound);
        const duration = librarySound?.duration ?? "0:08";
        const width = 18;
        const start = findAvailableClipStart(4, width, clips.filter((clip) => clip.trackId === track.id), "", true) ?? 0;
        setClips((current) => [...current, { id: `import-${Date.now()}`, name: sound, trackId: track.id, start, width, color: track.color, duration, ...(librarySound && soundAudioUrl(librarySound) ? { audioUrl: soundAudioUrl(librarySound) } : {}) }]);
        addLog("Sound imported", `Added “${sound}” to the arrangement`, "import");
        if (!sounds.some((item) => item.name === sound)) {
          setSounds((current) => [{ name: sound, type: "Imported", duration, size: "353 KB", color: track.color }, ...current]);
        }
        setView("editor"); setModal(null); showToast(`${sound} added to your project`);
      }} onCreate={(name) => {
        const baseId = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `project-${Date.now()}`;
        let id = baseId;
        let suffix = 2;
        while (projectList.some((project) => project.id === id)) id = `${baseId}-${suffix++}`;
        const project: Project = { id, name, detail: "Created just now", tracks: initialTracks.length, mood: "New project", color: "project-lilac", icon: "✳", description: "", owner: "Duc Anh", createdAt: "Just now", updatedAt: "Just now", bpm: 96, musicalKey: "C major", status: "Draft" };
        setProjectList((current) => [project, ...current.filter((item) => item.id !== id)]);
        setLogs((current) => [{ id: `log-${Date.now()}`, projectId: id, action: "Project created", detail: `Started “${name}” from scratch`, user: "Duc Anh", createdAt: "Just now", type: "create" }, ...current]);
        setModal(null);
        router.push(`/workspace/${id}/metadata`);
        showToast(`${name} is ready to make music`);
      }} />}
      {toast && <div className="toast"><span className="toast-check"><Check size={14} /></span>{toast}</div>}
    </main>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-active-dot" />}</button>;
}

function AudioPreviewButton({ src, name, className = "" }: { src: string; name: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => { audioRef.current?.pause(); }, []);
  const togglePlayback = () => {
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(src);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      audioRef.current = audio;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    void audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  return <button type="button" className={className} aria-label={`${playing ? "Pause" : "Play"} ${name}`} title={`${playing ? "Pause" : "Preview"} ${name}`} onClick={togglePlayback}>{playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}</button>;
}

function EditorView({ projectName, tracks, clips, sounds, selectedClip, setSelectedClip, playing, setPlaying, bpm, setBpm, snap, setSnap, onGenerate, onAddTrack, onDuplicate, onDelete, onImport, showToast, updateTrack, updateClip, addClip }: {
  projectName: string; tracks: Track[]; clips: Clip[]; sounds: StoredSound[]; selectedClip: string; setSelectedClip: (id: string) => void; playing: boolean; setPlaying: (value: boolean) => void;
  bpm: number; setBpm: (value: number) => void; snap: boolean; setSnap: (value: boolean) => void; onGenerate: () => void; onAddTrack: () => void;
  onDuplicate: () => void; onDelete: () => void; onImport: () => void; showToast: (message: string) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void; updateClip: (id: string, patch: Partial<Clip>) => void; addClip: (clip: Clip) => void;
}) {
  const selected = clips.find((clip) => clip.id === selectedClip);
  const [playheadPercent, setPlayheadPercent] = useState(0);
  const [timelineGeometry, setTimelineGeometry] = useState({ left: 0, width: 0 });
  const playheadPercentRef = useRef(0);
  const [seekRevision, setSeekRevision] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const clipsRef = useRef(clips);
  const tracksRef = useRef(tracks);
  const resumeAfterSeekRef = useRef(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [trimmingClip, setTrimmingClip] = useState<{ id: string; startX: number; laneWidth: number; initialWidth: number; initialDuration: number } | null>(null);
  const updateClipRef = useRef(updateClip);
  useEffect(() => { updateClipRef.current = updateClip; clipsRef.current = clips; tracksRef.current = tracks; }, [updateClip, clips, tracks]);
  useEffect(() => { playheadPercentRef.current = playheadPercent; }, [playheadPercent]);
  useEffect(() => {
    const scrollElement = timelineScrollRef.current;
    if (!scrollElement) return;
    const updateGeometry = () => {
      const lane = scrollElement.querySelector<HTMLElement>(".track-lane:not(.add-track-lane)");
      if (!lane) return;
      const laneBounds = lane.getBoundingClientRect();
      const scrollBounds = scrollElement.getBoundingClientRect();
      setTimelineGeometry({ left: laneBounds.left - scrollBounds.left + scrollElement.scrollLeft, width: laneBounds.width });
    };
    updateGeometry();
    const observer = new ResizeObserver(updateGeometry);
    observer.observe(scrollElement);
    const lane = scrollElement.querySelector<HTMLElement>(".track-lane:not(.add-track-lane)");
    if (lane) observer.observe(lane);
    return () => observer.disconnect();
  }, [tracks.length, clips.length]);
  const getPercentAtClientX = useCallback((clientX: number) => {
    const lane = timelineScrollRef.current?.querySelector<HTMLElement>(".track-lane:not(.add-track-lane)");
    if (!lane) return 0;
    const bounds = lane.getBoundingClientRect();
    return Math.max(0, Math.min(100, (clientX - bounds.left) / bounds.width * 100));
  }, []);
  useEffect(() => {
    if (!isSeeking) return;
    const updatePosition = (event: PointerEvent) => setPlayheadPercent(getPercentAtClientX(event.clientX));
    const finishSeeking = (event: PointerEvent) => {
      setPlayheadPercent(getPercentAtClientX(event.clientX));
      setIsSeeking(false);
      setSeekRevision((revision) => revision + 1);
      if (resumeAfterSeekRef.current) setPlaying(true);
      resumeAfterSeekRef.current = false;
    };
    window.addEventListener("pointermove", updatePosition);
    window.addEventListener("pointerup", finishSeeking, { once: true });
    window.addEventListener("pointercancel", finishSeeking, { once: true });
    return () => {
      window.removeEventListener("pointermove", updatePosition);
      window.removeEventListener("pointerup", finishSeeking);
      window.removeEventListener("pointercancel", finishSeeking);
    };
  }, [isSeeking, setPlaying, getPercentAtClientX]);
  useEffect(() => {
    if (!playing) {
      sourceNodesRef.current.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
      sourceNodesRef.current = [];
      return;
    }
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    void context.resume();
    let cancelled = false;
    let animationFrame = 0;
    const clipsAtStart = clipsRef.current;
    const tracksAtStart = tracksRef.current;
    const startSeconds = Math.max(0, Math.min(timelineDurationSeconds, (playheadPercentRef.current / 100) * timelineDurationSeconds));
    const activeSoloTracks = new Set(tracksAtStart.filter((track) => track.solo && !track.muted).map((track) => track.id));
    const playableClips = clipsAtStart.filter((clip) => {
      const track = tracksAtStart.find((item) => item.id === clip.trackId);
      return track && !track.muted && (!activeSoloTracks.size || activeSoloTracks.has(track.id)) && (clip.audioUrl || clip.generation?.audioUrl || clip.generation);
    });
    const audioUrls = [...new Set(playableClips.map((clip) => clip.audioUrl ?? clip.generation?.audioUrl ?? (clip.generation ? demoAudioForInstrument(clip.generation.settings.instrument) : "" )).filter(Boolean))];
    const loadBuffer = async (url: string) => {
      const cached = audioBuffersRef.current.get(url);
      if (cached) return cached;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load audio: ${url}`);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      audioBuffersRef.current.set(url, buffer);
      return buffer;
    };
    const scheduleArrangement = async () => {
      try {
        const buffers = new Map<string, AudioBuffer>();
        await Promise.all(audioUrls.map(async (url) => buffers.set(url, await loadBuffer(url))));
        if (cancelled) return;
        if (startSeconds >= timelineDurationSeconds) {
          setPlayheadPercent(0);
          setPlaying(false);
          return;
        }
        sourceNodesRef.current = [];
        const playbackStartTime = context.currentTime + 0.06;
        let lastPlayheadUpdate = 0;
        for (const clip of playableClips) {
          const track = tracksAtStart.find((item) => item.id === clip.trackId);
          if (!track) continue;
          const url = clip.audioUrl ?? clip.generation?.audioUrl ?? (clip.generation ? demoAudioForInstrument(clip.generation.settings.instrument) : "");
          const buffer = buffers.get(url);
          if (!buffer) continue;
          const clipStartSeconds = clip.start / 100 * timelineDurationSeconds;
          const clipDuration = parseClipDuration(clip.duration);
          const offsetSeconds = Math.max(0, startSeconds - clipStartSeconds);
          const remainingSeconds = Math.min(clipDuration - offsetSeconds, buffer.duration - offsetSeconds);
          if (remainingSeconds <= 0 || clipStartSeconds + clipDuration <= startSeconds) continue;
          const source = context.createBufferSource();
          const gain = context.createGain();
          source.buffer = buffer;
          gain.gain.value = Math.max(0, Math.min(1, ((clip.volume ?? 80) / 100) * (track.volume / 100)));
          source.connect(gain);
          gain.connect(context.destination);
          source.start(playbackStartTime + Math.max(0, clipStartSeconds - startSeconds), offsetSeconds, remainingSeconds);
          sourceNodesRef.current.push(source);
        }
        const updatePlayhead = () => {
          if (cancelled) return;
          const elapsed = Math.max(0, context.currentTime - playbackStartTime);
          const currentSeconds = startSeconds + elapsed;
          const now = performance.now();
          if (now - lastPlayheadUpdate >= 80 || currentSeconds >= timelineDurationSeconds) {
            setPlayheadPercent(Math.min(100, currentSeconds / timelineDurationSeconds * 100));
            lastPlayheadUpdate = now;
          }
          if (currentSeconds >= timelineDurationSeconds) {
            setPlayheadPercent(0);
            setPlaying(false);
            return;
          }
          animationFrame = window.requestAnimationFrame(updatePlayhead);
        };
        animationFrame = window.requestAnimationFrame(updatePlayhead);
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to play the project arrangement.", error);
        setPlaying(false);
      }
    };
    void scheduleArrangement();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      sourceNodesRef.current.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
      sourceNodesRef.current = [];
    };
  }, [playing, seekRevision, setPlaying]);
  useEffect(() => () => {
    sourceNodesRef.current.forEach((source) => { try { source.stop(); } catch { /* already stopped */ } });
    void audioContextRef.current?.close();
    setPlaying(false);
  }, [setPlaying]);
  const seekToClientX = (clientX: number) => {
    setPlayheadPercent(getPercentAtClientX(clientX));
    setSeekRevision((revision) => revision + 1);
  };
  const beginPlayheadDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resumeAfterSeekRef.current = playing;
    if (playing) setPlaying(false);
    setPlayheadPercent(getPercentAtClientX(event.clientX));
    setIsSeeking(true);
  };
  const stopArrangement = () => {
    setPlaying(false);
    setPlayheadPercent(0);
    setSeekRevision((revision) => revision + 1);
  };
  const toggleArrangementPlayback = () => {
    if (!playing) {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      void audioContextRef.current.resume();
      if (playheadPercent >= 100) {
        setPlayheadPercent(0);
        setSeekRevision((revision) => revision + 1);
      }
    }
    setPlaying(!playing);
  };
  const addLibrarySoundToTrack = (soundName: string, trackId: string, clientX: number, lane: HTMLElement) => {
    const sound = sounds.find((item) => item.name === soundName);
    const audioUrl = sound && soundAudioUrl(sound);
    const track = tracks.find((item) => item.id === trackId);
    if (!sound || !audioUrl || !track) return;
    const durationSeconds = parseClipDuration(sound.duration) || 8;
    const width = Math.max(3, Math.min(100, durationSeconds / timelineDurationSeconds * 100));
    const bounds = lane.getBoundingClientRect();
    const pointerPercent = Math.max(0, Math.min(100, (clientX - bounds.left) / bounds.width * 100));
    const desiredStart = pointerPercent - width / 2;
    const start = findAvailableClipStart(desiredStart, width, clips.filter((clip) => clip.trackId === trackId), "", snap);
    if (start === null) { showToast("No free position on this track / トラックに空きがありません"); return; }
    const id = `clip-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
    addClip({ id, name: sound.name, trackId, start, width, color: track.color, duration: sound.duration, audioUrl });
    setSelectedClip(id);
    showToast(`Added ${sound.name} to ${track.name} / ${track.name} に追加しました`);
  };
  useEffect(() => {
    if (!trimmingClip) return;
    const move = (event: PointerEvent) => {
      const delta = ((event.clientX - trimmingClip.startX) / trimmingClip.laneWidth) * 100;
      const width = Math.max(3, Math.min(trimmingClip.initialWidth, Math.round((trimmingClip.initialWidth + delta) * 10) / 10));
      updateClipRef.current(trimmingClip.id, { width, duration: formatClipDuration(trimmingClip.initialDuration * width / trimmingClip.initialWidth) });
    };
    const finish = () => setTrimmingClip(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", finish, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [trimmingClip]);
  const moveSelectedClip = (desiredStart: number) => {
    if (!selected) return;
    const start = findAvailableClipStart(desiredStart, selected.width, clips.filter((clip) => clip.trackId === selected.trackId), selected.id, snap);
    if (start === null) { showToast("No free position on this track / トラックに空きがありません"); return; }
    updateClip(selected.id, { start });
  };
  const trimSelectedClip = (desiredDuration: number) => {
    if (!selected) return;
    const currentDuration = parseClipDuration(selected.duration);
    const minimumDuration = currentDuration * 3 / selected.width;
    const duration = Math.max(minimumDuration, Math.min(currentDuration, Number(desiredDuration) || minimumDuration));
    const width = selected.width * duration / currentDuration;
    updateClip(selected.id, { width, duration: formatClipDuration(duration) });
  };
  const playheadX = timelineGeometry.left + timelineGeometry.width * playheadPercent / 100;
  return <div className="page-content studio-page">
    <div className="page-heading studio-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR STUDIO <span className="heading-slash">/</span> PROJECT 01</div><h1>{projectName} <button className="title-more" onClick={() => showToast("Project options")}><ChevronDown size={18} /></button></h1><p>A little late-night magic, one layer at a time.</p></div>
      <div className="heading-actions"><button className="button button-quiet" onClick={onImport}><Folder size={16} /> Import sound</button><button className="button button-dark" onClick={() => showToast("Mixdown is ready to export")}><Upload size={15} /> Export mix</button></div>
    </div>
        <div className="studio-status-line"><span className="saved-status"><Check size={13} /> All changes saved</span></div>
    <div className="transport-bar">
      <div className="transport-left"><button className="transport-icon" aria-label="Go to start" title="Go to start / 最初に戻る" onClick={() => { setPlayheadPercent(0); setSeekRevision((revision) => revision + 1); }}><ChevronLeft size={17} /></button><button className="play-button" aria-label={playing ? "Pause arrangement / アレンジを一時停止" : "Play arrangement / アレンジを再生"} title="Play or pause arrangement / アレンジ再生・一時停止" onClick={toggleArrangementPlayback}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button><button className="stop-button" aria-label="Stop" title="Stop / 停止" onClick={stopArrangement}><Square size={12} fill="currentColor" /></button><span className="timecode">{`0:${((playheadPercent / 100) * timelineDurationSeconds).toFixed(2).padStart(5, "0")}`}</span><span className="transport-divider" /><span className="bpm-control"><span>BPM</span><button onClick={() => setBpm(Math.max(40, bpm - 1))}>−</button><strong>{bpm}</strong><button onClick={() => setBpm(Math.min(240, bpm + 1))}>+</button></span><span className="key-signature">C <span>Minor</span></span></div>
      <div className="transport-right"><button className={`snap-button ${snap ? "on" : ""}`} onClick={() => setSnap(!snap)}><span className="snap-icon">⌗</span> Snap {snap ? "on" : "off"}</button><button className="transport-icon" onClick={() => showToast("Undo")} aria-label="Undo"><Undo2 size={16} /></button><button className="transport-icon" onClick={() => showToast("Redo")} aria-label="Redo"><Redo2 size={16} /></button><span className="zoom-label">−</span><div className="zoom-track"><span /></div><span className="zoom-label">+</span><span className="zoom-value">100%</span></div>
    </div>
    <div className="arrangement-shell">
      <aside className={`asset-panel ${libraryOpen ? "" : "collapsed"}`}>
        <div className="asset-heading"><div><span className="asset-heading-icon"><Library size={15} /></span><strong>Sound library</strong></div><button className="small-icon-button" onClick={() => setLibraryOpen(!libraryOpen)} aria-label="Toggle sound library"><ChevronLeft size={15} /></button></div>
        {libraryOpen && <><div className="asset-search"><Search size={14} /><input placeholder="Find a sound..." /></div>
          <div className="asset-section"><span>GENERATED SOUNDS</span><button onClick={() => showToast("Showing all generated sounds")}><MoreHorizontal size={15} /></button></div>
          {sounds.filter((sound) => soundAudioUrl(sound)).map((sound) => <div className="asset-row" key={sound.name} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-muge-sound", sound.name); event.dataTransfer.effectAllowed = "copy"; }} title="Drag into a track to add this sound / トラックにドラッグして追加"><span className={`asset-file ${sound.color}`}><AudioLines size={14} /></span><span><strong>{sound.name}</strong><small>{sound.type} · {sound.duration} · Drag to track</small></span><AudioPreviewButton className="asset-preview" src={soundAudioUrl(sound)!} name={sound.name} /><button onClick={onImport} aria-label={`Add ${sound.name}`}><Plus size={15} /></button></div>)}
          <button className="view-library-link" onClick={onImport}>Browse all sounds <ChevronRight size={13} /></button>
          <div className="asset-section asset-section-spaced"><span>QUICK ACTIONS</span></div>
          <button className="asset-action" onClick={onGenerate}><span className="action-spark"><Sparkles size={14} /></span> Generate a sound <ChevronRight size={14} /></button>
          <button className="asset-action" onClick={onImport}><span className="action-import"><Upload size={14} /></span> Import from project <ChevronRight size={14} /></button>
        </>}
      </aside>
      <section className="timeline-section">
        <div className="timeline-scroll" ref={timelineScrollRef}>
          <div className="track-list">
            {tracks.map((track) => <div className="track-row" key={track.id}>
              <div className="track-info"><div className={`track-art ${track.color}`}>{track.kind === "audio" ? <Mic2 size={15} /> : <Music2 size={16} />}</div><div className="track-name-group"><strong title={track.name}>{track.name}</strong><small>{track.kind === "audio" ? "Audio track" : "AI instrument"}</small></div><button className={`track-toggle ${track.muted ? "selected" : ""}`} onClick={() => updateTrack(track.id, { muted: !track.muted })}>M</button><button className={`track-toggle solo-toggle ${track.solo ? "selected" : ""}`} onClick={() => updateTrack(track.id, { solo: !track.solo })}>S</button><div className="track-volume"><Volume2 size={13} /><input aria-label={`${track.name} volume`} type="range" min="0" max="100" value={track.volume} onChange={(event) => updateTrack(track.id, { volume: Number(event.target.value) })} style={{ "--range-progress": `${track.volume}%` } as React.CSSProperties} /></div><button className="track-menu" onClick={() => { const name = window.prompt("Track name / トラック名", track.name); if (name?.trim()) updateTrack(track.id, { name: name.trim() }); }} aria-label={`Rename ${track.name} / トラック名を変更`} title="Rename track / トラック名を変更"><Pencil size={13} /></button></div>
              <div className="track-lane" onClick={(event) => { if (event.target === event.currentTarget) { setSelectedClip(""); seekToClientX(event.clientX); } }} onDragEnter={(event) => { event.preventDefault(); event.currentTarget.classList.add("drop-target"); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) event.currentTarget.classList.remove("drop-target"); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = event.dataTransfer.types.includes("application/x-muge-sound") ? "copy" : "move"; }} onDrop={(event) => {
                event.preventDefault();
                event.currentTarget.classList.remove("drop-target");
                const draggedSound = event.dataTransfer.getData("application/x-muge-sound");
                if (draggedSound) { addLibrarySoundToTrack(draggedSound, track.id, event.clientX, event.currentTarget); return; }
                const id = event.dataTransfer.getData("text/plain");
                const draggedClip = clips.find((clip) => clip.id === id);
                if (!draggedClip) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const pointerPosition = ((event.clientX - bounds.left) / bounds.width) * 100;
                const offsetData = event.dataTransfer.getData("application/x-muge-clip-offset");
                const pointerOffset = offsetData ? Number(offsetData) : draggedClip.width / 2;
                const desired = pointerPosition - (Number.isFinite(pointerOffset) ? pointerOffset : draggedClip.width / 2);
                const start = findAvailableClipStart(desired, draggedClip.width, clips.filter((clip) => clip.trackId === track.id), draggedClip.id, snap);
                if (start === null) { showToast("No free position on this track / トラックに空きがありません"); return; }
                updateClip(id, { trackId: track.id, start });
                setSelectedClip(id);
              }}>
                {clips.filter((clip) => clip.trackId === track.id).map((clip) => <button key={clip.id} draggable className={`audio-clip ${clip.color} ${selectedClip === clip.id ? "selected" : ""} ${clip.fadeIn ? "faded-in" : ""} ${clip.fadeOut ? "faded-out" : ""}`} style={{ left: `${clip.start}%`, width: `${clip.width}%`, opacity: (clip.volume ?? 80) / 100 }} onDragStart={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const offset = ((event.clientX - rect.left) / rect.width) * clip.width; event.dataTransfer.setData("text/plain", clip.id); event.dataTransfer.setData("application/x-muge-clip-offset", String(offset)); event.dataTransfer.effectAllowed = "move"; }} onClick={(event) => { event.stopPropagation(); setSelectedClip(clip.id); }} title={`${clip.name} · Drag to rearrange · Drag right edge to trim`}>
                  <span className="clip-title">{clip.name}</span><span className="clip-waveform">{waveformForClip(clip).map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</span><span className="clip-duration">{clip.duration}</span>
                  {selectedClip === clip.id && <><span className="fade-handle fade-in" onClick={(event) => { event.stopPropagation(); updateClip(clip.id, { fadeIn: !clip.fadeIn }); }} /><span className="fade-handle fade-out" onClick={(event) => { event.stopPropagation(); updateClip(clip.id, { fadeOut: !clip.fadeOut }); }} /></>}
                  {selectedClip === clip.id && <span className="clip-trim-edge" role="separator" aria-label={`Trim ${clip.name}`} title="Drag left to shorten / 左へドラッグして短くする" onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); const lane = event.currentTarget.closest(".track-lane"); const laneWidth = lane?.getBoundingClientRect().width ?? 0; if (laneWidth > 0) { setSelectedClip(clip.id); setTrimmingClip({ id: clip.id, startX: event.clientX, laneWidth, initialWidth: clip.width, initialDuration: parseClipDuration(clip.duration) }); } }} />}
                </button>)}
              </div>
            </div>)}
            <div className="add-track-row"><div className="track-info add-track-info"><button className="add-track-button" onClick={onAddTrack}><Plus size={15} /> Add a track</button><button className="add-track-import" onClick={onImport}><Upload size={13} /> Import audio</button></div><div className="track-lane add-track-lane" /></div>
          </div>
          <div className="playhead" role="slider" tabIndex={0} aria-label="Playback position / 再生位置" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(playheadPercent)} title="Drag to seek / ドラッグしてシーク" style={{ left: `${playheadX}px` }} onPointerDown={beginPlayheadDrag} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const next = Math.max(0, Math.min(100, playheadPercent + (event.key === "ArrowRight" ? 1 : -1))); setPlayheadPercent(next); setSeekRevision((revision) => revision + 1); } }} />
        </div>
        <div className="editor-footer"><div className="selection-info">{selected ? <><span className={`selection-dot ${selected.color}`} /><strong>{selected.name}</strong><span>·</span><span>{selected.duration}</span><code title={`Clip ID: ${selected.id}`}>{selected.generation?.fileName ?? selected.audioUrl?.split("/").pop()}</code></> : <span>Select a clip to edit / クリップを選択</span>}</div>{selected && <div className="clip-position-control"><span>POSITION / 位置</span><button title="Move clip left / 左へ移動" onClick={() => moveSelectedClip(selected.start - (snap ? 5 : 1))}>−</button><input aria-label="Clip position percent / 位置" type="number" min="0" max={Math.max(0, 100 - selected.width)} value={Math.round(selected.start)} onChange={(event) => moveSelectedClip(Number(event.target.value) || 0)} /><small>%</small><button title="Move clip right / 右へ移動" onClick={() => moveSelectedClip(selected.start + (snap ? 5 : 1))}>+</button></div>}{selected && <div className="clip-trim-control"><span>TRIM / 長さ</span><button title="Shorten by one second / 1 秒短くする" disabled={selected.width <= 3} onClick={() => trimSelectedClip(parseClipDuration(selected.duration) - 1)}>−</button><input aria-label="Clip duration seconds / クリップの長さ（秒）" type="number" min={(parseClipDuration(selected.duration) * 3 / selected.width).toFixed(1)} max={parseClipDuration(selected.duration)} step="0.5" value={parseClipDuration(selected.duration).toFixed(1)} onChange={(event) => trimSelectedClip(Number(event.target.value))} /><small>SEC / 秒</small></div>}<div className="clip-actions"><button onClick={onDuplicate} disabled={!selected}><Copy size={14} /> Duplicate / 複製</button><button onClick={onDelete} disabled={!selected}><X size={14} /> Remove / 削除</button><span className="footer-divider" /><span className="clip-volume-control"><Volume2 size={13} /><input aria-label="Clip volume" type="range" min="0" max="100" value={selected?.volume ?? 80} disabled={!selected} onChange={(event) => selected && updateClip(selected.id, { volume: Number(event.target.value) })} style={{ "--range-progress": `${selected?.volume ?? 80}%` } as React.CSSProperties} /></span><button className={selected?.fadeIn ? "effect-active" : ""} onClick={() => selected && updateClip(selected.id, { fadeIn: !selected.fadeIn })} disabled={!selected}>↗ Fade in / フェードイン</button><button className={selected?.fadeOut ? "effect-active" : ""} onClick={() => selected && updateClip(selected.id, { fadeOut: !selected.fadeOut })} disabled={!selected}>↘ Fade out / フェードアウト</button></div><div className="footer-hint"><span className="keyboard-key">⌘</span><span>+</span><span className="keyboard-key">K</span><span> Shortcuts</span></div></div>
      </section>
    </div>
    <div className="studio-bottom"><span><span className="green-status" /> AUTOSAVED JUST NOW</span><span>4 bars <span className="bottom-separator">·</span> C minor <span className="bottom-separator">·</span> {bpm} BPM</span><button onClick={() => showToast("Project settings")}><Gauge size={13} /> Session settings</button></div>
  </div>;
}

function GenerateView({ projectId, mode, setMode, prompt, setPrompt, generating, services, selectedServiceId, onSelectService, clips, onManageServices, onGenerate, onUpdateClip, onOpenInEditor, showToast }: {
  projectId: string; mode: GenerateMode; setMode: (mode: GenerateMode) => void; prompt: string; setPrompt: (value: string) => void; generating: boolean;
  services: AIService[]; selectedServiceId: string; onSelectService: (id: string) => void; clips: Clip[]; onManageServices: () => void;
  onGenerate: (settings: GenerationSettings) => void; onUpdateClip: (id: string, patch: Partial<Clip>) => void;
  onOpenInEditor: (clip: Clip) => void; showToast: (message: string) => void;
}) {
  const [instrument, setInstrument] = useState("Drum");
  const [mood, setMood] = useState("Lo-fi");
  const [bpm, setBpm] = useState(96);
  const [musicalKey, setMusicalKey] = useState("C minor");
  const [durationSeconds, setDurationSeconds] = useState(8);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [effects, setEffects] = useState(["Reverb"]);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSettings, setEditSettings] = useState<GenerationSettings | null>(null);
  const enabledServices = services.filter((service) => service.enabled);
  const selectedService = enabledServices.find((service) => service.id === selectedServiceId);
  const generatedClips = clips.filter((clip) => clip.generation && (!clip.generation.projectId || clip.generation.projectId === projectId)).sort((a, b) => (b.generation?.createdAt ?? "").localeCompare(a.generation?.createdAt ?? ""));
  const selectedGeneratedClip = generatedClips.find((clip) => clip.id === editingClipId);
  const settings: GenerationSettings = { prompt, instrument, mood, bpm, key: musicalKey, durationSeconds, effects, negativePrompt };
  const instruments = ["Drum", "Piano", "Violin", "Guitar", "Flute"];
  const moodOptions: [string, string][] = [["Lo-fi", "ローファイ"], ["Pop", "ポップ"], ["Cinematic", "シネマティック"], ["Ambient", "アンビエント"], ["Jazz", "ジャズ"], ["Rock", "ロック"], ["Classical", "クラシック"]];
  const effectOptions = ["Reverb", "Delay", "Chorus", "Compression", "Tape saturation"];
  const effectNames: Record<string, string> = { Reverb: "リバーブ", Delay: "ディレイ", Chorus: "コーラス", Compression: "コンプレッサー", "Tape saturation": "テープサチュレーション" };
  const statuses: Record<NonNullable<Clip["generation"]>["status"], string> = { queued: "Queued / 待機中", running: "Generating / 生成中", succeeded: "Ready / 完了", failed: "Failed / 失敗" };
  const updateEditSettings = (patch: Partial<GenerationSettings>) => setEditSettings((current) => current ? { ...current, ...patch } : current);
  const openEditor = (clip: Clip) => {
    if (!clip.generation) return;
    setEditingClipId(clip.id);
    setEditName(clip.name);
    setEditSettings({ ...clip.generation.settings, durationSeconds: Math.max(1, Math.min(10, clip.generation.settings.durationSeconds)), effects: [...clip.generation.settings.effects] });
  };
  const closeEditor = () => { setEditingClipId(null); setEditSettings(null); setEditName(""); };
  const saveEditedMetadata = () => {
    const clip = generatedClips.find((item) => item.id === editingClipId);
    if (!clip?.generation || !editSettings) return;
    onUpdateClip(clip.id, { name: editName.trim() || clip.name, generation: { ...clip.generation, settings: editSettings } });
    showToast("Clip metadata saved / メタデータを保存しました");
  };
  const copySettings = (clip: Clip) => {
    if (!clip.generation) return;
    const copied = { ...clip.generation.settings, durationSeconds: Math.max(1, Math.min(10, clip.generation.settings.durationSeconds)) };
    setPrompt(copied.prompt); setInstrument(copied.instrument); setMood(copied.mood); setBpm(copied.bpm);
    setMusicalKey(copied.key); setDurationSeconds(copied.durationSeconds); setEffects([...copied.effects]); setNegativePrompt(copied.negativePrompt);
    window.setTimeout(() => document.getElementById("sound-prompt")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    showToast("Settings copied. Edit them and generate a new clip. / 設定をコピーしました");
  };
  const generateFromEditedClip = () => {
    if (!selectedGeneratedClip?.generation || !editSettings) return;
    onUpdateClip(selectedGeneratedClip.id, { name: editName.trim() || selectedGeneratedClip.name, generation: { ...selectedGeneratedClip.generation, settings: editSettings } });
    onGenerate(editSettings);
  };
  const renderSettingsFields = (value: GenerationSettings, update: (patch: Partial<GenerationSettings>) => void, idPrefix: string) => <>
    <div className="setting-grid generation-settings-grid">
      <label>INSTRUMENT / 楽器<select value={value.instrument} onChange={(event) => update({ instrument: event.target.value })}>{instruments.map((item) => <option key={item} value={item}>{item} / {item === "Drum" ? "ドラム" : item === "Piano" ? "ピアノ" : item === "Violin" ? "バイオリン" : item === "Guitar" ? "ギター" : "フルート"}</option>)}</select></label>
      <label>MOOD / ムード<select value={value.mood} onChange={(event) => update({ mood: event.target.value })}>{moodOptions.map(([item, ja]) => <option key={item} value={item}>{item} / {ja}</option>)}</select></label>
      <label>TEMPO / テンポ<div className="tempo-input"><input type="number" min="40" max="240" value={value.bpm} onChange={(event) => update({ bpm: Math.max(40, Math.min(240, Number(event.target.value) || 40)) })} /><span>BPM</span></div></label>
      <label>KEY / 調<select value={value.key} onChange={(event) => update({ key: event.target.value })}>{["C major", "C minor", "D major", "D minor", "E minor", "F major", "G major", "A minor"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>DURATION / 長さ（秒）<div className="tempo-input"><input type="number" min="1" max="10" step="0.5" value={value.durationSeconds} onChange={(event) => update({ durationSeconds: Math.max(1, Math.min(10, Number(event.target.value) || 1)) })} /><span>SEC / 秒</span></div></label>
    </div>
    <div className="effect-row"><span className="effect-title"><SlidersHorizontal size={15} /> EFFECTS / エフェクト</span>{effectOptions.map((effect) => <button type="button" className={`effect-chip ${value.effects.includes(effect) ? "active" : ""}`} key={`${idPrefix}-${effect}`} onClick={() => update({ effects: value.effects.includes(effect) ? value.effects.filter((item) => item !== effect) : [...value.effects, effect] })}><span>{value.effects.includes(effect) ? "◉" : "+"}</span>{effect} / {effectNames[effect]}</button>)}</div>
    <label className="negative-prompt-field">AVOID / 除外したい音<input value={value.negativePrompt} onChange={(event) => update({ negativePrompt: event.target.value })} placeholder="e.g. vocals, harsh distortion / ボーカル、強い歪み" /></label>
  </>;

  return <div className="page-content generate-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon"><Sparkles size={13} /></span> AI SOUND DESIGN / AI サウンド生成</div><h1>Sound clip generation / 音声クリップ生成</h1><p>Select a project clip to edit its settings beside the list, or create a new clip below. / クリップを選ぶと横で設定を編集でき、新規クリップは下から作成できます。</p></div></div>
    <div className="generation-layout">
      <section className="generation-main">
        <div className="generation-service-picker"><span className={`service-picker-icon ${selectedService?.deployment ?? "local"}`}>{selectedService?.deployment === "cloud" ? <Cloud size={16} /> : <Server size={16} />}</span><div className="service-picker-copy"><strong>Generation service / 生成サービス</strong><small>{selectedService ? `${selectedService.name} · ${selectedService.connection === "online" ? "Online / 接続済み" : selectedService.connection === "offline" ? "Unreachable / 接続不可" : "Not checked / 未確認"}` : "No enabled service / 有効なサービスなし"}</small></div><select aria-label="AI service for generation" value={selectedService?.id ?? ""} onChange={(event) => onSelectService(event.target.value)}><option value="" disabled>Select a service / サービス選択</option>{enabledServices.map((service) => <option key={service.id} value={service.id}>{service.name} ({service.deployment})</option>)}</select><button className="text-button" onClick={onManageServices}>Manage / 管理</button></div>
        <div className="generation-composer-heading" id="generation-composer"><div><span className="step-number">✦</span><div><h2>Create a new clip / 新規クリップ</h2><p>Set a prompt and sound settings, then generate a demo clip. / プロンプトと音を設定してデモを生成します。</p></div></div><button className="button button-quiet" onClick={() => document.getElementById("sound-prompt")?.scrollIntoView({ behavior: "smooth", block: "center" })}><Sparkles size={14} /> New generation / 生成設定</button></div>
        <div className="generation-card"><div className="generation-card-top"><div><span className="step-number">01</span><div><h2>Starting point / 入力</h2><p>Start from a text prompt, reference audio, or a melody. / テキスト、参照音声、メロディから始めます。</p></div></div><span className="beta-tag">AI STUDIO</span></div>
          <div className="mode-tabs"><button className={mode === "prompt" ? "active" : ""} onClick={() => setMode("prompt")}><span className="mode-icon prompt-icon"><Sparkles size={16} /></span><span><strong>Text prompt / テキスト</strong><small>Describe your sound / 音を説明</small></span></button><button className={mode === "reference" ? "active" : ""} onClick={() => setMode("reference")}><span className="mode-icon record-icon"><Radio size={16} /></span><span><strong>Audio reference / 参照音声</strong><small>Use a sample / サンプルを使用</small></span></button><button className={mode === "hum" ? "active" : ""} onClick={() => setMode("hum")}><span className="mode-icon hum-icon"><Mic2 size={16} /></span><span><strong>Hum a melody / ハミング</strong><small>Capture a melody / メロディを録音</small></span></button></div>
          {mode === "prompt" && <div className="prompt-area"><label htmlFor="sound-prompt">SOUND PROMPT / 生成したい音</label><textarea id="sound-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="A warm piano motif over a restrained lo-fi drum groove / 温かいピアノと控えめなローファイドラム" maxLength={500} /><div className="prompt-foot"><span>Describe genre, rhythm, instruments, or texture. / ジャンル、リズム、楽器、質感を入力。</span><span>{prompt.length}/500</span></div><div className="prompt-suggestions"><span>TRY / 例</span>{["lo-fi", "cinematic", "acoustic"].map((item) => <button key={item} onClick={() => setPrompt((current) => `${current}${current ? ", " : ""}${item}`)}>{item}</button>)}</div></div>}
          {mode === "reference" && <div className="upload-drop" onClick={() => showToast("Reference audio upload requires backend support / 参照音声にはバックエンドが必要です")}><span className="upload-circle"><Upload size={19} /></span><strong>Reference audio / 参照音声</strong><span><u>Choose an audio file / 音声を選択</u></span><small>WAV, MP3 or M4A</small></div>}
          {mode === "hum" && <div className="hum-recorder"><button className="record-button" onClick={() => showToast("Microphone recording requires backend support / 録音にはバックエンドが必要です")}><Mic2 size={21} /></button><strong>Record a melody / メロディを録音</strong><p>Microphone capture will be available after backend integration. / バックエンド接続後に利用できます。</p></div>}
        </div>
        <div className="generation-card settings-card"><div className="generation-card-top"><div><span className="step-number">02</span><div><h2>Shape the sound / サウンド設定</h2><p>Choose an instrument, tempo, duration, and effects. / 楽器、テンポ、長さ、エフェクトを設定します。</p></div></div><button className="text-button" onClick={() => { setInstrument("Drum"); setMood("Lo-fi"); setBpm(96); setMusicalKey("C minor"); setDurationSeconds(8); setEffects(["Reverb"]); setNegativePrompt(""); }}>Reset / リセット</button></div>
          {renderSettingsFields(settings, (patch) => {
            if (patch.instrument !== undefined) setInstrument(patch.instrument);
            if (patch.mood !== undefined) setMood(patch.mood);
            if (patch.bpm !== undefined) setBpm(patch.bpm);
            if (patch.key !== undefined) setMusicalKey(patch.key);
            if (patch.durationSeconds !== undefined) setDurationSeconds(patch.durationSeconds);
            if (patch.effects !== undefined) setEffects(patch.effects);
            if (patch.negativePrompt !== undefined) setNegativePrompt(patch.negativePrompt);
          }, "generate")}
        </div>
        <div className="generate-cta"><div><span className="credits-icon"><Sparkles size={15} /></span><span><strong>Prototype generation / デモ生成</strong><small>{selectedService ? `Using ${selectedService.name}. A playable demo sample is used; AI generation is not connected. / 再生可能なデモ音源を使用します。` : "Choose an enabled service / 有効なサービスを選択してください"}{generating ? " · Jobs running / 生成中" : ""}</small></span></div><button className="button button-primary" onClick={() => onGenerate(settings)} disabled={!selectedService}><Sparkles size={16} /> Generate clip / 生成</button></div>
      </section>
      <div className="generated-clips-workbench"><section className="generated-clips-panel"><div className="generated-clips-heading"><div><span className="clips-heading-icon"><FileAudio size={15} /></span><div><strong>Project clips / 生成クリップ</strong><small>Saved with prompt and settings / 設定を保存</small></div></div><div className="generated-clips-heading-actions"><span className="clips-count">{generatedClips.length}</span><button className="new-generated-clip" onClick={() => document.getElementById("generation-composer")?.scrollIntoView({ behavior: "smooth", block: "start" })}><Plus size={13} /> New clip / 新規</button></div></div>
        <div className="generated-clips-list">{generatedClips.length ? generatedClips.map((clip) => <article className={`generated-clip-row ${editingClipId === clip.id ? "selected" : ""}`} key={clip.id}>
          <div className={`generated-clip-status ${clip.generation?.status ?? "queued"}`}><i />{statuses[clip.generation!.status]}</div>
          <button className={`generated-clip-select ${editingClipId === clip.id ? "active" : ""}`} onClick={() => openEditor(clip)}><strong className="generated-clip-name">{clip.name}</strong><code title={clip.id}>ID: {clip.id}</code><code>{clip.generation?.fileName}</code></button>
          <div className="generated-clip-actions">{clip.generation?.status === "succeeded" && <AudioPreviewButton className="generated-clip-play" src={clip.generation.audioUrl ?? demoAudioForInstrument(clip.generation.settings.instrument)} name={clip.name} />}<button onClick={() => copySettings(clip)} title="Copy settings / 設定をコピー"><Copy size={13} /> Copy settings / コピー</button><button onClick={() => openEditor(clip)} disabled={clip.generation?.status === "running" || clip.generation?.status === "queued"} title={clip.generation?.status === "running" ? "Available when generation finishes / 生成完了後に編集できます" : "Edit metadata / メタデータ編集"}><Pencil size={13} /> Edit / 編集</button>{clip.generation?.status === "succeeded" && <button onClick={() => onOpenInEditor(clip)} title="Open in arrangement / アレンジで開く"><AudioLines size={13} /> Open / 開く</button>}</div>
        </article>) : <div className="generated-clips-empty"><FileAudio size={20} /><strong>No generated clips yet / クリップはまだありません</strong><p>New and in-progress clips for this project appear here. / 生成したクリップがここに表示されます。</p></div>}</div>
        <div className="generated-clips-storage-note"><Folder size={13} /> Each clip saves a `.wav` and editable `.meta` file in project storage. / プロジェクト保存領域に保存</div>
      </section>
      <aside className={`clip-settings-inspector ${selectedGeneratedClip ? "has-selection" : ""}`}>
        <div className="clip-inspector-heading"><div><span className="clips-heading-icon"><SlidersHorizontal size={15} /></span><div><strong>Clip settings / クリップ設定</strong><small>{selectedGeneratedClip ? "Edit settings and metadata / 設定を編集" : "Select a clip to inspect / クリップを選択"}</small></div></div>{selectedGeneratedClip && <button className="clip-inspector-close" onClick={closeEditor} aria-label="Close clip settings / 設定を閉じる"><X size={15} /></button>}</div>
        {selectedGeneratedClip?.generation && editSettings ? <div className="clip-inspector-content">
          <div className="clip-inspector-identity"><span className={`generated-clip-status ${selectedGeneratedClip.generation.status}`}><i />{statuses[selectedGeneratedClip.generation.status]}</span><strong>{selectedGeneratedClip.id}</strong><small>{selectedGeneratedClip.generation.fileName}</small></div>
          <label className="clip-edit-name">CLIP NAME / 名前<input value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
          <label className="clip-edit-prompt">PROMPT / プロンプト<textarea value={editSettings.prompt} onChange={(event) => updateEditSettings({ prompt: event.target.value })} maxLength={500} /></label>
          {renderSettingsFields(editSettings, updateEditSettings, "inspector")}
          <div className="clip-inspector-actions"><button className="button button-quiet" onClick={() => copySettings(selectedGeneratedClip)}><Copy size={13} /> Copy settings / コピー</button><button className="button button-primary" onClick={saveEditedMetadata} disabled={selectedGeneratedClip.generation.status === "running" || selectedGeneratedClip.generation.status === "queued"}><Check size={14} /> Save / 保存</button><button className="button button-quiet" onClick={generateFromEditedClip}><Sparkles size={14} /> Generate new / 再生成</button></div>
        </div> : <div className="clip-inspector-empty"><FileAudio size={22} /><strong>Select a project clip</strong><p>Its prompt, instrument, tempo, duration, and effects will appear here. / 選択したクリップの設定がここに表示されます。</p></div>}
      </aside></div>
    </div>
  </div>;
}

function LegacySoundLibraryView({ search, setSearch, filter, setFilter, sounds, onImport, showToast }: {
  search: string; setSearch: (value: string) => void; filter: string; setFilter: (value: string) => void;
  sounds: typeof storedSounds; onImport: () => void; showToast: (message: string) => void;
}) {
  const filters = ["All sounds", "AI generation", "Imported", "Drum loop", "Melody", "Bass", "Texture", "Vocal", "Keys"];
  return <div className="page-content storage-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon library-eyebrow"><Library size={13} /></span> YOUR CREATIVE LIBRARY</div><h1>Every sound, in its place.</h1><p>Your generated clips, references, and little happy accidents.</p></div><button className="button button-dark" onClick={onImport}><Upload size={15} /> Import audio</button></div>
    <div className="storage-stats"><div><span className="stats-icon blue"><AudioLines size={17} /></span><span><small>YOUR SOUNDS</small><strong>24 <i>clips</i></strong></span></div><div><span className="stats-icon lilac"><Folder size={17} /></span><span><small>PROJECTS</small><strong>3 <i>projects</i></strong></span></div><div><span className="stats-icon peach"><Disc3 size={17} /></span><span><small>STORAGE USED</small><strong>128 <i>MB of 2 GB</i></strong></span></div><button onClick={() => showToast("Storage is healthy")}><span className="storage-health"><Check size={14} /></span> Everything is backed up <ChevronRight size={14} /></button></div>
    <div className="storage-library"><div className="storage-library-head"><div><h2>Sound library</h2><span>{sounds.length} sounds</span></div><div className="storage-controls"><label className="storage-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sounds..." /></label><button className="sort-button" onClick={() => showToast("Sorted by most recently added")}><SlidersHorizontal size={15} /> Recently added <ChevronDown size={14} /></button></div></div>
      <div className="filter-pills">{filters.map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {sounds.length ? <div className="sound-grid">{sounds.map((sound) => <article className="sound-card" key={sound.name}><div className={`sound-card-art ${sound.color}`}><div className="sound-art-top"><span><AudioLines size={15} /> {sound.type.toUpperCase()}</span><button onClick={() => showToast(`${sound.name} options`)} aria-label={`${sound.name} options`}><MoreHorizontal size={17} /></button></div><div className="sound-art-wave">{waveform.map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><button className="sound-play" aria-label={`Play ${sound.name}`} onClick={(event) => { event.currentTarget.classList.toggle("playing"); showToast(`Previewing ${sound.name}`); }}><Play size={14} fill="currentColor" /></button><span className="sound-duration">{sound.duration}</span></div><div className="sound-card-bottom"><span><strong>{sound.name}</strong><small>Added to <b>Midnight in Kyoto</b></small></span><button onClick={onImport} className="add-sound-button"><Plus size={14} /> Add</button></div><div className="sound-meta"><span><FileAudio size={12} /> WAV</span><span>{sound.size}</span><span>Edited just now</span></div></article>)}</div> : <div className="empty-state"><span><Search size={22} /></span><strong>No sounds found</strong><p>Try a different search or category.</p><button onClick={() => { setSearch(""); setFilter("All sounds"); }}>Clear filters</button></div>}
      <button className="load-more" onClick={() => showToast("You’re all caught up")}>You’re all caught up <span>·</span> That’s every sound for now</button>
    </div>
  </div>;
}

function OldStorageView({ items, setItems, showToast }: { items: StorageItem[]; setItems: React.Dispatch<React.SetStateAction<StorageItem[]>>; showToast: (message: string) => void }) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentFolder = items.find((item) => item.id === folderId && item.type === "folder");
  const visibleItems = items.filter((item) => item.parentId === folderId && item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1);
  const folders = items.filter((item) => item.type === "folder");
  const files = items.filter((item) => item.type === "file");
  const usedBytes = files.reduce((total, file) => total + (file.size ?? 0), 0);
  const formatSize = (size = 0) => size > 1_000_000 ? `${(size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1000))} KB`;
  const createFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    if (hasSiblingName(items, folderId, name)) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    setItems((current) => [...current, { id: `folder-${Date.now()}`, name: name.trim(), type: "folder", parentId: folderId, updatedAt: "Just now", color: "amber" }]);
    showToast("Folder created");
  };
  const renameItem = (item: StorageItem) => {
    if (item.nameLocked) { showToast("Generated clip filenames are fixed / ファイル名は固定です"); return; }
    const name = window.prompt("New name", item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    if (items.some((entry) => entry.id !== item.id && entry.parentId === item.parentId && entry.name.toLowerCase() === name.trim().toLowerCase())) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: name.trim(), updatedAt: "Just now" } : entry));
    showToast("Item renamed");
  };
  const descendantIds = (rootId: string) => {
    const ids = new Set([rootId]);
    let updated = true;
    while (updated) {
      updated = false;
      for (const entry of items) {
        if (entry.parentId && ids.has(entry.parentId) && !ids.has(entry.id)) {
          ids.add(entry.id);
          updated = true;
        }
      }
    }
    return ids;
  };
  const deleteItem = (item: StorageItem) => {
    const ids = descendantIds(item.id);
    if (!window.confirm(`Delete “${item.name}”${ids.size > 1 ? ` and its ${ids.size - 1} item${ids.size === 2 ? "" : "s"}` : ""}? This cannot be undone.`)) return;
    setItems((current) => current.filter((entry) => !ids.has(entry.id)));
    setSelectedIds((current) => current.filter((id) => !ids.has(id)));
    showToast("Item deleted");
  };
  const downloadItem = async (item: StorageItem) => {
    if (item.type === "folder") {
      const nested = items.filter((entry) => entry.parentId === item.id);
      downloadBlob(new Blob([JSON.stringify({ folder: item.name, files: nested.map(({ name, format, size, updatedAt }) => ({ name, format, size, updatedAt })) }, null, 2)], { type: "application/json" }), `${item.name}-contents.json`);
      return;
    }
    if (item.content?.startsWith("data:")) {
      const response = await fetch(item.content);
      downloadBlob(await response.blob(), item.name);
    } else {
      downloadBlob(createDemoWav(), item.name.replace(/\.[^.]+$/, ".wav"));
    }
  };
  const uploadFile = (file?: File) => {
    if (!file) return;
    if (items.some((item) => item.parentId === folderId && item.name.toLowerCase() === file.name.toLowerCase())) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    if (file.size > 2_000_000) {
      showToast("Demo uploads are limited to 2 MB so the file can be saved in this browser");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast("Could not read the selected file");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showToast("Could not read the selected file");
        return;
      }
      const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
      setItems((current) => [...current, { id: `file-${Date.now()}`, name: file.name, type: "file", parentId: folderId, format: extension, size: file.size, updatedAt: "Just now", color: "blue", content: reader.result as string }]);
      showToast("File uploaded");
    };
    reader.readAsDataURL(file);
  };
  const toggleSelected = (itemId: string, checked: boolean) => setSelectedIds((current) => checked ? [...new Set([...current, itemId])] : current.filter((id) => id !== itemId));
  const downloadSelected = () => items.filter((item) => selectedIds.includes(item.id)).forEach((item) => { void downloadItem(item); });
  const deleteSelected = () => {
    const ids = new Set(selectedIds.flatMap((id) => [...descendantIds(id)]));
    if (!ids.size || !window.confirm(`Delete ${selectedIds.length} selected item${selectedIds.length === 1 ? "" : "s"} and their contents? This cannot be undone.`)) return;
    setItems((current) => current.filter((item) => !ids.has(item.id)));
    setSelectedIds([]);
    if (folderId && ids.has(folderId)) setFolderId(null);
    showToast("Selected items deleted");
  };
  const selectVisible = (checked: boolean) => setSelectedIds((current) => checked ? [...new Set([...current, ...visibleItems.map((item) => item.id)])] : current.filter((id) => !visibleItems.some((item) => item.id === id)));
  return <div className="page-content storage-page storage-manager">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon library-eyebrow"><Library size={13} /></span> YOUR FILES & PROJECTS</div><h1>Storage</h1><p>Keep project folders and audio files neat, together, and ready to use.</p></div><div className="storage-heading-actions"><button className="button button-quiet" onClick={createFolder}><FolderPlus size={15} /> New folder</button><label className="button button-dark upload-storage-button"><Upload size={15} /> Upload file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff" onChange={(event) => { uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>
    <div className="storage-stats"><div><span className="stats-icon blue"><FileMusic size={17} /></span><span><small>FILES</small><strong>{files.length} <i>audio files</i></strong></span></div><div><span className="stats-icon lilac"><Folder size={17} /></span><span><small>FOLDERS</small><strong>{folders.length} <i>projects & folders</i></strong></span></div><div><span className="stats-icon peach"><Disc3 size={17} /></span><span><small>STORAGE USED</small><strong>{(usedBytes / 1_000_000).toFixed(1)} <i>MB of 2 GB</i></strong></span></div><button onClick={() => showToast("Your files are saved in this browser")}><span className="storage-health"><Check size={14} /></span> Demo storage</button></div>
    <div className="storage-library storage-manager-panel"><div className="storage-library-head"><div><h2>Project files</h2><span>{visibleItems.length} items</span></div><div className="storage-controls"><label className="storage-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this folder..." /></label></div></div>
      <div className="storage-toolbar"><div className="storage-breadcrumb"><button onClick={() => setFolderId(null)} className={!folderId ? "active" : ""}><Home size={13} /> All files</button>{currentFolder && <><ChevronRight size={13} /><span>{currentFolder.name}</span></>}</div><div><button onClick={createFolder}><FolderPlus size={14} /> New folder</button><button onClick={() => setItems((current) => [...current].sort((a, b) => a.name.localeCompare(b.name)))}><SlidersHorizontal size={14} /> Sort A–Z</button></div></div>
      {visibleItems.length ? <div className="storage-table"><div className="storage-table-header"><span><input aria-label="Select all files" type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id))} onChange={(event) => selectVisible(event.target.checked)} /> NAME</span><span>TYPE</span><span>SIZE</span><span>LAST UPDATED</span><span>ACTIONS</span></div>{visibleItems.map((item) => <div className={`storage-table-row ${selectedIds.includes(item.id) ? "checked" : ""}`} key={item.id}><span className="storage-file-name"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedIds.includes(item.id)} onChange={(event) => toggleSelected(item.id, event.target.checked)} /><button className={`storage-item-icon ${item.type} ${item.color}`} onClick={() => item.type === "folder" && setFolderId(item.id)}>{item.type === "folder" ? <Folder size={17} /> : <FileAudio size={17} />}</button><button className="storage-item-title" onClick={() => item.type === "folder" ? setFolderId(item.id) : void downloadItem(item)}><strong>{item.name}</strong>{item.type === "file" && <small>{item.format} audio</small>}</button></span><span className="storage-type">{item.type === "folder" ? "Folder" : item.format}</span><span className="storage-size">{item.type === "folder" ? `${items.filter((entry) => entry.parentId === item.id).length} items` : formatSize(item.size)}</span><span className="storage-updated">{item.updatedAt}</span><span className="storage-actions"><button title="Download" aria-label={`Download ${item.name}`} onClick={() => void downloadItem(item)}><Download size={15} /></button><button title="Rename" aria-label={`Rename ${item.name}`} onClick={() => renameItem(item)}><Pencil size={14} /></button><button title="Delete" aria-label={`Delete ${item.name}`} onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}</div> : <div className="storage-empty"><span><Folder size={22} /></span><strong>This folder is empty</strong><p>Upload an audio file or create a folder to get started.</p><div><button className="button button-quiet" onClick={createFolder}><FolderPlus size={14} /> New folder</button><label className="button button-primary upload-storage-button"><Upload size={14} /> Upload file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff" onChange={(event) => { uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>}
      {selectedIds.length > 0 && <div className="storage-bulkbar"><span>{selectedIds.length} selected</span><button onClick={downloadSelected}><Download size={14} /> Download selected</button><button onClick={deleteSelected}><Trash2 size={14} /> Delete selected</button></div>}
    </div>
  </div>;
}

function oldDownloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function oldCreateDemoWav() {
  const sampleRate = 22050;
  const sampleCount = sampleRate;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => Array.from(text).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + sampleCount * 2, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 1100, (sampleCount - index) / 1800);
    view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * 220 * index) / sampleRate) * envelope * 5000, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function WorkspaceOverview({ projects, onOpen, onCreate }: { projects: Project[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "projects">("overview");
  const [query, setQuery] = useState("");
  const filtered = projects.filter((project) => `${project.name} ${project.mood} ${project.status}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-content workspace-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> YOUR CREATIVE SPACE</div><h1>Workspace</h1><p>All your music projects, together in one place.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={15} /> New project</button></div>
    <div className="workspace-tabs"><button className={activeTab === "overview" ? "active" : ""} onClick={() => setActiveTab("overview")}><LayoutGrid size={15} /> Overview</button><button className={activeTab === "projects" ? "active" : ""} onClick={() => setActiveTab("projects")}><Folder size={15} /> Projects <span>{projects.length}</span></button><span className="workspace-tabs-spacer" /><span className="workspace-total">{projects.length} projects <i>·</i> Updated just now</span></div>
    {activeTab === "overview" ? <>
      <div className="workspace-summary"><div className="workspace-summary-copy"><span className="eyebrow">YOUR PROJECTS AT A GLANCE</span><h2>Every idea has<br />a place to grow.</h2><p>Open a project to refine its details, generate new clips, or bring the whole arrangement together.</p></div><div className="workspace-summary-stats"><div><span className="summary-stat-icon violet"><Music2 size={17} /></span><span><small>ALL PROJECTS</small><strong>{projects.length}</strong></span></div><div><span className="summary-stat-icon green"><AudioLines size={17} /></span><span><small>IN PROGRESS</small><strong>{projects.filter((project) => project.status === "In progress").length}</strong></span></div><div><span className="summary-stat-icon peach"><Disc3 size={17} /></span><span><small>SOUND CLIPS</small><strong>{clipsCountForOverview(projects)}</strong></span></div></div></div>
      <div className="workspace-section-heading"><div><h2>All projects <span>{projects.length}</span></h2><p>Choose a project to open its workspace.</p></div><button onClick={() => setActiveTab("projects")}>Browse projects <ChevronRight size={14} /></button></div>
      <div className="project-grid workspace-project-grid">{filtered.slice(0, 3).map((project) => <ProjectCard key={project.id} project={project} onOpen={onOpen} />)}</div>
    </> : <>
      <div className="workspace-project-toolbar"><div><h2>All projects</h2><p>Manage and continue working on your music.</p></div><label className="storage-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects..." /></label></div>
      <div className="project-table"><div className="project-table-header"><span>PROJECT</span><span>MOOD</span><span>TRACKS</span><span>LAST UPDATED</span><span>STATUS</span><span /></div>
        {filtered.map((project) => <button key={project.id} className="project-table-row" onClick={() => onOpen(project.id)}><span className="project-table-name"><i className={`project-dot ${project.color}`} /><strong>{project.name}</strong></span><span>{project.mood}</span><span>{project.tracks} tracks</span><span>{project.detail}</span><span><b className={`status-pill status-${project.status.toLowerCase().replace(" ", "-")}`}>{project.status}</b></span><ChevronRight size={15} /></button>)}
        {!filtered.length && <div className="empty-state"><span><Search size={21} /></span><strong>No projects found</strong><p>Try a different search.</p></div>}
      </div>
    </>}
  </div>;
}

function clipsCountForOverview(projects: Project[]) {
  return projects.reduce((total, project) => total + project.tracks, 0);
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen: (id: string) => void }) {
  return <button className="project-card" onClick={() => onOpen(project.id)}><div className={`project-art ${project.color}`}><span className="project-art-icon">{project.icon}</span><span className="project-art-tag">{project.mood}</span><span className="project-art-count"><Music2 size={12} /> {project.tracks} tracks</span><span className="project-art-orb" /></div><div className="project-card-info"><span><strong>{project.name}</strong><small>{project.detail}</small></span><span className={`status-pill status-${project.status.toLowerCase().replace(" ", "-")}`}>{project.status}</span></div></button>;
}

function ProjectTabs({ active, onSelect }: { active: string; onSelect: (tab: string) => void }) {
  const tabs = [
    { id: "metadata", label: "Metadata", icon: <Settings2 size={15} /> },
    { id: "generation", label: "Sound clip generation", icon: <Sparkles size={15} /> },
    { id: "edit", label: "Song editation", icon: <AudioLines size={15} /> },
    { id: "logs", label: "Log", icon: <Clock3 size={15} /> },
  ];
  return <div className="project-detail-tabs">{tabs.map((tab) => <button key={tab.id} className={active === tab.id ? "active" : ""} onClick={() => onSelect(tab.id)}>{tab.icon}<span>{tab.label}</span></button>)}</div>;
}

function MetadataPage({ project, onSave }: { project: Project; onSave: (patch: Partial<Project>) => void }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [mood, setMood] = useState(project.mood);
  const [status, setStatus] = useState(project.status);
  const [bpm, setBpm] = useState(project.bpm);
  const [musicalKey, setMusicalKey] = useState(project.musicalKey);
  const [owner, setOwner] = useState(project.owner);
  useEffect(() => {
    setName(project.name); setDescription(project.description); setMood(project.mood);
    setStatus(project.status); setBpm(project.bpm); setMusicalKey(project.musicalKey); setOwner(project.owner);
  }, [project]);
  return <div className="page-content metadata-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon"><Settings2 size={13} /></span> PROJECT SETTINGS</div><h1>Project metadata</h1><p>Keep the details that shape this project in one place.</p></div><button className="button button-primary" onClick={() => onSave({ name: name.trim() || project.name, description, mood, status, bpm, musicalKey, owner })}><Check size={15} /> Save changes</button></div>
    <div className="metadata-layout"><section className="metadata-card"><div className="metadata-card-heading"><span className="metadata-card-icon"><Music2 size={17} /></span><span><strong>About this project</strong><small>These details help keep your workspace organized.</small></span></div>
      <label className="metadata-field">PROJECT NAME<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Give your project a name" /></label>
      <label className="metadata-field">DESCRIPTION<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What are you making? Capture the feeling, direction, or idea." rows={4} /></label>
      <div className="metadata-two-col"><label className="metadata-field">MOOD / GENRE<select value={mood} onChange={(event) => setMood(event.target.value)}>{["Dream pop", "Lo-fi", "Indie folk", "Ambient", "Cinematic", "Electronic", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="metadata-field">PROJECT STATUS<select value={status} onChange={(event) => setStatus(event.target.value as Project["status"])}>{["Draft", "In progress", "Complete"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="metadata-two-col"><label className="metadata-field">TEMPO<div className="metadata-input-suffix"><input type="number" min="40" max="240" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /><span>BPM</span></div></label><label className="metadata-field">MUSICAL KEY<select value={musicalKey} onChange={(event) => setMusicalKey(event.target.value)}>{["C major", "C minor", "D major", "D minor", "E major", "E minor", "F major", "G major", "A minor", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
    </section><aside className="metadata-sidebar"><div className="metadata-card project-details-card"><h3>Project details</h3><MetadataDetail label="Created" value={project.createdAt} /><MetadataDetail label="Last updated" value={project.updatedAt} /><MetadataDetail label="Owner" value={owner} /><MetadataDetail label="Project ID" value={project.id} /></div><div className="metadata-card"><h3>In this project</h3><div className="project-inventory"><span><AudioLines size={14} /> Arrangement tracks</span><strong>{project.tracks}</strong></div><div className="project-inventory"><span><Disc3 size={14} /> Generated sound clips</span><strong>8</strong></div><div className="project-inventory"><span><Clock3 size={14} /> Session tempo</span><strong>{bpm} BPM</strong></div></div></aside></div>
  </div>;
}

function MetadataDetail({ label, value }: { label: string; value: string }) {
  return <div className="metadata-detail"><span>{label}</span><strong>{value}</strong></div>;
}

function LogsPage({ logs }: { logs: ProjectLog[] }) {
  const icons: Record<ProjectLog["type"], React.ReactNode> = { create: <Plus size={15} />, edit: <Pencil size={14} />, generate: <Sparkles size={14} />, import: <Upload size={14} />, export: <Download size={14} /> };
  return <div className="page-content logs-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon"><Clock3 size={13} /></span> PROJECT HISTORY</div><h1>Activity log</h1><p>A running history of what’s happened in this project.</p></div><span className="logs-count">{logs.length} events</span></div>
    <div className="logs-card"><div className="logs-card-heading"><span>ACTIVITY</span><span>USER</span><span>DATE</span></div>{logs.map((log) => <div className="log-row" key={log.id}><span className={`log-icon log-${log.type}`}>{icons[log.type]}</span><span className="log-copy"><strong>{log.action}</strong><small>{log.detail}</small></span><span className="log-user"><span className="profile-avatar tiny">D</span>{log.user}</span><span className="log-date">{log.createdAt}</span></div>)}</div>
  </div>;
}

function StorageView({ items, setItems, showToast }: { items: StorageItem[]; setItems: React.Dispatch<React.SetStateAction<StorageItem[]>>; showToast: (message: string) => void }) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortDescending, setSortDescending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const currentFolder = items.find((item) => item.id === folderId && item.type === "folder");
  const visibleItems = items.filter((item) => item.parentId === folderId && item.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name) * (sortDescending ? -1 : 1);
  });
  const folders = items.filter((item) => item.type === "folder");
  const files = items.filter((item) => item.type === "file");
  const usedBytes = files.reduce((total, file) => total + (file.size ?? 0), 0);
  const fileSize = formatStorageSize;
  const createFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    if (hasSiblingName(items, folderId, name)) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    setItems((current) => [...current, { id: `folder-${Date.now()}`, name: name.trim(), type: "folder", parentId: folderId, updatedAt: "Just now", color: "amber" }]);
    showToast("Folder created");
  };
  const renameItem = (item: StorageItem) => {
    if (item.nameLocked) { showToast("Generated clip filenames are fixed / ファイル名は固定です"); return; }
    const name = window.prompt("New name", item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    if (hasSiblingName(items, item.parentId, name, item.id)) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: name.trim(), updatedAt: "Just now" } : entry));
    showToast("Item renamed");
  };
  const deleteItem = (item: StorageItem) => {
    const nestedIds = getStorageDescendantIds(items, item.id);
    const count = nestedIds.size - 1;
    if (!window.confirm(`Delete “${item.name}”${count ? ` and its ${count} item${count === 1 ? "" : "s"}` : ""}? This cannot be undone.`)) return;
    setItems((current) => current.filter((entry) => !nestedIds.has(entry.id)));
    setSelectedIds((current) => current.filter((id) => !nestedIds.has(id)));
    if (folderId && nestedIds.has(folderId)) setFolderId(null);
    showToast("Item deleted");
  };
  const downloadItem = async (item: StorageItem) => {
    try {
      if (item.type === "folder") {
        const archive = await makeFolderArchive(item, items);
        triggerDownload(archive, `${item.name}.zip`);
        return;
      }
      const contentType = item.format === "META" ? "application/json" : item.format === "MP3" ? "audio/mpeg" : "audio/wav";
      const content = new Blob([await getItemBytes(item)], { type: contentType });
      triggerDownload(content, item.audioUrl || item.content?.startsWith("data:") ? item.name : item.name.replace(/\.[^.]+$/, ".wav"));
    } catch (error) {
      console.error(`Unable to download "${item.name}".`, error);
      showToast(`Could not download ${item.name}`);
    }
  };
  const uploadFile = (file?: File) => {
    if (!file) return;
    if (items.some((item) => item.parentId === folderId && item.name.toLowerCase() === file.name.toLowerCase())) {
      showToast("A folder or file with that name already exists here");
      return;
    }
    if (file.size > 2_000_000) {
      showToast("Demo uploads are limited to 2 MB so the file can be saved in this browser");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => showToast("Could not read the selected file");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        showToast("Could not read the selected file");
        return;
      }
      const extension = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
      setItems((current) => [...current, { id: `file-${Date.now()}`, name: file.name, type: "file", parentId: folderId, format: extension, size: file.size, updatedAt: "Just now", color: "blue", content: reader.result as string }]);
      showToast("File uploaded");
    };
    reader.readAsDataURL(file);
  };
  const selectedCount = selectedIds.length;
  return <div className="page-content storage-page storage-manager">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-icon library-eyebrow"><Library size={13} /></span> YOUR FILES & PROJECTS</div><h1>Storage</h1><p>Keep project folders and audio files neat, together, and ready to use.</p></div><div className="storage-heading-actions"><button className="button button-quiet" onClick={createFolder}><FolderPlus size={15} /> New folder</button><label className="button button-dark upload-storage-button"><Upload size={15} /> Upload file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff" onChange={(event) => { uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>
    <div className="storage-stats"><div><span className="stats-icon blue"><FileMusic size={17} /></span><span><small>FILES</small><strong>{files.length} <i>audio files</i></strong></span></div><div><span className="stats-icon lilac"><Folder size={17} /></span><span><small>FOLDERS</small><strong>{folders.length} <i>projects & folders</i></strong></span></div><div><span className="stats-icon peach"><Disc3 size={17} /></span><span><small>STORAGE USED</small><strong>{(usedBytes / 1_000_000).toFixed(1)} <i>MB of 2 GB</i></strong></span></div><button onClick={() => showToast("Your files are saved in this browser")}><span className="storage-health"><Check size={14} /></span> Demo storage</button></div>
    <div className="storage-library storage-manager-panel"><div className="storage-library-head"><div><h2>Project files</h2><span>{visibleItems.length} items</span></div><div className="storage-controls"><label className="storage-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this folder..." /></label><button className="sort-button" onClick={() => setSortDescending((current) => !current)}><SlidersHorizontal size={15} /> {sortDescending ? "Z–A" : "A–Z"} <ChevronDown size={14} /></button></div></div>
      <div className="storage-breadcrumb"><button onClick={() => setFolderId(null)} className={!folderId ? "active" : ""}><Home size={13} /> All files</button>{currentFolder && <><ChevronRight size={13} /><span>{currentFolder.name}</span></>}</div>
      {visibleItems.length ? <div className="storage-table"><div className="storage-table-header"><span><input aria-label="Select all files" type="checkbox" checked={visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id))} onChange={(event) => setSelectedIds(event.target.checked ? visibleItems.map((item) => item.id) : [])} /> NAME</span><span>TYPE</span><span>SIZE</span><span>LAST UPDATED</span><span>ACTIONS</span></div>{visibleItems.map((item) => <div className={`storage-table-row ${selectedIds.includes(item.id) ? "checked" : ""}`} key={item.id}><span className="storage-file-name"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /><button className={`storage-item-icon ${item.type} ${item.color}`} onClick={() => item.type === "folder" && setFolderId(item.id)}>{item.type === "folder" ? <Folder size={17} /> : <FileAudio size={17} />}</button><button className="storage-item-title" onClick={() => item.type === "folder" ? setFolderId(item.id) : downloadItem(item)}><strong>{item.name}</strong>{item.type === "file" && <small>{item.format === "META" ? "Clip metadata" : `${item.format} audio`}</small>}</button></span><span className="storage-type">{item.type === "folder" ? "Folder" : item.format}</span><span className="storage-size">{item.type === "folder" ? `${items.filter((entry) => entry.parentId === item.id).length} items` : fileSize(item.size)}</span><span className="storage-updated">{item.updatedAt}</span><span className="storage-actions">{item.type === "file" && (item.audioUrl || item.content?.startsWith("data:audio/")) && <AudioPreviewButton className="storage-audio-preview" src={item.audioUrl ?? item.content!} name={item.name} />}<button title="Download" aria-label={`Download ${item.name}`} onClick={() => void downloadItem(item)}><Download size={15} /></button><button title="Rename" aria-label={`Rename ${item.name}`} onClick={() => renameItem(item)}><Pencil size={14} /></button><button title="Delete" aria-label={`Delete ${item.name}`} onClick={() => deleteItem(item)}><Trash2 size={14} /></button></span></div>)}</div> : <div className="storage-empty"><span><Folder size={22} /></span><strong>This folder is empty</strong><p>Upload an audio file or create a folder to get started.</p><div><button className="button button-quiet" onClick={createFolder}><FolderPlus size={14} /> New folder</button><label className="button button-primary upload-storage-button"><Upload size={14} /> Upload file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.aiff" onChange={(event) => { uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div></div>}
      {selectedCount > 0 && <div className="storage-bulkbar"><span>{selectedCount} selected</span><button onClick={() => selectedIds.forEach((id) => { const item = items.find((entry) => entry.id === id); if (item) void downloadItem(item); })}><Download size={14} /> Download selected</button><button onClick={() => { const selectedItems = items.filter((item) => selectedIds.includes(item.id)); if (!window.confirm(`Delete ${selectedItems.length} selected items? This cannot be undone.`)) return; const ids = new Set(selectedItems.map((item) => item.id)); setItems((current) => current.filter((item) => !ids.has(item.id))); setSelectedIds([]); showToast("Selected items deleted"); }}><Trash2 size={14} /> Delete selected</button></div>}
    </div>
  </div>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createDemoWav() {
  const sampleRate = 22050;
  const sampleCount = sampleRate;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => Array.from(text).forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  writeText(0, "RIFF"); view.setUint32(4, 36 + sampleCount * 2, true); writeText(8, "WAVE");
  writeText(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeText(36, "data"); view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const envelope = Math.min(1, index / 1100, (sampleCount - index) / 1800);
    view.setInt16(44 + index * 2, Math.sin((2 * Math.PI * 220 * index) / sampleRate) * envelope * 5000, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function DashboardView({ projects, setView, openProject, onCreate, showToast }: { projects: Project[]; setView: (view: View) => void; openProject: (id: string) => void; onCreate: () => void; showToast: (message: string) => void }) {
  return <div className="page-content dashboard-page"><div className="dashboard-welcome"><div><div className="eyebrow"><span className="live-dot" /> WEDNESDAY, NOVEMBER 11</div><h1>Good afternoon, Duc Anh <span>✳</span></h1><p>Ready to make something you haven’t heard before?</p></div><button className="button button-primary" onClick={onCreate}><Plus size={16} /> New project</button></div>
    <div className="dashboard-hero"><div className="hero-copy"><span className="hero-kicker"><Sparkles size={13} /> A SPACE FOR YOUR NEXT IDEA</span><h2>Make room for<br />a little <em>magic.</em></h2><p>Start with a melody, a feeling, or a happy accident. Your next song is waiting.</p><div><button className="button button-primary" onClick={() => setView("workspace")}>Open your workspace <ChevronRight size={15} /></button><button className="hero-text-link" onClick={() => setView("generate")}><Sparkles size={14} /> Make a sound with AI</button></div></div><div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-disc"><span /><i /><b /></div><div className="hero-note note-one">♪</div><div className="hero-note note-two">♫</div><div className="hero-wave">{waveform.slice(0, 25).map((v, i) => <i key={i} style={{ height: `${v}%` }} />)}</div><div className="hero-art-label">MIDNIGHT IN KYOTO <span>01:24</span></div></div></div>
    <div className="dashboard-section-heading"><div><h2>Your projects</h2><p>Pick up where inspiration left off.</p></div><button onClick={() => setView("workspace")}>View all projects <ChevronRight size={14} /></button></div>
    <div className="project-grid">{projects.map((project) => <button key={project.id} className="project-card" onClick={() => openProject(project.id)}><div className={`project-art ${project.color}`}><span className="project-art-icon">{project.icon}</span><span className="project-art-tag">{project.mood}</span><span className="project-art-count"><Music2 size={12} /> {project.tracks} tracks</span><span className="project-art-orb" /></div><div className="project-card-info"><span><strong>{project.name}</strong><small>{project.detail}</small></span><MoreHorizontal size={18} /></div></button>)}</div>
    <div className="dashboard-bottom-grid"><div className="activity-card"><div className="dashboard-section-heading compact"><div><h2>Recent activity</h2><p>The little things you’ve been making.</p></div><button onClick={() => showToast("Showing activity")}>See all</button></div><ActivityRow icon={<Sparkles size={15} />} color="lilac" title="Created a new sound" detail="Warm piano sketch · Midnight in Kyoto" time="12 min ago" /><ActivityRow icon={<Music2 size={15} />} color="mint" title="Added a new track" detail="Soft keys · Midnight in Kyoto" time="Yesterday" /><ActivityRow icon={<Upload size={15} />} color="peach" title="Imported a reference" detail="voice-memo-04.wav · Soft focus" time="2 days ago" /></div><div className="tip-card"><div className="tip-top"><span>✳ A SMALL STUDIO TIP</span><MoreHorizontal size={16} /></div><h3>Try layering a texture<br />under your melody.</h3><p>A soft pad or field recording can make a simple idea feel like a whole world.</p><button onClick={() => setView("generate")}>Make a new sound <ChevronRight size={14} /></button><div className="tip-decoration">♫</div></div></div>
  </div>;
}

function ActivityRow({ icon, color, title, detail, time }: { icon: React.ReactNode; color: string; title: string; detail: string; time: string }) {
  return <div className="activity-row"><span className={`activity-icon ${color}`}>{icon}</span><span className="activity-copy"><strong>{title}</strong><small>{detail}</small></span><span className="activity-time">{time}</span></div>;
}

function Modal({ type, sounds, projects, onClose, onImport, onCreate }: { type: "import" | "project"; sounds: typeof storedSounds; projects: Project[]; onClose: () => void; onImport: (sound: string) => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const [source, setSource] = useState<"sounds" | "projects">("sounds");
  const [projectName, setProjectName] = useState(projects[0].name);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card"><div className="modal-heading"><div><span className="modal-icon">{type === "import" ? <Folder size={17} /> : <Music2 size={17} />}</span><span><strong>{type === "import" ? "Bring in a sound" : "Start a new project"}</strong><small>{type === "import" ? "Choose a sound from your workspace library." : "Every great song starts somewhere."}</small></span></div><button onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
    {type === "import" ? <><div className="import-source-tabs"><button className={source === "sounds" ? "active" : ""} onClick={() => setSource("sounds")}><Library size={13} /> My library</button><button className={source === "projects" ? "active" : ""} onClick={() => setSource("projects")}><Folder size={13} /> Other projects</button></div>{source === "sounds" ? <><div className="modal-search"><Search size={15} /><input placeholder="Search your sounds..." /></div><div className="modal-sound-list">{sounds.slice(0, 4).map((sound) => <button key={sound.name} onClick={() => onImport(sound.name)}><span className={`modal-sound-icon ${sound.color}`}><AudioLines size={15} /></span><span><strong>{sound.name}</strong><small>{sound.type} · {sound.duration}</small></span><Plus size={16} /></button>)}</div></> : <div className="modal-sound-list project-import-list">{projects.map((project) => <button key={project.name} className={projectName === project.name ? "selected" : ""} onClick={() => setProjectName(project.name)}><span className={`project-dot ${project.color}`} /><span><strong>{project.name}</strong><small>{project.tracks} tracks · {project.mood}</small></span>{projectName === project.name && <Check size={15} />}</button>)}</div>}<div className="modal-footer"><span>{source === "projects" ? `Import sounds from ${projectName}` : "Have an audio file?"}</span><input id="audio-file-input" type="file" accept=".wav,.mp3,.m4a,audio/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file.name); }} /><label htmlFor="audio-file-input" className="upload-file-label"><Upload size={14} /> Upload audio</label></div>{source === "projects" && <button className="import-project-cta" onClick={() => onImport(`${projectName} · project sound`)}><Plus size={14} /> Add selected project sounds</button>}</> : <><label className="new-project-label">PROJECT NAME<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Something wonderful..." /></label><div className="project-template"><span className="template-icon"><Music2 size={17} /></span><span><strong>Start from scratch</strong><small>A blank canvas for your next idea</small></span><Check size={15} /></div><div className="modal-actions"><button onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => onCreate(name.trim() || "Untitled project")}>Create project <ChevronRight size={15} /></button></div></>}
  </div></div>;
}
