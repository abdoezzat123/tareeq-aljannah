import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });
  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookmarks });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { surahNumber, ayahNumber, surahName, action } = await req.json();

  if (action === "add") {
    try {
      const bookmark = await db.bookmark.create({
        data: { userId: user.userId, surahNumber, ayahNumber, surahName },
      });
      return NextResponse.json({ success: true, bookmark });
    } catch {
      return NextResponse.json({ success: true, exists: true });
    }
  } else if (action === "remove") {
    await db.bookmark.deleteMany({
      where: { userId: user.userId, surahNumber, ayahNumber },
    });
    return NextResponse.json({ success: true });
  } else if (action === "sync") {
    const { bookmarks } = await req.json();
    await db.bookmark.deleteMany({ where: { userId: user.userId } });
    if (bookmarks && bookmarks.length > 0) {
      await db.bookmark.createMany({
        data: bookmarks.map((b: { surahNumber: number; ayahNumber: number; surahName: string }) => ({
          userId: user.userId, surahNumber: b.surahNumber, ayahNumber: b.ayahNumber, surahName: b.surahName,
        })),
      });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
}
