"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Banknote,
  Send,
  User,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Tag,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { getPriceFor, type ProductUnitData } from "@/lib/pricing";

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
  unitId: number;
  quantity: number;
}

interface CustomerOption {
  id: number;
  name: string;
  phone?: string | null;
  type: string;
}

interface CashierClientProps {
  initialProducts: ProductItem[];
  categories: string[];
  initialCustomers: CustomerOption[];
}

export default function CashierClient({
  initialProducts,
  categories,
  initialCustomers,
}: CashierClientProps) {
  const router = useRouter();

  // Search & Catalog Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");

  // POS Transaction State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleMode, setSaleMode] = useState<"eceran" | "grosir">("eceran");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerList, setCustomerList] = useState<CustomerOption[]>(initialCustomers);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"Tunai" | "Transfer">("Tunai");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchCat =
        selectedCategory === "Semua" || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const query = search.toLowerCase().trim();
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query));
      return matchCat && matchQuery;
    });
  }, [initialProducts, search, selectedCategory]);

  // Add product to cart (or increment if exists)
  const addToCart = (product: ProductItem, preferredUnitId?: number) => {
    setCart((prev) => {
      const defaultUnit = product.units[0];
      const targetUnitId = preferredUnitId || defaultUnit?.id;

      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.unitId === targetUnitId
      );

      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            product,
            unitId: targetUnitId,
            quantity: 1,
          },
        ];
      }
    });
    setErrorMessage(null);
  };

  // Barcode / SKU scan submit handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) return;

    // Check exact match on barcode or sku
    const exactMatch = initialProducts.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) ||
        p.sku.toLowerCase() === query.toLowerCase()
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearch("");
    }
  };

  // Change unit for an item in cart
  const updateItemUnit = (index: number, newUnitId: number) => {
    setCart((prev) => {
      const next = [...prev];
      next[index].unitId = newUnitId;
      return next;
    });
  };

  // Update item quantity
  const updateItemQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = newQty;
      }
      return next;
    });
  };

  const setItemQuantity = (index: number, qty: number) => {
    setCart((prev) => {
      const next = [...prev];
      if (qty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = qty;
      }
      return next;
    });
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount("");
    setNotes("");
    setErrorMessage(null);
  };

  // Calculate cart items with resolved prices
  const cartCalculations = useMemo(() => {
    let total = 0;
    const items = cart.map((item) => {
      const unit =
        item.product.units.find((u) => u.id === item.unitId) || item.product.units[0];
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
  const numericPaid = typeof paidAmount === "number" ? paidAmount : 0;
  const changeAmount = paymentMethod === "Transfer" ? 0 : Math.max(0, numericPaid - totalAmount);

  // Quick cash buttons
  const quickCashOptions = [
    { label: "Pas", amount: totalAmount },
    { label: "10 rb", amount: 10000 },
    { label: "20 rb", amount: 20000 },
    { label: "50 rb", amount: 50000 },
    { label: "100 rb", amount: 100000 },
    { label: "200 rb", amount: 200000 },
  ];

  // Customer search debounced
  useEffect(() => {
    if (!customerSearch) {
      setCustomerList(initialCustomers);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pelanggan/search?q=${encodeURIComponent(customerSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setCustomerList(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearch, initialCustomers]);

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage("Keranjang belanja masih kosong.");
      return;
    }

    if (paymentMethod === "Tunai" && numericPaid < totalAmount) {
      setErrorMessage("Uang pembayaran tunai kurang dari total belanja.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = {
        items: cart.map((i) => ({
          productId: i.productId,
          unitId: i.unitId,
          quantity: i.quantity,
        })),
        paymentMethod,
        paidAmount: paymentMethod === "Transfer" ? totalAmount : numericPaid,
        saleMode,
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || null,
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
        setLoading(false);
        return;
      }

      // Redirect to receipt
      router.push(`/kasir/receipt/${data.transactionId}`);
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi saat memproses checkout.");
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
      {/* LEFT COLUMN: Product Catalog (7 Cols) */}
      <div className="lg:col-span-7 flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Top Controls: Search Bar & Barcode Form */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari barang nama, SKU, atau scan barcode lalu Enter..."
              className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Barcode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scan</span>
            </button>
          </form>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("Semua")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all",
                selectedCategory === "Semua"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all",
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Package className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold">Tidak ada barang yang cocok</p>
              <p className="text-xs text-slate-400 mt-1">Coba kata kunci pencarian lain.</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const baseUnit = p.units[0];
              const baseRetailPrice = Number(baseUnit?.priceTier?.priceRetail) || 0;
              const baseWholesalePrice = Number(baseUnit?.priceTier?.priceWholesale) || baseRetailPrice;
              const hasMultiUnit = p.units.length > 1;

              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-emerald-50/40 hover:border-emerald-300 text-left transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase truncate">
                        {p.sku}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                        Stok: {p.stock}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-800 line-clamp-2 group-hover:text-emerald-700 leading-snug">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-end justify-between">
                    <div>
                      <p className="text-xs font-black text-emerald-600">
                        {formatRupiah(saleMode === "grosir" ? baseWholesalePrice : baseRetailPrice)}
                      </p>
                      <p className="text-[10px] text-slate-400">/{baseUnit?.unitName || p.unit}</p>
                    </div>
                    {hasMultiUnit && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100/80 text-teal-800">
                        +{p.units.length - 1} Satuan
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Cart & Checkout (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cart Header & Mode Switches */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h2 className="font-black text-sm text-slate-800">Keranjang Transaksi</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {cart.reduce((a, b) => a + b.quantity, 0)} item
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          {/* Mode Penjualan (Eceran vs Grosir) & Pelanggan */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Mode Switch */}
            <div className="bg-slate-200/70 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setSaleMode("eceran")}
                className={cn(
                  "flex-1 py-1 text-xs font-bold rounded-lg transition-all text-center",
                  saleMode === "eceran"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                Eceran
              </button>
              <button
                onClick={() => setSaleMode("grosir")}
                className={cn(
                  "flex-1 py-1 text-xs font-bold rounded-lg transition-all text-center",
                  saleMode === "grosir"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                Grosir
              </button>
            </div>

            {/* Customer Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className="w-full py-1.5 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-left flex items-center justify-between truncate"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedCustomer?.name || "Pelanggan Umum"}</span>
                </div>
                {selectedCustomer?.type === "reseller" && (
                  <span className="text-[9px] bg-purple-100 text-purple-700 px-1 py-0.2 rounded font-extrabold uppercase">
                    Reseller
                  </span>
                )}
              </button>

              {showCustomerDropdown && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 space-y-2">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Cari pelanggan..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between"
                    >
                      <span className="font-semibold text-slate-700">Pelanggan Umum</span>
                      <span className="text-[10px] text-slate-400">Retail</span>
                    </button>
                    {customerList.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowCustomerDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-slate-100 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-700 truncate">{c.name}</span>
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.2 rounded font-bold uppercase",
                            c.type === "reseller"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {c.type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-3">
          {cartCalculations.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
              <ShoppingCart className="w-12 h-12 text-slate-200 mb-2 stroke-[1.5]" />
              <p className="text-sm font-semibold">Keranjang masih kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Klik produk di katalog atau scan barcode untuk menambahkan barang belanja.
              </p>
            </div>
          ) : (
            cartCalculations.items.map((item, index) => (
              <div key={`${item.productId}-${item.unitId}`} className="pt-3 first:pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 truncate">{item.product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {/* Unit Selector */}
                      <select
                        value={item.unitId}
                        onChange={(e) => updateItemUnit(index, Number(e.target.value))}
                        className="text-[11px] font-semibold bg-slate-100 text-slate-700 py-0.5 px-2 rounded-md border border-slate-200 focus:outline-hidden"
                      >
                        {item.product.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.unitName} ({u.conversionFactor} {item.product.unit})
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-slate-500 font-medium">
                        @ {formatRupiah(item.unitPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right shrink-0">
                    <p className="font-extrabold text-xs text-slate-900">{formatRupiah(item.subtotal)}</p>
                  </div>
                </div>

                {/* Quantity Stepper & Delete */}
                <div className="flex items-center justify-between mt-2.5">
                  <button
                    onClick={() => removeItem(index)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateItemQuantity(index, -1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => setItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-10 text-center text-xs font-black bg-transparent focus:outline-hidden"
                    />
                    <button
                      onClick={() => updateItemQuantity(index, 1)}
                      className="w-6 h-6 rounded-md bg-white text-slate-700 flex items-center justify-center font-bold hover:bg-slate-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Payment Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 space-y-3">
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Subtotal & Total Display */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pembayaran
            </span>
            <span className="text-2xl font-black text-slate-900">{formatRupiah(totalAmount)}</span>
          </div>

          {/* Payment Method Switcher */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setPaymentMethod("Tunai");
                setPaidAmount("");
              }}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all",
                paymentMethod === "Tunai"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai (Cash)</span>
            </button>
            <button
              onClick={() => {
                setPaymentMethod("Transfer");
                setPaidAmount(totalAmount);
              }}
              className={cn(
                "py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all",
                paymentMethod === "Transfer"
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              )}
            >
              <Send className="w-4 h-4" />
              <span>Transfer Bank</span>
            </button>
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === "Tunai" && (
            <div className="space-y-2 pt-1">
              {/* Quick Cash Options */}
              <div className="grid grid-cols-3 gap-1.5">
                {quickCashOptions.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => setPaidAmount(q.amount)}
                    className="py-1 px-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-bold text-slate-700 transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Paid Input & Change Amount */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-black focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Kembalian
                  </label>
                  <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black text-emerald-700 flex items-center">
                    {formatRupiah(changeAmount)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : (
              <>
                <span>Selesaikan Transaksi & Cetak Struk</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
