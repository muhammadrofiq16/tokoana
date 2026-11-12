import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, remember } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email atau password yang Anda masukkan tidak sesuai." },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Email atau password yang Anda masukkan tidak sesuai." },
        { status: 401 }
      );
    }

    const token = await signSessionToken(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      Boolean(remember)
    );

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
      redirect: user.role === "kasir" ? "/kasir" : "/dashboard",
    });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses login." },
      { status: 500 }
    );
  }
}
