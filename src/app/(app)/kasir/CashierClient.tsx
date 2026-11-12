"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Monitor,
  ShoppingCart,
  Trash2,
  Tags,
  ShoppingBag,
  User,
  X,
  Banknote,
  Send,
  Search,
  ScanBarcode,
  Box,
  PackageSearch,
  Info,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { getPriceFor, type ProductUnitData } from "@/lib/pricing";
import CameraBarcodeModal from "@/components/scanner/CameraBarcodeModal";

interface ProductItem {
  id: number;
  sku: string;
  barcode?: string | null;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  units: ProductUnitData[];
}

interface CartItem {
  productId: number;
  product: ProductItem;
  selectedUnitId: number;
  quantity: number;
}

interface CustomerOption {
  id: number;
  name: string;
  phone?: string | null;
  type: string;
}

interface CashierClientProps {
  user: {
    name: string;
    role: string;
  };
  initialProducts: ProductItem[];
  categories: string[];
  initialCustomers: CustomerOption[];
}

export default function CashierClient({
  user,
  initialProducts,
  categories,
  initialCustomers,
}: CashierClientProps) {
  const router = useRouter();

  // Clock state
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(now) + " WIB"
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Cart & Mode state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleMode, setSaleMode] = useState<"eceran" | "grosir">("eceran");

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [customerNameManual, setCustomerNameManual] = useState("");

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<"tunai" | "transfer">("tunai");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Barcode Scanner Modal State
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchCat = !selectedCategory || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  }, [initialProducts, selectedCategory, searchQuery]);

  // Customer debounced search
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pelanggan/search?q=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setCustomerResults(data);
        }
      } catch (e) {
        console.error(e);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Add Product to Cart
  const addToCart = useCallback((product: ProductItem, preferredUnitId?: number) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const unitId = preferredUnitId || product.units[0]?.id || 0;
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.selectedUnitId === unitId
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + 1,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            product,
            selectedUnitId: unitId,
            quantity: 1,
          },
        ];
      }
    });
  }, []);

  // Barcode Gun Hardware Listener & F2 shortcut
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setScannerModalOpen((prev) => !prev);
        return;
      }

      // Check if user is typing in regular text fields
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 100) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter" && buffer.length > 2) {
        e.preventDefault();
        // Find product by barcode or SKU
        const found = initialProducts.find(
          (p) =>
            (p.barcode && p.barcode.toLowerCase() === buffer.toLowerCase()) ||
            p.sku.toLowerCase() === buffer.toLowerCase()
        );
        if (found) {
          addToCart(found);
          setLastScannedItem(found.name);
          setTimeout(() => setLastScannedItem(""), 3000);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [initialProducts, addToCart]);

  // Calculate cart items with dynamic pricing
  const cartCalculations = useMemo(() => {
    let total = 0;
    const items = cart.map((item) => {
      const unit =
        item.product.units.find((u) => u.id === item.selectedUnitId) ||
        item.product.units[0];
      const unitPrice = getPriceFor(
        unit?.priceTier,
        saleMode,
        item.quantity,
        selectedCustomer?.type || null
      );
      const subtotal = unitPrice * item.quantity;
      total += subtotal;
      return {
        ...item,
        unit,
        unitPrice,
        subtotal,
      };
    });
    return { items, total };
  }, [cart, saleMode, selectedCustomer]);

  const totalAmount = cartCalculations.total;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Sync paid amount when transfer or total changes
  useEffect(() => {
    if (paymentMethod === "transfer") {
      setPaidAmount(totalAmount);
    }
  }, [totalAmount, paymentMethod]);

  const numericPaid = typeof paidAmount === "number" ? paidAmount : 0;
  const changeAmount = paymentMethod === "transfer" ? 0 : Math.max(0, numericPaid - totalAmount);

  // Quick cash amounts
  const quickAmounts = useMemo(() => {
    const list = [10000, 20000, 50000, 100000, 200000];
    return list.filter((amt) => amt > totalAmount);
  }, [totalAmount]);

  const updateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
    } else {
      setCart((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], quantity: newQty };
        return next;
      });
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount("");
    setNotes("");
  };

  const selectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setCustomerResults([]);
    if (customer.type === "reseller") {
      setSaleMode("grosir");
    }
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSaleMode("eceran");
  };

  // Search Enter Handler
  const handleSearchEnter = () => {
    if (!searchQuery.trim()) return;
    const exact = initialProducts.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === searchQuery.toLowerCase()) ||
        p.sku.toLowerCase() === searchQuery.toLowerCase() ||
        p.name.toLowerCase() === searchQuery.toLowerCase()
    );
    if (exact) {
      addToCart(exact);
      setSearchQuery("");
    } else if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchQuery("");
    }
  };

  // Handle Checkout Submit
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === "tunai" && numericPaid < totalAmount) {
      setErrorMessage("Nominal uang tunai kurang dari total pembayaran.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          unitId: i.selectedUnitId,
          quantity: i.quantity,
        })),
        paymentMethod: paymentMethod === "tunai" ? "Tunai" : "Transfer",
        paidAmount: paymentMethod === "transfer" ? totalAmount : numericPaid,
        saleMode,
        customerId: selectedCustomer ? selectedCustomer.id : null,
        customerName: selectedCustomer ? selectedCustomer.name : customerNameManual || null,
        notes: notes || null,
      };

      const res = await fetch("/api/kasir/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Gagal memproses transaksi.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/kasir/receipt/${data.transactionId}`);
    } catch {
      setErrorMessage("Koneksi gagal saat memproses checkout.");
      setIsSubmitting(false);
    }
  };

  const canCheckout =
    cart.length > 0 &&
    (paymentMethod === "transfer" || numericPaid >= totalAmount);

  return (
    <div className="min-h-screen font-sans pb-10">
      {/* Kasir POS Top Header matching original design */}
      <header className="bg-gradient-to-r from-brand-700 to-brand-800 text-white sticky top-0 z-30 shadow-md">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-lg backdrop-blur-sm">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">KASIR POS</h1>
              <p className="text-sm text-brand-100 flex items-center gap-1 font-medium">
                {currentTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-white/90">Online</span>
            </div>
            <div className="flex items-center gap-2 pl-4 border-l border-white/20">
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold backdrop-blur-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <p className="font-medium text-white">{user.name}</p>
                <p className="text-xs text-brand-200">
                  Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="w-full px-3 py-3">
        {errorMessage && (
          <div className="mb-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* ============================================================ */}
          {/* LEFT SIDE: Nota / Keranjang (col-span-5)                     */}
          {/* ============================================================ */}
          <div className="lg:col-span-5 relative order-2 lg:order-1">
            <div className="rounded-xl shadow-md border border-brand-200/50 flex flex-col h-fit sticky top-20 overflow-hidden bg-white">
              {/* Cart Header - Green themed */}
              <div className="px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 text-white flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Pesanan Saat Ini</span>
                  <span className="bg-white/20 text-white text-xs py-0.5 px-2 rounded-full font-semibold backdrop-blur-sm">
                    {totalItems} item
                  </span>
                </h2>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>

              {/* Customer Search & Mode Selector - Light green bg */}
              <div className="p-3 border-b border-brand-100 bg-brand-50/50 relative">
                {/* Mode Selector Toggle */}
                <div className="flex items-center gap-1 bg-brand-100/70 p-1 rounded-lg border border-brand-200 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setSaleMode("eceran")}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer",
                      saleMode === "eceran"
                        ? "bg-white text-brand-700 shadow-sm border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Retail (Umum)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleMode("grosir")}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer",
                      saleMode === "grosir"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Tags className="w-3.5 h-3.5" />
                    <span>Grosir (Reseller)</span>
                  </button>
                </div>

                {/* Customer Autocomplete Input */}
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Cari Pelanggan / Reseller (opsional)..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none transition-all"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={clearCustomer}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Autocomplete Dropdown */}
                {customerResults.length > 0 && (
                  <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                    {customerResults.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="px-4 py-2 hover:bg-brand-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-sm text-slate-800">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.phone || "-"}</div>
                        </div>
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            c.type === "reseller"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {c.type === "reseller" ? "Reseller (Grosir)" : "Retail"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Customer Info Badge */}
                {selectedCustomer && (
                  <div
                    className={cn(
                      "mt-2 flex items-center justify-between px-3 py-2 rounded-md border",
                      selectedCustomer.type === "reseller"
                        ? "bg-purple-50 border-purple-200 text-purple-900"
                        : "bg-brand-100 border-brand-200 text-brand-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                          selectedCustomer.type === "reseller"
                            ? "bg-purple-200 text-purple-700"
                            : "bg-brand-200 text-brand-700"
                        )}
                      >
                        {selectedCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold block leading-tight">
                          {selectedCustomer.name}
                        </span>
                        {selectedCustomer.phone && (
                          <span className="text-[11px] opacity-75">{selectedCustomer.phone}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded font-bold",
                        selectedCustomer.type === "reseller"
                          ? "bg-purple-600 text-white"
                          : "bg-brand-200 text-brand-800"
                      )}
                    >
                      {selectedCustomer.type === "reseller"
                        ? "Reseller • Harga Grosir"
                        : "Retail"}
                    </span>
                  </div>
                )}
              </div>

              {/* Mode Indicator Banner */}
              {saleMode === "grosir" && (
                <div className="bg-purple-600 text-white text-xs font-bold px-4 py-1.5 flex justify-center items-center gap-2 shadow-inner">
                  <Tags className="w-3.5 h-3.5" />
                  <span>MODE HARGA GROSIR AKTIF</span>
                  {selectedCustomer?.type === "reseller" && (
                    <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-semibold">
                      (Reseller)
                    </span>
                  )}
                </div>
              )}

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto max-h-[340px] p-2 bg-brand-50/30 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-brand-300">
                    <ShoppingCart className="w-12 h-12 mb-3 text-brand-200" />
                    <p className="text-sm font-medium text-brand-600">Keranjang masih kosong</p>
                    <p className="text-xs mt-1 text-slate-400">Pilih produk di sebelah kanan</p>
                  </div>
                ) : (
                  cartCalculations.items.map((item, index) => {
                    const isReseller = selectedCustomer?.type === "reseller";
                    const isWholesaleMode = saleMode === "grosir" || isReseller;
                    const minWholesaleQty = item.unit?.priceTier?.minWholesaleQty || 0;
                    const priceWholesale = Number(item.unit?.priceTier?.priceWholesale) || 0;
                    const isAutoWholesale =
                      !isWholesaleMode &&
                      minWholesaleQty > 1 &&
                      item.quantity >= minWholesaleQty &&
                      priceWholesale > 0;

                    return (
                      <div
                        key={`${item.productId}-${item.selectedUnitId}`}
                        className="bg-white p-3 mb-2 rounded-lg border border-brand-100 shadow-xs relative group"
                      >
                        <div className="flex justify-between items-start mb-2 pr-6">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 leading-tight">
                              {item.product.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-slate-500 font-mono">
                                {item.product.sku}
                              </span>

                              {/* Price badge logic matching original */}
                              {isWholesaleMode ? (
                                <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold flex items-center gap-1">
                                  <Tags className="w-2.5 h-2.5" />
                                  <span>{isReseller ? "RESELLER" : "GROSIR"}</span>
                                </span>
                              ) : isAutoWholesale ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                  GROSIR AUTO (≥{minWholesaleQty})
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded border border-slate-200">
                                  RETAIL
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(index)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Unit Selector Dropdown */}
                        {item.product.units.length > 1 ? (
                          <div className="mt-2 mb-2">
                            <select
                              value={item.selectedUnitId}
                              onChange={(e) => {
                                const newUnitId = Number(e.target.value);
                                setCart((prev) => {
                                  const next = [...prev];
                                  next[index] = {
                                    ...next[index],
                                    selectedUnitId: newUnitId,
                                    quantity: 1,
                                  };
                                  return next;
                                });
                              }}
                              className="text-xs bg-white border border-brand-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 w-full font-bold shadow-2xs cursor-pointer"
                            >
                              {item.product.units.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.unitName}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="mt-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md border border-brand-100 bg-brand-50 text-brand-700 text-[10px] font-bold">
                              {item.unit?.unitName || item.product.unit}
                            </span>
                          </div>
                        )}

                        {/* Price & Info line */}
                        <div className="flex justify-between items-end mb-2 text-xs">
                          <div className="text-slate-600 font-semibold">
                            <span>{formatRupiah(item.unitPrice)}</span>
                            <span className="text-slate-400 font-normal">
                              {" "}
                              / {item.unit?.unitName || item.product.unit}
                            </span>
                          </div>
                          {item.unit?.conversionFactor && item.unit.conversionFactor > 1 && (
                            <div className="text-[10px] text-slate-400 italic">
                              Isi {item.unit.conversionFactor} btg/pcs
                            </div>
                          )}
                        </div>

                        {/* Quantity Counter & Subtotal */}
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-brand-100/60">
                          <div className="flex items-center bg-brand-50 rounded-lg border border-brand-200 p-0.5">
                            <button
                              type="button"
                              onClick={() => updateQty(index, item.quantity - 1)}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center rounded transition-all cursor-pointer",
                                item.quantity === 1
                                  ? "text-red-500 hover:bg-red-100 hover:text-red-700"
                                  : "text-brand-600 hover:bg-white hover:text-brand-700 hover:shadow-2xs"
                              )}
                              title={item.quantity === 1 ? "Hapus dari pesanan" : "Kurangi 1"}
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-3.5 h-3.5" />
                              ) : (
                                <span className="font-bold text-sm leading-none">-</span>
                              )}
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQty(index, parseInt(e.target.value) || 0)}
                              className="w-10 text-center bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 p-0"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(index, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-brand-600 hover:bg-white hover:text-brand-700 hover:shadow-2xs rounded transition-all cursor-pointer"
                              title="Tambah 1"
                            >
                              <span className="font-bold text-sm leading-none">+</span>
                            </button>
                          </div>
                          <div className="font-bold text-brand-800 text-sm">
                            {formatRupiah(item.subtotal)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Payment Section */}
              <div className="p-4 bg-gradient-to-b from-brand-50 to-brand-100/50 border-t border-brand-200">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <span className="text-sm font-medium text-brand-700">Total Pembayaran</span>
                    {(saleMode === "grosir" || selectedCustomer?.type === "reseller") && (
                      <div className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded inline-block ml-2 border border-purple-200">
                        {selectedCustomer?.type === "reseller"
                          ? "RESELLER GROSIR"
                          : "HARGA GROSIR"}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-black text-brand-800">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("tunai")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                      paymentMethod === "tunai"
                        ? "bg-brand-600 border-brand-600 text-white shadow-md"
                        : "bg-white border-brand-200 text-slate-600 hover:bg-brand-50"
                    )}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai (Cash)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("transfer")}
                    className={cn(
                      "py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer",
                      paymentMethod === "transfer"
                        ? "bg-brand-600 border-brand-600 text-white shadow-md"
                        : "bg-white border-brand-200 text-slate-600 hover:bg-brand-50"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    <span>Transfer Bank</span>
                  </button>
                </div>

                {/* Input Nominal (Only for Tunai) */}
                {paymentMethod === "tunai" ? (
                  <div className="mb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-brand-700">Nominal Diterima</label>
                      {numericPaid - totalAmount > 0 && (
                        <span className="text-xs font-bold text-brand-600">
                          Kembali: {formatRupiah(changeAmount)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 font-medium text-sm">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={(e) =>
                          setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-brand-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-lg font-bold text-slate-800 outline-none"
                      />
                    </div>
                    {/* Quick Amounts */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPaidAmount(totalAmount)}
                        className="text-[10px] bg-white hover:bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md font-semibold border border-brand-200 shadow-2xs cursor-pointer"
                      >
                        Uang Pas
                      </button>
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPaidAmount(amt)}
                          className="text-[10px] bg-white hover:bg-brand-50 text-brand-700 px-2.5 py-1 rounded-md font-semibold border border-brand-200 shadow-2xs cursor-pointer"
                        >
                          {amt >= 1000 ? `${amt / 1000} rb` : amt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Transfer Info Box */
                  <div className="mb-4 p-3 bg-brand-50/70 border border-brand-200 rounded-xl flex items-center gap-2 text-xs text-brand-800">
                    <Info className="w-4 h-4 text-brand-600 shrink-0" />
                    <span>Pembayaran via Transfer Bank (nominal lunas sesuai total belanja).</span>
                  </div>
                )}

                {/* Manual Customer Name (If not selected) */}
                {!selectedCustomer && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={customerNameManual}
                      onChange={(e) => setCustomerNameManual(e.target.value)}
                      placeholder="Nama Pelanggan Umum (Opsional)..."
                      className="w-full px-3 py-2 bg-white border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan transaksi (Opsional)..."
                    className="w-full px-3 py-2 bg-white border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm outline-none"
                  />
                </div>

                {/* Submit Checkout Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={!canCheckout || isSubmitting}
                  className={cn(
                    "w-full py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                    canCheckout
                      ? "bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 shadow-brand-600/30"
                      : "bg-slate-400 shadow-none"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Proses Pembayaran</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT SIDE: Products Catalog (col-span-7)                   */}
          {/* ============================================================ */}
          <div className="lg:col-span-7 flex flex-col gap-3 order-1 lg:order-2">
            {/* Search & Filter bar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center">
              <div className="relative flex-1 w-full">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchEnter()}
                  placeholder="Cari nama, SKU, atau scan barcode..."
                  className="w-full pl-10 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm outline-none"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                    title="Barcode Scanner Otomatis Aktif"
                  />
                  <span className="text-[10px] font-bold text-slate-400">SCAN (F2)</span>
                </div>
              </div>

              {/* Button Buka Kamera Scanner */}
              <button
                type="button"
                onClick={() => setScannerModalOpen(true)}
                title="Buka Kamera Barcode Scanner (F2)"
                className="w-full sm:w-auto bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold text-xs px-3.5 py-2.5 rounded-lg border border-brand-200 flex items-center justify-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <ScanBarcode className="w-4 h-4 text-brand-600" />
                <span>Scan Kamera</span>
              </button>

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto py-2.5 pl-3 pr-8 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm outline-none cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300">
                  <PackageSearch className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-base font-medium text-slate-700">Produk tidak ditemukan</h3>
                  <p className="text-sm text-slate-500">
                    Coba ubah kata kunci atau kategori pencarian.
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const baseUnit = product.units[0];
                  const retailPrice = Number(baseUnit?.priceTier?.priceRetail) || 0;
                  const wholesalePrice = Number(baseUnit?.priceTier?.priceWholesale) || 0;
                  const minWholesaleQty = baseUnit?.priceTier?.minWholesaleQty || 0;
                  const isWholesaleMode =
                    saleMode === "grosir" || selectedCustomer?.type === "reseller";

                  return (
                    <div
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-brand-300 transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                    >
                      {/* Out of stock overlay */}
                      {product.stock <= 0 && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center">
                          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200 shadow-xs">
                            Stok Habis
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-mono">
                          {product.sku}
                        </span>
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            product.stock <= product.minStock
                              ? "text-red-500"
                              : "text-brand-500"
                          )}
                        >
                          <Box className="w-3.5 h-3.5" />
                          <span className="text-xs font-bold">{product.stock}</span>
                        </div>
                      </div>

                      <h3 className="font-semibold text-slate-800 text-sm leading-snug mb-1 group-hover:text-brand-600 transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{product.category}</p>

                      <div className="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-1">
                        <div className="flex justify-between items-end">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {isWholesaleMode ? "Grosir" : "Retail"}
                          </span>
                          <div className="text-right">
                            {isWholesaleMode ? (
                              <span className="font-bold text-purple-700 text-base">
                                {formatRupiah(wholesalePrice > 0 ? wholesalePrice : retailPrice)}
                              </span>
                            ) : (
                              <div>
                                <span className="font-bold text-brand-700 text-base">
                                  {formatRupiah(retailPrice)}
                                </span>
                                {minWholesaleQty > 1 && wholesalePrice > 0 && (
                                  <div className="text-[10px] text-indigo-600 font-semibold">
                                    Grosir {formatRupiah(wholesalePrice)} (≥{minWholesaleQty})
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {product.units.length > 1 && (
                          <div className="text-[10px] text-right text-slate-400">
                            {product.units.length} satuan tersedia
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barcode Camera Scanner Modal */}
      <CameraBarcodeModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScan={(barcode) => {
          const found = initialProducts.find(
            (p) =>
              (p.barcode && p.barcode.toLowerCase() === barcode.toLowerCase()) ||
              p.sku.toLowerCase() === barcode.toLowerCase()
          );
          if (found) {
            addToCart(found);
            setLastScannedItem(`Berhasil scan: ${found.name}`);
            setTimeout(() => setLastScannedItem(""), 3000);
          } else {
            setLastScannedItem(`Barcode "${barcode}" tidak ditemukan.`);
            setTimeout(() => setLastScannedItem(""), 3000);
          }
        }}
        lastScannedName={lastScannedItem}
      />
    </div>
  );
}
