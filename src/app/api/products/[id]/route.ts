import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Admin yang dapat mengubah barang." }, { status: 403 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID barang tidak valid." }, { status: 400 });
    }

    const body = await req.json();
    const {
      sku,
      barcode,
      name,
      category,
      stock,
      minStock,
      unit,
      costPrice,
      expiryDate,
      supplierName,
      units = [],
    } = body;

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    }

    if (sku && sku !== existing.sku) {
      const conflict = await prisma.product.findUnique({ where: { sku } });
      if (conflict) {
        return NextResponse.json({ error: `SKU '${sku}' sudah digunakan oleh barang lain.` }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id: productId },
        data: {
          sku: sku.trim(),
          barcode: barcode ? barcode.trim() : null,
          name: name.trim(),
          category: category.trim(),
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 5,
          unit: unit.trim(),
          costPrice: Number(costPrice) || 0,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          supplierName: supplierName ? supplierName.trim() : null,
        },
      });

      // Synchronize units
      const keepUnitIds: number[] = [];

      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        if (u.id) {
          // Update existing unit
          const existingUnit = await tx.productUnit.findUnique({ where: { id: Number(u.id) } });
          if (existingUnit && existingUnit.productId === productId) {
            await tx.productUnit.update({
              where: { id: existingUnit.id },
              data: {
                unitName: u.unitName.trim(),
                conversionFactor: Number(u.conversionFactor) || 1,
                sortOrder: i,
              },
            });

            await tx.priceTier.upsert({
              where: { productUnitId: existingUnit.id },
              update: {
                priceRetail: Number(u.priceRetail) || 0,
                priceWholesale: Number(u.priceWholesale) || 0,
                minWholesaleQty: Number(u.minWholesaleQty) || 1,
              },
              create: {
                productUnitId: existingUnit.id,
                priceRetail: Number(u.priceRetail) || 0,
                priceWholesale: Number(u.priceWholesale) || 0,
                minWholesaleQty: Number(u.minWholesaleQty) || 1,
              },
            });

            keepUnitIds.push(existingUnit.id);
          }
        } else {
          // Create new unit
          const createdUnit = await tx.productUnit.create({
            data: {
              productId,
              unitName: u.unitName.trim(),
              conversionFactor: Number(u.conversionFactor) || 1,
              sortOrder: i,
            },
          });

          await tx.priceTier.create({
            data: {
              productUnitId: createdUnit.id,
              priceRetail: Number(u.priceRetail) || 0,
              priceWholesale: Number(u.priceWholesale) || 0,
              minWholesaleQty: Number(u.minWholesaleQty) || 1,
            },
          });

          keepUnitIds.push(createdUnit.id);
        }
      }

      // Delete units removed by the user
      await tx.productUnit.deleteMany({
        where: {
          productId,
          id: { notIn: keepUnitIds },
        },
      });

      return prod;
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui barang." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Admin yang dapat menghapus barang." }, { status: 403 });
    }

    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID barang tidak valid." }, { status: 400 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true, message: "Barang berhasil dihapus." });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus barang." }, { status: 500 });
  }
}
