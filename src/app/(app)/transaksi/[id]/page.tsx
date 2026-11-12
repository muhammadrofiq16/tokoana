import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, ShoppingBag, User, CheckCircle2, FileText } from "lucide-react";
import prisma from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const transactionId = parseInt(id, 10);
  if (isNaN(transactionId)) notFound();

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      items: true,
      customer: true,
    },
  });

  if (!transaction) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/transaksi"
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Riwayat</span>
        </Link>

        <Link
          href={`/kasir/receipt/${transaction.id}`}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Struk Kasir</span>
        </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-base text-emerald-400">
                {transaction.invoiceNumber}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-500/30">
                {transaction.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Waktu Transaksi: {formatDate(transaction.createdAt)}</p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Total Transaksi</span>
            <span className="text-2xl font-black text-white">
              {formatRupiah(Number(transaction.totalAmount))}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100 bg-slate-50/50 text-xs">
          <div>
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Petugas Kasir</span>
            <span className="font-extrabold text-slate-800">{transaction.cashierName}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Pelanggan</span>
            <span className="font-extrabold text-slate-800">{transaction.customerName || "Pelanggan Umum"}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Mode Transaksi</span>
            <span className="font-extrabold text-slate-800 uppercase">{transaction.saleMode}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-bold uppercase text-[10px]">Metode Bayar</span>
            <span className="font-extrabold text-slate-800">{transaction.paymentMethod}</span>
          </div>
        </div>

        {/* Item List */}
        <div className="p-6 space-y-4">
          <h4 className="font-black text-sm text-slate-800">Rincian Barang Belanja</h4>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama Produk</th>
                  <th className="px-4 py-3 text-center">Jumlah</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transaction.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRupiah(Number(item.unitPrice))}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {formatRupiah(Number(item.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment summary */}
          <div className="pt-2 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Belanja:</span>
                <span className="font-bold text-slate-900">{formatRupiah(Number(transaction.totalAmount))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Uang Diterima:</span>
                <span className="font-bold text-slate-900">{formatRupiah(Number(transaction.paidAmount))}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Kembalian:</span>
                <span className="font-black text-emerald-700">{formatRupiah(Number(transaction.changeAmount))}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
