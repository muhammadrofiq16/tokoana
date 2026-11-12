import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPriceFor } from "@/lib/pricing";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const cashierName = user?.name || "Kasir Toko";

    const body = await req.json();
    const {
      items,
      paymentMethod = "Tunai",
      paidAmount: rawPaidAmount = 0,
      saleMode = "eceran",
      customerId = null,
      customerName = null,
      notes = null,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Keranjang belanja kosong." }, { status: 400 });
    }

    // Resolve customer
    let resolvedCustomerName = customerName || "Pelanggan Umum";
    let customerType: string | null = null;

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: Number(customerId) },
      });
      if (customer) {
        resolvedCustomerName = customer.name;
        customerType = customer.type;
      }
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate collision-proof invoice number
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayPrefix = `INV-${yyyy}${mm}${dd}-`;

      const lastTrans = await tx.transaction.findFirst({
        where: { invoiceNumber: { startsWith: todayPrefix } },
        orderBy: { id: "desc" },
      });

      let seq = 1;
      if (lastTrans) {
        const lastSeq = parseInt(lastTrans.invoiceNumber.replace(todayPrefix, ""), 10);
        if (!isNaN(lastSeq)) {
          seq = lastSeq + 1;
        }
      }

      let invoiceNumber = `${todayPrefix}${String(seq).padStart(4, "0")}`;
      while (await tx.transaction.findUnique({ where: { invoiceNumber } })) {
        seq++;
        invoiceNumber = `${todayPrefix}${String(seq).padStart(4, "0")}`;
      }

      // 2. Process cart items
      let totalAmount = 0;
      const itemsToCreate: Array<{
        productId: number;
        productName: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of items) {
        const productId = Number(item.productId);
        const qty = Number(item.quantity) || 1;
        if (qty <= 0) continue;

        const product = await tx.product.findUnique({
          where: { id: productId },
          include: {
            units: {
              include: { priceTier: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        });

        if (!product) continue;

        // Find selected unit or fallback to base unit
        let selectedUnit = product.units.find((u) => u.id === Number(item.unitId));
        if (!selectedUnit) {
          selectedUnit = product.units[0];
        }

        if (!selectedUnit) continue;

        const unitPrice = getPriceFor(
          selectedUnit.priceTier,
          saleMode as "eceran" | "grosir",
          qty,
          customerType
        );

        const subtotal = unitPrice * qty;
        totalAmount += subtotal;

        const stockDeduct = qty * selectedUnit.conversionFactor;

        // Check stock availability
        if (product.stock < stockDeduct) {
          throw new Error(
            `Stok barang '${product.name}' tidak mencukupi. Sisa stok: ${product.stock} ${product.unit}, dibutuhkan: ${stockDeduct} ${product.unit}.`
          );
        }

        itemsToCreate.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unit: selectedUnit.unitName,
          unitPrice,
          subtotal,
        });

        // Deduct base stock
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: stockDeduct } },
        });

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "sale",
            quantity: stockDeduct,
            unit: product.unit,
            sourceCategory: `Kasir POS - ${saleMode === "grosir" ? "Grosir" : "Eceran"}`,
            notes: `Struk ${invoiceNumber} (${qty} ${selectedUnit.unitName})`,
            userName: cashierName,
          },
        });
      }

      if (itemsToCreate.length === 0) {
        throw new Error("Tidak ada item barang valid untuk diproses.");
      }

      // 3. Payment amounts
      let paidAmount = Number(rawPaidAmount) || 0;
      if (paymentMethod === "Transfer" || paidAmount <= 0) {
        paidAmount = totalAmount;
      }

      const changeAmount = Math.max(0, paidAmount - totalAmount);

      // 4. Create transaction
      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          paymentMethod,
          totalAmount,
          paidAmount,
          changeAmount,
          cashierName,
          customerName: resolvedCustomerName,
          customerId: customerId ? Number(customerId) : null,
          saleMode: customerType === "reseller" || saleMode === "grosir" ? "grosir" : "eceran",
          status: "success",
          notes,
          items: {
            create: itemsToCreate,
          },
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      invoiceNumber: result.invoiceNumber,
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses transaksi kasir." },
      { status: 400 }
    );
  }
}
