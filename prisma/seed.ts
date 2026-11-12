import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seeding database Toko Ana...");

  // 1. Seed Users (Admin & Kasir)
  const passwordHash = await bcrypt.hash("password", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@toko.com" },
    update: {
      name: "Administrator Toko",
      role: "admin",
      password: passwordHash,
    },
    create: {
      email: "admin@toko.com",
      name: "Administrator Toko",
      role: "admin",
      password: passwordHash,
    },
  });

  const kasir = await prisma.user.upsert({
    where: { email: "kasir@toko.com" },
    update: {
      name: "Kasir 1",
      role: "kasir",
      password: passwordHash,
    },
    create: {
      email: "kasir@toko.com",
      name: "Kasir 1",
      role: "kasir",
      password: passwordHash,
    },
  });

  console.log(`✅ Users seeded: ${admin.email} (Admin), ${kasir.email} (Kasir)`);

  // 2. Seed Settings
  const settings = [
    { key: "store_name", value: "Toko Berkah Kelontong" },
    { key: "store_status", value: "Buka (Operasional Normal)" },
    { key: "cashier_name", value: "Budi Santoso" },
    { key: "work_shift", value: "Kasir Shift 1 (Pagi)" },
    { key: "shift", value: "Kasir Shift 1 (Pagi)" },
    { key: "store_address", value: "Jl. Raya Pasar Minggu No. 45, Jakarta Selatan" },
    { key: "store_phone", value: "0812-9876-5432" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Settings seeded");

  // 3. Seed Customers
  const customers = [
    { name: "Pelanggan Umum", phone: "081200000000", type: "retail", notes: "Pelanggan Harian" },
    { name: "Warung Bu Siti", phone: "085712345678", type: "reseller", notes: "Mitra Warung Sembako" },
    { name: "Toko Rejeki Grosir", phone: "081987654321", type: "reseller", notes: "Mitra Toko Kelontong" },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }
  console.log("✅ Customers seeded");

  // 4. Seed Products with Multi-Satuan & Price Tiers
  const products = [
    {
      sku: "BRG-001",
      barcode: "089686010015",
      name: "Indomie Mi Goreng 85g",
      category: "Makanan",
      stock: 120,
      minStock: 20,
      unit: "Bungkus",
      costPrice: 2750,
      supplierName: "PT Indomarco Adi Prima",
      units: [
        {
          unitName: "Bungkus",
          conversionFactor: 1,
          sortOrder: 0,
          priceRetail: 3500,
          priceWholesale: 3200,
          minWholesaleQty: 5,
        },
        {
          unitName: "Dus (40 Bks)",
          conversionFactor: 40,
          sortOrder: 1,
          priceRetail: 125000,
          priceWholesale: 120000,
          minWholesaleQty: 1,
        },
      ],
    },
    {
      sku: "BRG-014",
      barcode: "899277511201",
      name: "Bimoli Minyak Goreng Pouch 2L",
      category: "Sembako",
      stock: 24,
      minStock: 6,
      unit: "Pouch",
      costPrice: 33200,
      supplierName: "PT Salim Jaya",
      units: [
        {
          unitName: "Pouch",
          conversionFactor: 1,
          sortOrder: 0,
          priceRetail: 36500,
          priceWholesale: 35000,
          minWholesaleQty: 3,
        },
        {
          unitName: "Dus (6 Pouch)",
          conversionFactor: 6,
          sortOrder: 1,
          priceRetail: 215000,
          priceWholesale: 210000,
          minWholesaleQty: 1,
        },
      ],
    },
    {
      sku: "BRG-082",
      barcode: "899307711019",
      name: "Teh Pucuk Harum 350ml",
      category: "Minuman",
      stock: 48,
      minStock: 24,
      unit: "Botol",
      costPrice: 3000,
      supplierName: "PT Mayora Indah",
      units: [
        {
          unitName: "Botol",
          conversionFactor: 1,
          sortOrder: 0,
          priceRetail: 4000,
          priceWholesale: 3500,
          minWholesaleQty: 6,
        },
        {
          unitName: "Dus (24 Btl)",
          conversionFactor: 24,
          sortOrder: 1,
          priceRetail: 82000,
          priceWholesale: 80000,
          minWholesaleQty: 1,
        },
      ],
    },
    {
      sku: "BRG-025",
      barcode: "899100210251",
      name: "Gula Pasir Gulaku 1kg",
      category: "Sembako",
      stock: 50,
      minStock: 10,
      unit: "Bungkus",
      costPrice: 16000,
      supplierName: "PT Sugar Group",
      units: [
        {
          unitName: "Bungkus",
          conversionFactor: 1,
          sortOrder: 0,
          priceRetail: 18500,
          priceWholesale: 17500,
          minWholesaleQty: 5,
        },
        {
          unitName: "Karung (20 Bks)",
          conversionFactor: 20,
          sortOrder: 1,
          priceRetail: 355000,
          priceWholesale: 345000,
          minWholesaleQty: 1,
        },
      ],
    },
    {
      sku: "BRG-050",
      barcode: "899274191012",
      name: "Kopi Kapal Api Spesial Mix 10x24g",
      category: "Kopi & Teh",
      stock: 30,
      minStock: 10,
      unit: "Renceng",
      costPrice: 12500,
      supplierName: "PT Santos Jaya Abadi",
      units: [
        {
          unitName: "Renceng",
          conversionFactor: 1,
          sortOrder: 0,
          priceRetail: 14500,
          priceWholesale: 13500,
          minWholesaleQty: 3,
        },
        {
          unitName: "Dus (10 Renceng)",
          conversionFactor: 10,
          sortOrder: 1,
          priceRetail: 138000,
          priceWholesale: 132000,
          minWholesaleQty: 1,
        },
      ],
    },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          sku: p.sku,
          barcode: p.barcode,
          name: p.name,
          category: p.category,
          stock: p.stock,
          minStock: p.minStock,
          unit: p.unit,
          costPrice: p.costPrice,
          supplierName: p.supplierName,
        },
      });

      for (const u of p.units) {
        const unit = await prisma.productUnit.create({
          data: {
            productId: created.id,
            unitName: u.unitName,
            conversionFactor: u.conversionFactor,
            sortOrder: u.sortOrder,
          },
        });

        await prisma.priceTier.create({
          data: {
            productUnitId: unit.id,
            priceRetail: u.priceRetail,
            priceWholesale: u.priceWholesale,
            minWholesaleQty: u.minWholesaleQty,
          },
        });
      }
    }
  }

  console.log(`✅ ${products.length} Products with multi-tier pricing seeded`);
  console.log("🎉 Seeding selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
