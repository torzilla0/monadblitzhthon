"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { Item } from "../lib/fixture";
import { SpotlightCard } from "./ui/ReactBits";

interface PreferencePanelProps {
  mode: 0 | 1;
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
  const myOwnedItems = useMemo(() => {
    const owned = items.filter(
      (it) => it.owner.toLowerCase() === myAddress.toLowerCase()
    );
    if (owned.length > 0) return owned;
    if (mode === 0) {
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
    <SpotlightCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
        <div>
          <h3 className="text-base font-semibold text-white">
            Tercih Sıralaması
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sıra önemli: en çok istediğini en üste koy.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!activeItem || isSaving}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#836EF9] hover:bg-[#745ce8] text-white shadow-lg shadow-[#836EF9]/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-40"
        >
          {isSaving ? "Kaydediliyor…" : "Tercihleri Kaydet"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* SOL: ELİMDE OLANLAR */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">
              Elimde Olanlar
            </span>
            {mode === 1 && onClaimStickers && (
              <button
                onClick={onClaimStickers}
                disabled={isClaiming}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#836EF9]/20 hover:bg-[#836EF9]/30 text-purple-200 border border-[#836EF9]/30 transition cursor-pointer disabled:opacity-50"
              >
                {isClaiming ? "Alınıyor…" : "+ 3 Sticker Al"}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {myOwnedItems.map((item) => {
              const isSelected = activeItem?.id === item.id;
              const currentWantsCount = (wants[item.id] || []).length;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem(item.id)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-[#836EF9]/15 border-[#836EF9]/60"
                      : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {item.label}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">
                      #{item.id} · {currentWantsCount} tercih seçili
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                      isSelected
                        ? "bg-[#836EF9] text-white"
                        : "bg-white/[0.05] text-zinc-300"
                    }`}
                  >
                    Düzenle →
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SAĞ: İSTEDİKLERİM */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">
                İstediklerim{" "}
                {activeItem && (
                  <span className="text-purple-300 font-semibold">
                    ({activeItem.label})
                  </span>
                )}
              </span>
            </div>

            <div className="space-y-2">
              {draftWants.length === 0 ? (
                <div className="text-xs text-zinc-500 border border-dashed border-white/[0.08] rounded-xl p-4 text-center">
                  Aşağıdan gitmek istediğin yerleri sırayla ekle.
                </div>
              ) : (
                draftWants.map((targetId, idx) => {
                  const targetItem = itemById.get(targetId);
                  return (
                    <div
                      key={targetId}
                      className="flex items-center justify-between gap-2 bg-white/[0.02] border border-white/[0.07] rounded-xl px-3.5 py-2 transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-md bg-[#836EF9]/20 text-[#a78bfa] font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {targetItem ? targetItem.label : `#${targetId}`}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-md">
                            İlk Tercih
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          title="Yukarı Taşı"
                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-25 cursor-pointer"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={idx === draftWants.length - 1}
                          title="Aşağı Taşı"
                          className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-300 disabled:opacity-25 cursor-pointer"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTarget(targetId)}
                          title="Çıkar"
                          className="w-7 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Hızlı Ekleme Havuzu */}
          <div className="pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs text-zinc-500">Tercih Ekle:</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Şehir ara…"
                className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#836EF9]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto">
              {candidateItems.map((cand) => (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => addTarget(cand.id)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/[0.03] hover:bg-[#836EF9]/20 border border-white/[0.06] hover:border-[#836EF9]/40 text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  + {cand.label.split("/")[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {saveFeedback && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-emerald-200 animate-fade-in">
              <span>✓ Tercihler kaydedildi ({saveFeedback.latencyMs}ms)</span>
              <span className="font-mono text-[11px] text-emerald-400">
                tx: {saveFeedback.txHash.slice(0, 10)}…
              </span>
            </div>
          )}
        </div>
      </div>
    </SpotlightCard>
  );
}
