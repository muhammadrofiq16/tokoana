import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: PageProps) {
  const { id } = await params;
  const transactionId = parseInt(id, 10);

  if (isNaN(transactionId)) {
    notFound();
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      items: true,
      customer: true,
    },
  });

  if (!transaction) {
    notFound();
  }

  // Load store settings
  const settings = await prisma.setting.findMany();
  const map = new Map(settings.map((s) => [s.key, s.value]));
  const storeName = map.get("store_name") || "Toko Berkah Kelontong";
  const storeAddress = map.get("store_address") || "Jl. Raya Pasar Minggu No. 45, Jakarta Selatan";
  const storePhone = map.get("store_phone") || "0812-9876-5432";

  return (
    <div className="max-w-md mx-auto py-6">
      {/* Non-print action header */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Link
          href="/kasir"
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Kasir</span>
        </Link>

        <div className="flex items-center gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Printable Thermal Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Receipt Success Banner for Screen */}
        <div className="print:hidden bg-emerald-600 p-4 text-white text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="text-xs font-bold">Transaksi Berhasil Disimpan</span>
        </div>

        {/* Thermal Print Content */}
        <div className="p-8 font-mono text-xs text-slate-800 leading-relaxed space-y-4 print:p-0">
          {/* Store Info */}
          <div className="text-center space-y-1">
            <h2 className="font-black text-base uppercase tracking-tight">{storeName}</h2>
            <p className="text-[11px] text-slate-600">{storeAddress}</p>
            <p className="text-[11px] text-slate-600">Telp: {storePhone}</p>
          </div>

          <div className="border-t border-dashed border-slate-300"></div>

          {/* Transaction Metadata */}
          <div className="text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Nota:</span>
              <span className="font-bold">{transaction.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal:</span>
              <span>{formatDate(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span>{transaction.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pelanggan:</span>
              <span>{transaction.customerName || "Pelanggan Umum"} ({transaction.saleMode.toUpperCase()})</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300"></div>

          {/* Line Items */}
          <div className="space-y-2">
            {transaction.items.map((item) => (
              <div key={item.id}>
                <p className="font-bold text-[11px] text-slate-900">{item.productName}</p>
                <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                  <span>
                    {item.quantity} {item.unit} x {formatRupiah(Number(item.unitPrice))}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(Number(item.subtotal))}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-300"></div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between font-bold text-sm text-slate-900 pt-1">
              <span>TOTAL</span>
              <span>{formatRupiah(Number(transaction.totalAmount))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Metode Bayar:</span>
              <span className="font-semibold">{transaction.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Uang Diterima:</span>
              <span>{formatRupiah(Number(transaction.paidAmount))}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Kembalian:</span>
              <span className="font-bold text-slate-900">{formatRupiah(Number(transaction.changeAmount))}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-slate-300"></div>

          {/* Receipt Footer */}
          <div className="text-center space-y-1 pt-2 text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">*** TERIMA KASIH ATAS KUNJUNGAN ANDA ***</p>
            <p>Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan</p>
            <p className="text-[9px] pt-1">Sistem POS Toko Ana v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
