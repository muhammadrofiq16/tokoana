"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode, CheckCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface CameraBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  lastScannedName?: string;
}

export default function CameraBarcodeModal({
  isOpen,
  onClose,
  onScan,
  lastScannedName,
}: CameraBarcodeModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  // Play audio beep using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz beep
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not allowed or unsupported
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            isRunningRef.current = false;
            scannerRef.current?.clear();
          })
          .catch(() => {});
      }
      return;
    }

    setErrorMessage(null);
    let html5QrCode: Html5Qrcode | null = null;

    const timer = setTimeout(async () => {
      try {
        const container = document.getElementById("interactive-kasir-scanner");
        if (!container) return;

        html5QrCode = new Html5Qrcode("interactive-kasir-scanner");
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            playBeep();
            onScan(decodedText);
          },
          () => {
            // Ignore scan parse failures (normal between frames)
          }
        );
        isRunningRef.current = true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Camera scanner start error:", msg);
        setErrorMessage("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && isRunningRef.current) {
        html5QrCode
          .stop()
          .then(() => {
            isRunningRef.current = false;
            html5QrCode?.clear();
          })
          .catch(() => {});
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pemindai Barcode Produk</h3>
              <p className="text-xs text-slate-500">Arahkan kamera ke barcode produk belanjaan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Container */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative min-h-[300px]">
          <div
            id="interactive-kasir-scanner"
            className="w-full max-w-sm rounded-xl overflow-hidden shadow-inner"
          />

          {errorMessage && (
            <div className="absolute inset-4 bg-slate-900/90 text-rose-400 text-xs text-center p-4 flex flex-col items-center justify-center rounded-xl">
              <p className="font-bold">{errorMessage}</p>
              <p className="text-slate-400 mt-2 text-[11px]">
                Anda juga bisa menggunakan scanner barcode fisik atau ketik langsung di kolom pencarian.
              </p>
            </div>
          )}

          {/* Scan indicator info */}
          {lastScannedName && (
            <div className="absolute bottom-4 left-4 right-4 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold text-center shadow-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle className="w-4 h-4" />
              <span>{lastScannedName}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Mode Scan Berkelanjutan Aktif</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-brand-dark hover:bg-brand-800 font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Selesai Scan
          </button>
        </div>
      </div>
    </div>
  );
}
