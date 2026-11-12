import { NextResponse } from "next/server";
import { scanInvoiceImage } from "@/lib/gemini-scanner";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("invoice_image") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Silakan pilih foto faktur terlebih dahulu." },
        { status: 400 }
      );
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Ukuran file foto maksimal 10MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const result = await scanInvoiceImage(base64, mimeType);

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.error || "Gagal memproses faktur dengan AI." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      model_used: result.model_used,
    });
  } catch (error: any) {
    console.error("Scan invoice error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan sistem saat memproses faktur." },
      { status: 500 }
    );
  }
}
