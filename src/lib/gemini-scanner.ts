import prisma from "@/lib/prisma";

export interface ScannedInvoiceItem {
  product_name_on_invoice: string;
  matched_product_id: number | null;
  matched_product_name: string | null;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface ScannedInvoiceData {
  supplier_name: string;
  invoice_number: string;
  invoice_date: string;
  items: ScannedInvoiceItem[];
}

export interface ScanResult {
  success: boolean;
  data?: ScannedInvoiceData;
  error?: string;
  model_used?: string;
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
];

export async function scanInvoiceImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ScanResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return {
      success: false,
      error:
        "GEMINI_API_KEY belum dikonfigurasi. Pastikan GEMINI_API_KEY sudah diisi pada file .env dengan kunci API dari Google AI Studio.",
    };
  }

  try {
    // 1. Fetch current product catalog for smart matching
    let catalogList: Array<{
      id: number;
      name: string;
      sku: string;
      barcode: string | null;
      unit: string;
      category: string;
    }> = [];

    try {
      catalogList = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          unit: true,
          category: true,
        },
        orderBy: { name: "asc" },
      });
    } catch (e) {
      console.warn("Could not load product catalog for Gemini:", e);
    }

    const productCatalogJson = JSON.stringify(catalogList);

    // 2. Build system instruction prompt with Indonesian retail context
    const systemInstruction = `Kamu adalah asisten AI ahli dalam membaca dan mengekstrak data dari faktur, nota, kwitansi, dan surat jalan distributor barang toko kelontong / sembako / retail di Indonesia.

TUGAS:
1. Baca dan cermati gambar faktur/nota/surat jalan yang diberikan.
2. Identifikasi informasi utama:
   - Nama supplier / distributor (pabrik atau distributor yang menerbitkan nota)
   - Nomor faktur / surat jalan / no referensi nota
   - Tanggal faktur (format YYYY-MM-DD jika terbaca, atau tanggal hari ini)
3. Ekstrak seluruh daftar item barang:
   - Nama produk persis seperti yang tertera di nota (misal: "INDM GOR SP 85G", "BIMOLI MINYAK 2L", "GULA PS PASIR 1KG", dsb.)
   - Kuantitas / Banyaknya barang (angka integer bulat positif)
   - Satuan barang (Dus, Karton, Bungkus, Pcs, Botol, Pouch, Renceng, Slop, Kg, Kotak, Unit)
   - Catatan tambahan jika ada (misal: "isi 40 bungkus", expired date, dsb.)
4. Cocokkan setiap nama barang pada faktur dengan katalog produk toko berikut menggunakan pencocokan cerdas:

KATALOG PRODUK TOKO:
${productCatalogJson}

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

FORMAT OUTPUT:
Kembalikan hasilnya murni dalam bentuk JSON terstruktur yang valid sesuai skema yang telah ditentukan.`;

    const responseSchema = {
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
                description:
                  "ID produk dari katalog toko yang cocok, atau null jika tidak ditemukan",
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
                description:
                  "Satuan barang: Dus, Karton, Bungkus, Botol, Pouch, Renceng, Slop, Kg, Kotak, atau Unit",
              },
              notes: {
                type: "STRING",
                description:
                  "Catatan tambahan seperti isi per karton, varian, atau expired",
                nullable: true,
              },
            },
            required: ["product_name_on_invoice", "quantity", "unit"],
          },
        },
      },
      required: ["supplier_name", "invoice_number", "items"],
    };

    const base64Data = imageBuffer.toString("base64");

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
                data: base64Data,
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
        responseSchema,
      },
    };

    let lastError = "Tidak ada model yang dapat dihubungi.";
    const uniqueModels = Array.from(new Set(CANDIDATE_MODELS));

    for (const model of uniqueModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const resData = await response.json();
          const generatedText =
            resData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (generatedText) {
            try {
              const parsed = JSON.parse(generatedText) as ScannedInvoiceData;
              return {
                success: true,
                data: parsed,
                model_used: model,
              };
            } catch (jsonErr: any) {
              lastError = `JSON parse error on ${model}: ${jsonErr.message}`;
            }
          }
        } else {
          const body = await response.json().catch(() => null);
          const errorMsg = body?.error?.message || response.statusText;
          lastError = `Model ${model} [${response.status}]: ${errorMsg}`;
          console.warn(`Gemini model ${model} error:`, errorMsg);
        }
      } catch (reqErr: any) {
        lastError = `Koneksi ke ${model} gagal: ${reqErr.message}`;
      }
    }

    return {
      success: false,
      error: `Gagal memproses faktur dengan AI: ${lastError}`,
    };
  } catch (err: any) {
    console.error("Critical error in Gemini Scanner:", err);
    return {
      success: false,
      error: `Terjadi kesalahan saat memproses gambar faktur: ${err.message}`,
    };
  }
}
