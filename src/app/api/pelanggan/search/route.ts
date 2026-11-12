import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
      },
      orderBy: { name: "asc" },
      take: 10,
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error searching customers:", error);
    return NextResponse.json({ error: "Failed to search customers" }, { status: 500 });
  }
}
