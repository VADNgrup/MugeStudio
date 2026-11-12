import { NextResponse } from "next/server";
import { initialProjects } from "../../../../lib/data/seed";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = initialProjects.find((item) => item.id === projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ data: project });
}
