import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });
  const logs = await db.tasbihLog.findMany({
    where: { userId: user.userId },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { date, counts, total } = await req.json();
  const data = { counts: JSON.stringify(counts), total };
  const existing = await db.tasbihLog.findUnique({
    where: { userId_date: { userId: user.userId, date } },
  });

  if (existing) {
    const updated = await db.tasbihLog.update({ where: { id: existing.id }, data });
    return NextResponse.json({ success: true, log: updated });
  } else {
    const created = await db.tasbihLog.create({
      data: { userId: user.userId, date, ...data },
    });
    return NextResponse.json({ success: true, log: created });
  }
}
