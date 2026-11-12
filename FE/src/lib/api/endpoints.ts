export const apiEndpoints = {
  projects: "/api/projects",
  project: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}`,
  projectLogs: (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/logs`,
  storage: "/api/storage",
} as const;
