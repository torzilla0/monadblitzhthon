"use client";

import { useState } from "react";
import type { Item } from "../lib/halka";

/**
 * Kayıtlı öğretmenler tablosu.
 *
 * Demoda yönetici rolündeyiz: kadroları ve tercihleri biz giriyoruz. Harita
 * bunun sonucunu gösteriyordu ama girdinin kendisi hiçbir yerde görünmüyordu,
 * yani "bu halka nereden çıktı?" sorusunun cevabı ekranda yoktu. Bu tablo o
 * girdiyi açıkça gösterir: kim, nerede, nereye gitmek istiyor, hangi sırayla.
 */
export default function TeacherTable({
  items,
  wants,
  teacherNames,
  activeCycleItems,
  onSelectItem,
}: {
  items: Item[];
  wants: Record<number, number[]>;
  teacherNames: Record<number, string>;
  activeCycleItems: number[];
  onSelectItem?: (id: number) => void;
}) {
  const [onlyCycle, setOnlyCycle] = useState(false);

  const cityOf = (id: number) =>
    items.find((it) => it.id === id)?.label.split("/")[0].trim() ?? `#${id}`;
  const branchOf = (id: number) =>
    items.find((it) => it.id === id)?.label.split("/")[1]?.trim() ?? "";

  const rows = onlyCycle
    ? items.filter((it) => activeCycleItems.includes(it.id))
    : items;

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl bg-[#0c0c14]/75 backdrop-blur-xl border border-white/[0.07] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Kayıtlı öğretmenler
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sisteme girilen {items.length} kadro ve her birinin sıralı tercihi.
            Halkalar bu tablodan çıkıyor.
          </p>
        </div>

        <button
          onClick={() => setOnlyCycle((v) => !v)}
          disabled={activeCycleItems.length === 0}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            onlyCycle
              ? "bg-[#836EF9]/15 border-[#836EF9]/60 text-purple-200"
              : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]"
          }`}
        >
          {onlyCycle ? "Hepsini göster" : "Sadece seçili halka"}
        </button>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-zinc-500 text-left">
              <th className="font-medium py-2 px-2">#</th>
              <th className="font-medium py-2 px-2">Öğretmen</th>
              <th className="font-medium py-2 px-2">Şu anki görev yeri</th>
              <th className="font-medium py-2 px-2">Branş</th>
              <th className="font-medium py-2 px-2">Gitmek istedikleri (sırayla)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => {
              const inCycle = activeCycleItems.includes(it.id);
              const list = wants[it.id] ?? [];
              return (
                <tr
                  key={it.id}
                  onClick={() => onSelectItem?.(it.id)}
                  className={`border-t border-white/[0.05] transition cursor-pointer hover:bg-white/[0.03] ${
                    inCycle ? "bg-[#836EF9]/[0.07]" : ""
                  }`}
                >
                  <td className="py-2 px-2 font-mono text-zinc-500">{it.id}</td>
                  <td className="py-2 px-2 text-zinc-200 whitespace-nowrap">
                    {teacherNames[it.id] ?? `Öğretmen #${it.id}`}
                    {inCycle && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#836EF9]/20 text-purple-200 border border-[#836EF9]/30">
                        halkada
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-white font-medium whitespace-nowrap">
                    {cityOf(it.id)}
                  </td>
                  <td className="py-2 px-2 text-zinc-400">{branchOf(it.id)}</td>
                  <td className="py-2 px-2">
                    {list.length === 0 ? (
                      <span className="text-zinc-600">tercih girilmemiş</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {list.map((targetId, idx) => (
                          <span
                            key={`${it.id}-${targetId}`}
                            className={`px-1.5 py-0.5 rounded border text-[11px] ${
                              idx === 0
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                                : "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                            }`}
                          >
                            {idx + 1}. {cityOf(targetId)}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
        Yeşil olan, o öğretmenin <strong className="text-zinc-300">1. tercihi</strong>.
        Bir halka ancak herkes bir sonrakinin kadrosunu listesine yazmışsa kapanır
        &mdash; zincir, taşımadan önce bu bağların hepsini tek tek kontrol ediyor.
      </p>
    </section>
  );
}
