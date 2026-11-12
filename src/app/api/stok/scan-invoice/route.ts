import { NextResponse } from "next/server";
import { scanInvoiceImage } from "@/lib/gemini-scanner";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sesi telah berakhir. Silakan login kembali." },
        { status: 401 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    let imageBuffer: Buffer;
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json(
          { error: "File gambar faktur tidak ditemukan." },
          { status: 400 }
        );
      }

      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      const json = await req.json();
      if (!json.image) {
        return NextResponse.json(
          { error: "Data gambar (base64) tidak ditemukan." },
          { status: 400 }
        );
      }

      mimeType = json.mimeType || "image/jpeg";
      const base64Data = json.image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      imageBuffer = Buffer.from(base64Data, "base64");
    }

    const result = await scanInvoiceImage(imageBuffer, mimeType);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal memindai gambar faktur." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      modelUsed: result.model_used,
    });
  } catch (error: any) {
    console.error("API Scan Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan server saat memindai faktur." },
      { status: 500 }
    );
  }
}
