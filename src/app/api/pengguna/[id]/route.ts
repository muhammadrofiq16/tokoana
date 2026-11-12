import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat mengubah akun." }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID akun tidak valid." }, { status: 400 });
    }

    const { name, email, role, password } = await req.json();

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    // Security check 1: Cannot demote the last remaining admin
    if (targetUser.role === "admin" && role === "kasir") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat mengubah role akun ini menjadi Kasir karena merupakan satu-satunya Admin di sistem." },
          { status: 400 }
        );
      }
    }

    // Email uniqueness check
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail !== targetUser.email) {
      const conflict = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (conflict) {
        return NextResponse.json({ error: "Email sudah digunakan oleh akun lain." }, { status: 400 });
      }
    }

    const updateData: any = {
      name: name.trim(),
      email: cleanEmail,
      role: role === "admin" ? "admin" : "kasir",
    };

    if (password && password.trim().length >= 6) {
      updateData.password = await hashPassword(password);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui akun." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser?.role !== "admin") {
      return NextResponse.json({ error: "Hanya Admin yang dapat menghapus akun." }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID akun tidak valid." }, { status: 400 });
    }

    // Security check 1: Cannot delete currently logged in account
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    }

    // Security check 2: Cannot delete the last admin
    if (targetUser.role === "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat menghapus akun ini karena merupakan satu-satunya Admin di sistem." },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true, message: `Akun '${targetUser.name}' berhasil dihapus.` });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus akun." }, { status: 500 });
  }
}
