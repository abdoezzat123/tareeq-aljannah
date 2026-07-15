import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });
  const settings = await db.userData.findMany({
    where: { userId: user.userId },
  });
  const result: Record<string, string> = {};
  settings.forEach((s) => { result[s.key] = s.value; });
  return NextResponse.json({ settings: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "غير مسجل الدخول" }, { status: 401 });

  const { key, value } = await req.json();
  await db.userData.upsert({
    where: { userId_key: { userId: user.userId, key } },
    create: { userId: user.userId, key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });

  return NextResponse.json({ success: true });
}
