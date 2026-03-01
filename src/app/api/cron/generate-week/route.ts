import { NextRequest, NextResponse } from "next/server";
import { generateWeek } from "@/lib/week-generator";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateWeek();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate week";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
