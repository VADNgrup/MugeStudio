import { NextResponse } from "next/server";
import { initialLogs } from "../../../../../lib/data/seed";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return NextResponse.json({ data: initialLogs.filter((log) => log.projectId === projectId) });
}
