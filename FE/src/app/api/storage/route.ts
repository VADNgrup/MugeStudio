import { NextResponse } from "next/server";
import { initialStorageItems } from "../../../lib/data/seed";

export function GET() {
  return NextResponse.json({ data: initialStorageItems });
}
