import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const userName = user?.name || "Petugas Toko";

    const body = await req.json();
    const { supplierName, invoiceNumber = "", items } = body;

    if (!supplierName) {
      return NextResponse.json({ error: "Nama supplier wajib diisi." }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Minimal 1 barang harus dipilih untuk disimpan." }, { status: 400 });
    }

    const savedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const item of items) {
        const productId = Number(item.productId);
        const qty = Number(item.quantity);
        if (!productId || qty <= 0) continue;

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) continue;

        // Increment stock
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: qty } },
        });

        // Record stock movement
        const notes = `Faktur: ${invoiceNumber || "Tanpa No"}${item.notes ? ` • ${item.notes}` : ""}`.trim();

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "in",
            quantity: qty,
            unit: item.unit || product.unit,
            sourceCategory: `Supplier: ${supplierName}`,
            notes: notes || null,
            userName,
          },
        });

        count++;
      }
      return count;
    });

    return NextResponse.json({
      success: true,
      count: savedCount,
      message: `Faktur berhasil diproses! ${savedCount} barang dari ${supplierName} telah ditambahkan ke stok.`,
    });
  } catch (error: any) {
    console.error("Batch store stock error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan batch faktur." }, { status: 500 });
  }
}
