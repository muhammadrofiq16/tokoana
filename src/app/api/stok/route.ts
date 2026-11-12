import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all";

    const where: any = {};
    if (filter === "in") {
      where.type = "in";
    } else if (filter === "out") {
      where.type = { in: ["out", "damaged", "return"] };
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: true },
      orderBy: { id: "desc" },
      take: 50,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Fetch stock movements error:", error);
    return NextResponse.json({ error: "Gagal mengambil riwayat mutasi stok." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const userName = user?.name || "Petugas Toko";

    const body = await req.json();
    const { productId, type, quantity, unit, sourceCategory, notes } = body;

    const prodId = Number(productId);
    const qty = Number(quantity);

    if (!prodId || !type || qty <= 0) {
      return NextResponse.json({ error: "Produk, tipe mutasi, dan kuantitas wajib diisi." }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: prodId } });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update product stock
      if (type === "in") {
        await tx.product.update({
          where: { id: prodId },
          data: { stock: { increment: qty } },
        });
      } else {
        await tx.product.update({
          where: { id: prodId },
          data: { stock: { decrement: Math.min(product.stock, qty) } },
        });
      }

      // Record movement
      return await tx.stockMovement.create({
        data: {
          productId: prodId,
          type,
          quantity: qty,
          unit: unit || product.unit,
          sourceCategory: sourceCategory || "Manual Adjustment",
          notes: notes || null,
          userName,
        },
      });
    });

    return NextResponse.json({ success: true, movement: result });
  } catch (error: any) {
    console.error("Create stock movement error:", error);
    return NextResponse.json({ error: error.message || "Gagal mencatat mutasi stok." }, { status: 500 });
  }
}
