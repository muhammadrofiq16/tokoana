import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ code: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const { code } = await params;
    const cleanCode = decodeURIComponent(code).trim();

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ barcode: cleanCode }, { sku: cleanCode }],
      },
      include: {
        units: {
          include: { priceTier: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: `Barang dengan barcode/SKU '${cleanCode}' tidak ditemukan.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat mencari barcode." },
      { status: 500 }
    );
  }
}
