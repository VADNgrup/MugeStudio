import { apiEndpoints } from "./endpoints";
import type { Project, ProjectLog, StorageItem } from "../types";

type DataResponse<T> = { data: T };

async function getData<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${endpoint}`);
  const payload = await response.json() as DataResponse<T>;
  if (!("data" in payload)) throw new Error(`Unexpected API response from ${endpoint}`);
  return payload.data;
}

export const studioApi = {
  getProjects: () => getData<Project[]>(apiEndpoints.projects),
  getProject: (projectId: string) => getData<Project>(apiEndpoints.project(projectId)),
  getStorageItems: () => getData<StorageItem[]>(apiEndpoints.storage),
  getProjectLogs: (projectId: string) => getData<ProjectLog[]>(apiEndpoints.projectLogs(projectId)),
};
