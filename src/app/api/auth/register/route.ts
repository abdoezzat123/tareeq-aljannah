import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" }, { status: 400 });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "هذا البريد مسجل بالفعل" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email: normalizedEmail, passwordHash, name: name || null },
    });
    await setSessionCookie({ userId: user.id, email: user.email, name: user.name });
    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء التسجيل" }, { status: 500 });
  }
}
