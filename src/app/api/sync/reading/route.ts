import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });
  const position = await db.readingPosition.findUnique({
    where: { userId: user.userId },
  });
  return NextResponse.json({ position });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { surahNumber, surahName, ayahNumber, ayahIndex } = await req.json();
  const position = await db.readingPosition.upsert({
    where: { userId: user.userId },
    create: { userId: user.userId, surahNumber, surahName, ayahNumber, ayahIndex },
    update: { surahNumber, surahName, ayahNumber, ayahIndex },
  });

  return NextResponse.json({ success: true, position });
}
