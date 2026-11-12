import { NextResponse } from "next/server";
import { initialProjects } from "../../../lib/data/seed";

export function GET() {
  return NextResponse.json({ data: initialProjects });
}
