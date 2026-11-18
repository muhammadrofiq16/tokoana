import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category && category !== "Semua Kategori") {
      where.category = category;
    }

    // Note: Prisma doesn't support column-to-column comparisons in where clauses.
    // "aman" and "menipis" are filtered in-memory after fetching.
    if (status === "habis") {
      where.stock = 0;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        units: {
          include: { priceTier: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Apply column-to-column status filters in JS
    let filtered = products;
    if (status === "aman") {
      filtered = products.filter((p) => p.stock > p.minStock);
    } else if (status === "menipis") {
      filtered = products.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Gagal mengambil data produk." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return NextResponse.json({ error: "Akses ditolak: Hanya Admin yang dapat menambah barang." }, { status: 403 });
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

    if (!sku || !name || !category || !unit) {
      return NextResponse.json({ error: "SKU, Nama Barang, Kategori, dan Satuan Dasar wajib diisi." }, { status: 400 });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) {
      return NextResponse.json({ error: `SKU '${sku}' sudah digunakan oleh barang lain.` }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
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

      // Ensure at least base unit exists
      const unitList = units.length > 0 ? units : [
        {
          unitName: unit,
          conversionFactor: 1,
          priceRetail: 0,
          priceWholesale: 0,
          minWholesaleQty: 1,
        },
      ];

      for (let i = 0; i < unitList.length; i++) {
        const u = unitList[i];
        const createdUnit = await tx.productUnit.create({
          data: {
            productId: product.id,
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
      }

      return product;
    });

    return NextResponse.json({ success: true, product: result });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ error: error.message || "Gagal menyimpan barang baru." }, { status: 500 });
  }
}
