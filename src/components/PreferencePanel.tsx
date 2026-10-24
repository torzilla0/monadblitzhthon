"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Item } from "../lib/fixture";

interface PreferencePanelProps {
  mode: 0 | 1; // 0 = Becayiş Kadroları, 1 = Salon Stickerları
  items: Item[];
  wants: Record<number, number[]>;
  myAddress: `0x${string}`;
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  onSaveWants: (
    itemId: number,
    rankedTargets: number[]
  ) => Promise<{ txHash: `0x${string}`; latencyMs: number }>;
  onClaimStickers?: () => Promise<void>;
  isClaiming?: boolean;
}

export default function PreferencePanel({
  mode,
  items,
  wants,
  myAddress,
  selectedItemId,
  onSelectItem,
  onSaveWants,
  onClaimStickers,
  isClaiming = false,
}: PreferencePanelProps) {
  // Kullanıcının sahip olduğu itemlar; eğer demo modda (Mod A) burner cüzdanın kadrosu yoksa
  // haritadan seçilen kadroyu veya ilk 4 örnek kadroyu "Elimde olanlar / Yönetilen Kadrolar" olarak göster
  const myOwnedItems = useMemo(() => {
    const owned = items.filter(
      (it) => it.owner.toLowerCase() === myAddress.toLowerCase()
    );
    if (owned.length > 0) return owned;
    if (mode === 0) {
      // Becayiş demosu için seçili kadroyu + Hakkari, Ankara, İzmir'i hızlı erişimde göster
      const baseIds = new Set<number>([1, 2, 3]);
      if (selectedItemId) baseIds.add(selectedItemId);
      return items.filter((it) => baseIds.has(it.id));
    }
    return items.slice(0, 3);
  }, [items, myAddress, mode, selectedItemId]);

  const activeItem = useMemo(() => {
    if (selectedItemId) {
      const found = items.find((it) => it.id === selectedItemId);
      if (found) return found;
    }
    return myOwnedItems[0] || items[0] || null;
  }, [items, selectedItemId, myOwnedItems]);

  const [draftWants, setDraftWants] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    txHash: string;
    latencyMs: number;
  } | null>(null);

  useEffect(() => {
    if (activeItem) {
      setDraftWants(wants[activeItem.id] ? [...wants[activeItem.id]] : []);
      setSaveFeedback(null);
    }
  }, [activeItem, wants]);

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setDraftWants((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
    setSaveFeedback(null);
  };

  const moveDown = (idx: number) => {
    setDraftWants((prev) => {
      if (idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy;
    });
    setSaveFeedback(null);
  };

  const removeTarget = (targetId: number) => {
    setDraftWants((prev) => prev.filter((id) => id !== targetId));
    setSaveFeedback(null);
  };

  const addTarget = (targetId: number) => {
    if (!activeItem || targetId === activeItem.id) return;
    setDraftWants((prev) => {
      if (prev.includes(targetId) || prev.length >= 64) return prev;
      return [...prev, targetId];
    });
    setSaveFeedback(null);
  };

  const handleSave = async () => {
    if (!activeItem || isSaving) return;
    setIsSaving(true);
    try {
      const res = await onSaveWants(activeItem.id, draftWants);
      setSaveFeedback({ txHash: res.txHash, latencyMs: res.latencyMs });
    } finally {
      setIsSaving(false);
    }
  };

  const itemById = useMemo(() => {
    const m = new Map<number, Item>();
    items.forEach((it) => m.set(it.id, it));
    return m;
  }, [items]);

  const candidateItems = useMemo(() => {
    if (!activeItem) return [];
    return items.filter((it) => {
      if (it.id === activeItem.id) return false;
      if (draftWants.includes(it.id)) return false;
      if (
        searchQuery.trim() &&
        !it.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [items, activeItem, draftWants, searchQuery]);

  return (
    <div className="bg-[#0e0e18] border border-zinc-800/90 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-zinc-800/80">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#a78bfa] bg-[#836EF9]/15 px-2.5 py-0.5 rounded border border-[#836EF9]/30">
            Tercihlerini sırala
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white mt-1.5">
            Çoklu Seçim &amp; Sıralama Arayüzü
          </h3>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-amber-200 font-medium">
          ★ Sıra önemli: en çok istediğini en üste koy.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* SOL PANEL: ELİMDE OLANLAR */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-[#090910] border border-zinc-800/80 rounded-xl p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
                1. Elimde Olanlar
              </h4>
              {mode === 1 && onClaimStickers && (
                <button
                  onClick={onClaimStickers}
                  disabled={isClaiming}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#836EF9] hover:bg-[#725ae8] text-white transition cursor-pointer disabled:opacity-50"
                >
                  {isClaiming ? "Alınıyor..." : "+ 3 Sticker Al (claimStickers)"}
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {myOwnedItems.map((item) => {
                const isSelected = activeItem?.id === item.id;
                const currentWantsCount = (wants[item.id] || []).length;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#836EF9]/15 border-[#836EF9] shadow-md shadow-[#836EF9]/10"
                        : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          #{item.id} · {item.kind === 0 ? "Kadro" : "Sticker"}
                        </span>
                        <div className="text-sm font-bold text-white">
                          {item.label}
                        </div>
                      </div>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {currentWantsCount} tercih
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-zinc-500">
                        Sahip: {item.owner.slice(0, 6)}...{item.owner.slice(-4)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item.id);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? "bg-[#836EF9] text-white"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        Bunun için ne istiyorsun? →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 mt-3 pt-2 border-t border-zinc-800/80">
            Not: MTTC (Sikdar, Adali &amp; Xia, AAAI 2017) garantileri
            leksikografik tercih sıralaması altında strict-core ve güçlü
            grup-strategyproofness sağlar.
          </p>
        </div>

        {/* SAĞ PANEL: İSTEDİKLERİM (SIRALI LİSTE + EKLEME) */}
        <div className="lg:col-span-7 bg-[#090910] border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wide">
                  2. İstediklerim{" "}
                  {activeItem ? (
                    <span className="text-[#a78bfa] font-mono normal-case">
                      ({activeItem.label} için)
                    </span>
                  ) : null}
                </h4>
                <p className="text-xs text-zinc-400">
                  Sıra önemli: en çok istediğini en üste koy. Dizi sırası =
                  kontrattaki <code className="text-zinc-200">rankedTargets</code>{" "}
                  sırası.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={!activeItem || isSaving}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving
                  ? "Zincire Yazılıyor..."
                  : `Kaydet — setWants(${activeItem?.id || 0}, [${draftWants.join(", ")}])`}
              </button>
            </div>

            {/* SIRALANMIŞ TERCİH LİSTESİ */}
            <div className="space-y-2 mb-4">
              {draftWants.length === 0 ? (
                <div className="text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-4 text-center">
                  Henüz tercih eklenmedi. Aşağıdaki listeden istediğin{" "}
                  {mode === 0 ? "kadroları" : "stickerları"} sırayla ekle.
                </div>
              ) : (
                draftWants.map((targetId, idx) => {
                  const targetItem = itemById.get(targetId);
                  return (
                    <div
                      key={targetId}
                      className="flex items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3.5 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-[#836EF9]/20 border border-[#836EF9]/40 text-[#a78bfa] font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}.
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {targetItem ? targetItem.label : `Item #${targetId}`}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            1. Tercih (Top Choice)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-30 cursor-pointer"
                        >
                          [yukarı]
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={idx === draftWants.length - 1}
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-30 cursor-pointer"
                        >
                          [aşağı]
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTarget(targetId)}
                          className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/50 cursor-pointer"
                        >
                          [çıkar]
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ADAY HAVUZUNDAN TERCİH EKLEME */}
            <div className="pt-3 border-t border-zinc-800/80">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-zinc-400">
                  Listeye Yeni Tercih Ekle:
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    mode === 0 ? "Şehir veya branş ara..." : "Sticker ara..."
                  }
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#836EF9]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-1">
                {candidateItems.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => addTarget(cand.id)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-zinc-900 hover:bg-[#836EF9]/20 border border-zinc-800 hover:border-[#836EF9]/50 text-zinc-300 hover:text-white transition cursor-pointer"
                  >
                    + {cand.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {saveFeedback && (
            <div className="mt-3 bg-emerald-950/50 border border-emerald-700/50 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-emerald-200">
              <span>
                ✓ Tercih sıralaması kaydedildi ve döngü grafı güncellendi (
                {saveFeedback.latencyMs}ms)
              </span>
              <span className="font-mono text-[11px] text-emerald-400">
                tx: {saveFeedback.txHash.slice(0, 10)}...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
