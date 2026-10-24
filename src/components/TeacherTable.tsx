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
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<string | null>(null);

  // Zincire gerçekten yazar; tarayıcıda sahte satır üretmez. Tablo ve halka
  // bulucu zinciri okuduğu için sahte veri eklersek ikisi birbirini tutmazdı.
  const handleGenerate = async (mode: "replace" | "append", count: number) => {
    setGenerating(true);
    setGenMessage(
      mode === "replace"
        ? `${count} öğretmen yeniden üretiliyor, öncekiler emekliye ayrılıyor…`
        : `${count} öğretmen ekleniyor…`
    );
    try {
      const r = await fetch("/api/seed-random", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, count }),
      }).then((x) => x.json());
      setGenMessage(
        r.ok
          ? `${r.created} öğretmen zincire yazıldı (kadro #${r.firstId}–#${r.lastId}), her birine 2–4 tercih atandı. ` +
              (mode === "replace"
                ? "Önceki rastgele parti emekliye ayrıldı. "
                : "") +
              "Harita ve halkalar birkaç saniye içinde güncellenecek."
          : `Olmadı: ${r.error}`
      );
    } catch {
      setGenMessage("Olmadı: zincire ulaşılamadı.");
    } finally {
      setGenerating(false);
    }
  };

  const cityOf = (id: number) =>
    items.find((it) => it.id === id)?.label.split("/")[0].trim() ?? `#${id}`;
  const branchOf = (id: number) =>
    items.find((it) => it.id === id)?.label.split("/")[1]?.trim() ?? "";

  // Emekliye ayrılan kadrolar gizlenir: tercihi yok ve kimse onu istemiyor,
  // yani hiçbir halkaya giremez. Kontratta silme olmadığı için "yeniden üret"
  // eskilerin tercihlerini temizliyor; bu filtre de onları listeden düşürüyor.
  const wantedByAnyone = new Set<number>();
  for (const list of Object.values(wants)) for (const t of list) wantedByAnyone.add(t);
  const live = items.filter(
    (it) => (wants[it.id]?.length ?? 0) > 0 || wantedByAnyone.has(it.id)
  );
  const retiredCount = items.length - live.length;

  const rows = onlyCycle
    ? live.filter((it) => activeCycleItems.includes(it.id))
    : live;

  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl bg-[#0c0c14]/75 backdrop-blur-xl border border-white/[0.07] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Kayıtlı öğretmenler
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Sisteme girilen {live.length} aktif kadro ve her birinin sıralı tercihi.
            Halkalar bu tablodan çıkıyor.{retiredCount > 0 ? ` ${retiredCount} eski kayıt emekliye ayrıldı.` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          <button
            onClick={() => handleGenerate("replace", 30)}
            disabled={generating}
            title="30 öğretmeni yeniden üretir; önceki rastgele parti emekliye ayrılır (gerçek zincir işlemi)"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {generating ? (
              <>
                <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                Zincire yazılıyor…
              </>
            ) : (
              "🎲 30 Öğretmen Yeniden Üret"
            )}
          </button>

          <button
            onClick={() => handleGenerate("append", 5)}
            disabled={generating}
            title="Mevcut tahtaya 5 öğretmen ekler (gerçek zincir işlemi)"
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + 5 Öğretmen Ekle
          </button>
        </div>
      </div>

      {genMessage && (
        <div className="mb-4 text-xs rounded-xl px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.08] text-zinc-300 leading-relaxed">
          {genMessage}
        </div>
      )}

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
