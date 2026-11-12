import prisma from "./prisma";

export interface ScannedItem {
  product_name_on_invoice: string;
  matched_product_id: number | null;
  matched_product_name: string | null;
  matched_product_sku?: string | null;
  matched_product_stock?: number | null;
  quantity: number;
  unit: string;
  notes?: string | null;
}

export interface InvoiceScanResult {
  success: boolean;
  data?: {
    supplier_name: string;
    invoice_number: string;
    invoice_date?: string;
    items: ScannedItem[];
  };
  model_used?: string;
  error?: string;
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    supplier_name: {
      type: "STRING",
      description: "Nama supplier/distributor pada faktur",
    },
    invoice_number: {
      type: "STRING",
      description: "Nomor faktur/invoice/surat jalan",
    },
    invoice_date: {
      type: "STRING",
      description: "Tanggal faktur dalam format YYYY-MM-DD",
    },
    items: {
      type: "ARRAY",
      description: "Daftar barang pada faktur",
      items: {
        type: "OBJECT",
        properties: {
          product_name_on_invoice: {
            type: "STRING",
            description: "Nama produk persis seperti tertulis di faktur",
          },
          matched_product_id: {
            type: "INTEGER",
            description: "ID produk dari katalog toko yang cocok, atau null jika tidak ditemukan",
            nullable: true,
          },
          matched_product_name: {
            type: "STRING",
            description: "Nama produk dari katalog yang cocok",
            nullable: true,
          },
          quantity: {
            type: "INTEGER",
            description: "Jumlah kuantitas barang",
          },
          unit: {
            type: "STRING",
            description: "Satuan barang: Dus, Karton, Bungkus, Botol, Pouch, Renceng, Slop, Kg, Kotak, atau Unit",
          },
          notes: {
            type: "STRING",
            description: "Catatan tambahan seperti isi per karton, varian, atau expired",
            nullable: true,
          },
        },
        required: ["product_name_on_invoice", "quantity", "unit"],
      },
    },
  },
  required: ["supplier_name", "invoice_number", "items"],
};

export async function scanInvoiceImage(
  base64Image: string,
  mimeType: string
): Promise<InvoiceScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY belum dikonfigurasi di file .env.local.",
    };
  }

  // Load product catalog for matching
  let catalogSummary = "[]";
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        unit: true,
        category: true,
        stock: true,
      },
      orderBy: { name: "asc" },
    });
    catalogSummary = JSON.stringify(products);
  } catch (dbError) {
    console.warn("Could not load products for Gemini context:", dbError);
  }

  const systemInstruction = `Kamu adalah asisten AI ahli dalam membaca dan mengekstrak data dari faktur, nota, kwitansi, dan surat jalan distributor barang toko kelontong / sembako / retail di Indonesia.

TUGAS:
1. Baca dan cermati gambar faktur/nota/surat jalan yang diberikan.
2. Identifikasi informasi utama:
   - Nama supplier / distributor (pabrik atau distributor yang menerbitkan nota)
   - Nomor faktur / surat jalan / no referensi nota
   - Tanggal faktur (format YYYY-MM-DD jika terbaca)
3. Ekstrak seluruh daftar item barang:
   - Nama produk persis seperti yang tertera di nota
   - Kuantitas / Banyaknya barang (angka integer bulat positif)
   - Satuan barang (Dus, Karton, Bungkus, Pcs, Botol, Pouch, Renceng, Slop, Kg, Kotak, Unit)
   - Catatan tambahan jika ada (misal: "isi 40 bungkus", expired date, dsb.)
4. Cocokkan setiap nama barang pada faktur dengan katalog produk toko berikut menggunakan fuzzy matching cerdas:

KATALOG PRODUK TOKO:
${catalogSummary}

ATURAN PENCOCOKAN PRODUK:
- Jika produk di faktur cocok dengan produk di katalog (>70% kemiripan nama / varian), isi "matched_product_id" dengan ID produk katalog tersebut.
- Jika tidak yakin atau produk belum ada di katalog toko, isi "matched_product_id" dengan null.
- Singkatan distributor umum:
  * INDM / IND / IDM = Indomie / Indo
  * GOR / GRG = Goreng
  * KRG / KARI = Kari
  * AYM = Ayam
  * BWW = Bawang
  * SP / SPC = Special
  * MNK / MYK = Minyak
  * BML = Bimoli
  * POUCH / PCH = Pouch
  * BTL = Botol
  * BKS / BKG = Bungkus
  * RCG / REN = Renceng
  * DUS / KRT / CTN = Dus (Karton)

Kembalikan hasilnya dalam bentuk JSON terstruktur yang valid sesuai skema yang telah ditentukan.`;

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
          {
            text: "Analisis faktur/nota/surat jalan pada gambar ini. Ekstrak seluruh data barang, kuantitas, satuan, distributor, dan nomor faktur. Cocokkan setiap nama barang dengan katalog produk toko yang tersedia. Kembalikan hasilnya dalam format JSON sesuai skema yang diberikan.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const modelsToTry = Array.from(new Set(CANDIDATE_MODELS));
  let lastError = "Gagal menghubungi server Gemini AI.";

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);

          // Enrich with product sku & stock if matched
          if (parsed.items && Array.isArray(parsed.items)) {
            const matchedIds = parsed.items
              .map((i: ScannedItem) => i.matched_product_id)
              .filter(Boolean) as number[];

            if (matchedIds.length > 0) {
              const matchedProducts = await prisma.product.findMany({
                where: { id: { in: matchedIds } },
                select: { id: true, sku: true, stock: true },
              });
              const map = new Map(matchedProducts.map((p) => [p.id, p]));
              for (const item of parsed.items) {
                if (item.matched_product_id && map.has(item.matched_product_id)) {
                  const p = map.get(item.matched_product_id)!;
                  item.matched_product_sku = p.sku;
                  item.matched_product_stock = p.stock;
                }
              }
            }
          }

          return {
            success: true,
            data: parsed,
            model_used: model,
          };
        }
      }

      const status = response.status;
      const errorJson = await response.json().catch(() => ({}));
      lastError = `Model ${model} status ${status}: ${errorJson.error?.message || response.statusText}`;
    } catch (err: unknown) {
      lastError = `Koneksi ke ${model} gagal: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    success: false,
    error: lastError,
  };
}
