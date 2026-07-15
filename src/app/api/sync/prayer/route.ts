import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });
  const logs = await db.prayerLog.findMany({
    where: { userId: user.userId },
    orderBy: { date: "desc" },
    take: 30,
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { date, prayer, prayed } = await req.json();
  const existing = await db.prayerLog.findUnique({
    where: { userId_date: { userId: user.userId, date } },
  });

  if (existing) {
    const updated = await db.prayerLog.update({
      where: { id: existing.id },
      data: { [prayer]: prayed },
    });
    return NextResponse.json({ success: true, log: updated });
  } else {
    const created = await db.prayerLog.create({
      data: { userId: user.userId, date, [prayer]: prayed },
    });
    return NextResponse.json({ success: true, log: created });
  }
}
