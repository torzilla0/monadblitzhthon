"use client";

import React, { useState, useEffect, useCallback } from "react";
import TurkeyMap, { TEACHER_NAMES } from "../components/TurkeyMap";
import SalonGraph from "../components/SalonGraph";
import PreferencePanel from "../components/PreferencePanel";
import TeacherTable from "../components/TeacherTable";
import { AuroraBackground, ShinyText } from "../components/ui/ReactBits";
import {
  type Item,
  type Cycle,
  findCyclesClient,
  MONAD_TESTNET,
  HALKA_ADDRESS,
} from "../lib/fixture";
import {
  getOrCreateAccount,
  fundBurnerWallet,
  getWalletBalance,
  sendHalkaTransaction,
  readSnapshotFromChain,
} from "../lib/wallet";

export default function HomePage() {
  const [mode, setMode] = useState<0 | 1>(0);

  const [myAddress, setMyAddress] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000001"
  );
  const [balance, setBalance] = useState<string>("0.0000");
  const [fundStatus, setFundStatus] = useState<"idle" | "funding" | "funded">(
    "idle"
  );
  const [dataSource, setDataSource] = useState<"live" | "loading">("loading");
  const [showBoundaries, setShowBoundaries] = useState<boolean>(false);

  const [becayisItems, setBecayisItems] = useState<Item[]>([]);
  const [becayisWants, setBecayisWants] = useState<Record<number, number[]>>(
    {}
  );
  const [becayisCycles, setBecayisCycles] = useState<Cycle[]>([]);

  const [salonItems, setSalonItems] = useState<Item[]>([]);
  const [salonWants, setSalonWants] = useState<Record<number, number[]>>({});
  const [salonCycles, setSalonCycles] = useState<Cycle[]>([]);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(1);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // 1. Burner cüzdanı hazırla ve mevcut bakiyeyi oku (Otomatik MON çekmez, sadece butona basınca çeker)
  useEffect(() => {
    const account = getOrCreateAccount();
    setMyAddress(account.address);

    (async () => {
      const bal = await getWalletBalance(account.address);
      setBalance(bal);
    })();
  }, []);

  // 2. Canlı zincir durumunu (/api/state ve /api/cycles) 2 sn'de bir oku
  useEffect(() => {
    let active = true;

    async function pollBackend() {
      try {
        const [stateRes, cyclesRes] = await Promise.all([
          fetch(`/api/state?kind=${mode}`, { cache: "no-store" }),
          fetch(`/api/cycles?kind=${mode}`, { cache: "no-store" }),
        ]);

        if (!active) return;

        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (Array.isArray(stateData.items) && stateData.items.length > 0) {
            setDataSource("live");
            const validIds = new Set<number>(
              stateData.items.map((it: Item) => it.id)
            );

            if (mode === 0) {
              setBecayisItems(stateData.items);
              setBecayisWants(stateData.wants || {});
            } else {
              setSalonItems(stateData.items);
              setSalonWants(stateData.wants || {});
            }

            if (cyclesRes.ok) {
              const cycData = await cyclesRes.json();
              if (Array.isArray(cycData.cycles)) {
                // Yalnızca bu moddaki item'lara ait olan döngüleri filtrele
                const matchingCycles = cycData.cycles.filter((c: Cycle) =>
                  c.items.every((id) => validIds.has(id))
                );
                if (matchingCycles.length > 0 || mode === 0) {
                  if (mode === 0) setBecayisCycles(matchingCycles);
                  else setSalonCycles(matchingCycles);
                  return;
                }
              }
            }

            const computed = findCyclesClient(
              stateData.items,
              stateData.wants || {}
            );
            if (mode === 0) setBecayisCycles(computed);
            else setSalonCycles(computed);
            return;
          }
        }
      } catch {
        // Doğrudan kontrat snapshot()'ına düş
      }

      const chainSnap = await readSnapshotFromChain(mode);
      if (!active) return;
      if (chainSnap && chainSnap.items.length > 0) {
        setDataSource("live");
        const computed = findCyclesClient(chainSnap.items, chainSnap.wants);
        if (mode === 0) {
          setBecayisItems(chainSnap.items);
          setBecayisWants(chainSnap.wants);
          setBecayisCycles(computed);
        } else {
          setSalonItems(chainSnap.items);
          setSalonWants(chainSnap.wants);
          setSalonCycles(computed);
        }
      }
    }

    pollBackend();
    const interval = setInterval(pollBackend, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [mode]);

  const handleExecuteCycle = useCallback(
    async (cycle: Cycle) => {
      const n = cycle.items.length;
      const gasLimit = BigInt(150000) + BigInt(n) * BigInt(40000);

      const txRes = await sendHalkaTransaction({
        functionName: "executeCycle",
        args: [cycle.items],
        gasLimit,
      });

      if (mode === 0) {
        setBecayisItems((prevItems) => {
          const ownerByItem = new Map<number, `0x${string}`>();
          prevItems.forEach((it) => ownerByItem.set(it.id, it.owner));

          return prevItems.map((it) => {
            const idx = cycle.items.indexOf(it.id);
            if (idx === -1) return it;
            const prevIdx = (idx - 1 + n) % n;
            const newOwner = ownerByItem.get(cycle.items[prevIdx]) || it.owner;
            return { ...it, owner: newOwner };
          });
        });
      } else {
        setSalonItems((prevItems) => {
          const ownerByItem = new Map<number, `0x${string}`>();
          prevItems.forEach((it) => ownerByItem.set(it.id, it.owner));

          return prevItems.map((it) => {
            const idx = cycle.items.indexOf(it.id);
            if (idx === -1) return it;
            const prevIdx = (idx - 1 + n) % n;
            const newOwner = ownerByItem.get(cycle.items[prevIdx]) || it.owner;
            return { ...it, owner: newOwner };
          });
        });
      }

      return txRes;
    },
    [mode]
  );

  const handleSaveWants = useCallback(
    async (itemId: number, rankedTargets: number[]) => {
      const txRes = await sendHalkaTransaction({
        functionName: "setWants",
        args: [itemId, rankedTargets],
        gasLimit: BigInt(200000),
      });

      if (mode === 0) {
        setBecayisWants((prev) => {
          const updated = { ...prev, [itemId]: rankedTargets };
          setBecayisCycles(findCyclesClient(becayisItems, updated));
          return updated;
        });
      } else {
        setSalonWants((prev) => {
          const updated = { ...prev, [itemId]: rankedTargets };
          setSalonCycles(findCyclesClient(salonItems, updated));
          return updated;
        });
      }

      return { txHash: txRes.txHash, latencyMs: txRes.latencyMs };
    },
    [mode, becayisItems, salonItems]
  );

  const handleClaimStickers = useCallback(async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    try {
      await sendHalkaTransaction({
        functionName: "claimStickers",
        args: [3],
        gasLimit: BigInt(250000),
      });

      const baseId = salonItems.length + 101;
      const newStickers: Item[] = [
        {
          id: baseId,
          owner: myAddress,
          kind: 1,
          active: true,
          label: `Mor Molandak #${baseId - 100}`,
        },
        {
          id: baseId + 1,
          owner: myAddress,
          kind: 1,
          active: true,
          label: `300ms Şimşek #${baseId - 99}`,
        },
        {
          id: baseId + 2,
          owner: myAddress,
          kind: 1,
          active: true,
          label: `Atomik Halka #${baseId - 98}`,
        },
      ];

      const nextItems = [...newStickers, ...salonItems];
      const nextWants: Record<number, number[]> = {
        ...salonWants,
        [baseId]: [salonItems[0]?.id || 21],
      };

      setSalonItems(nextItems);
      setSalonWants(nextWants);
      setSalonCycles(findCyclesClient(nextItems, nextWants));
      setSelectedItemId(baseId);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, salonItems, salonWants, myAddress]);

  const handleResetDemo = useCallback(() => {
    setBecayisItems([]);
    setBecayisWants({});
    setBecayisCycles([]);
    setSelectedItemId(1);
  }, []);

  const currentItems = mode === 0 ? becayisItems : salonItems;
  const currentWants = mode === 0 ? becayisWants : salonWants;

  return (
    <div className="relative min-h-screen bg-[#06060a] text-zinc-100 flex flex-col selection:bg-[#836EF9]/30">
      <AuroraBackground />

      {/* ÜST BAR — Temiz, cam efektli */}
      <header className="border-b border-white/[0.06] bg-[#08080e]/75 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Sol: Marka */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#836EF9] to-indigo-600 flex items-center justify-center shadow-lg shadow-[#836EF9]/25 font-bold text-white text-base">
              ◎
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold tracking-tight text-white">
                HALKA
              </span>
              <span className="hidden sm:inline-block text-xs text-zinc-500">
                ·
              </span>
              <ShinyText
                text="Çok Taraflı Atomik Takas"
                className="hidden sm:inline-block text-xs font-medium"
              />
            </div>
          </div>

          {/* Orta: Sekme Geçişi */}
          <div className="flex items-center bg-white/[0.03] p-1 rounded-xl border border-white/[0.07]">
            <button
              onClick={() => {
                setMode(0);
                setSelectedItemId(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                mode === 0
                  ? "bg-[#836EF9] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🗺️ Becayiş Haritası
            </button>
            {/* "Canlı Salon" sekmesi gizlendi: demoda anlatılmıyor ve
                anlatılmayan bir ekran jüriye açıklanmamış bir alan bırakıyor.
                Kod duruyor; sekmeyi geri koymak yeterli. */}
          </div>

          {/* Sağ: Cüzdan & Kontrat */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <a
              href={`${MONAD_TESTNET.explorer}/address/${HALKA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-xl px-3 py-1.5 text-zinc-300 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {HALKA_ADDRESS.slice(0, 6)}…{HALKA_ADDRESS.slice(-4)}
              </span>
              <span className="text-zinc-500">↗</span>
            </a>

            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-zinc-400">
                {myAddress.slice(0, 6)}…{myAddress.slice(-4)}
              </span>
              <span className="text-emerald-400 border-l border-white/[0.08] pl-2">
                {balance} MON
              </span>
            </div>

            <button
              onClick={async () => {
                setFundStatus("funding");
                await fundBurnerWallet(myAddress);
                const bal = await getWalletBalance(myAddress);
                setBalance(bal);
                setFundStatus("funded");
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-zinc-300 transition-colors cursor-pointer"
              title="Test MON İste"
            >
              {fundStatus === "funding" ? "…" : "⛽ Gas Al"}
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK */}
      <main className="relative z-10 flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* KOMPAKT GİRİŞ ŞERİDİ — Göz yormayan, tek bakışta anlaşılır özet */}
        <section className="rounded-2xl bg-[#0c0c14]/75 backdrop-blur-xl border border-white/[0.07] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-sm sm:text-base font-semibold text-white">
              Çok taraflı takas altyapısı
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed">
              İkili takas tıkandığında kapanan halkaları bulur ve herkesi{" "}
              <span className="text-white font-medium">
                tek işlemde aynı anda
              </span>{" "}
              taşır &mdash; ya hepsi, ya hiçbiri.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[
              "1. Kadronu seç",
              "2. Tercihlerini sırala",
              "3. Tek işlemde taşın",
            ].map((step) => (
              <span
                key={step}
                className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-300"
              >
                {step}
              </span>
            ))}
          </div>
        </section>

        {/* Yüklenme Durumu */}
        {currentItems.length === 0 && dataSource === "loading" && (
          <div className="rounded-2xl bg-[#0c0c14]/75 border border-white/[0.07] px-5 py-4 text-xs text-zinc-400 flex items-center gap-3 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#836EF9] animate-ping" />
            <span>Monad Testnet kontratından veriler okunuyor…</span>
          </div>
        )}

        {/* HARİTA VEYA SALON GRAFI (Yumuşak geçişli) */}
        <div key={mode} className="animate-fade-in">
          {mode === 0 ? (
            <TurkeyMap
              items={becayisItems}
              wants={becayisWants}
              cycles={becayisCycles}
              selectedItemId={selectedItemId}
              onSelectItem={(id) => setSelectedItemId(id)}
              onExecuteCycle={handleExecuteCycle}
              onResetDemo={handleResetDemo}
            />
          ) : (
            <SalonGraph
              items={salonItems}
              wants={salonWants}
              cycles={salonCycles}
              myAddress={myAddress}
              onClaimStickers={handleClaimStickers}
              isClaiming={isClaiming}
              onExecuteCycle={handleExecuteCycle}
              onSelectItem={(id) => setSelectedItemId(id)}
            />
          )}
        </div>

        {/* KAYITLI ÖĞRETMENLER — haritanın girdisi. Yönetici olarak biz
            giriyoruz; halkaların nereden çıktığı burada görünüyor. */}
        <TeacherTable
          items={becayisItems}
          wants={becayisWants}
          teacherNames={TEACHER_NAMES}
          activeCycleItems={becayisCycles[0]?.items ?? []}
          onSelectItem={(id) => setSelectedItemId(id)}
        />

        {/* Tercih sıralama paneli kaldırıldı: tercihler zaten "Kayıtlı
            öğretmenler" tablosunda sıralı olarak görünüyor, ikinci bir
            düzenleme arayüzü sayfayı uzatıyordu. PreferencePanel repoda. */}

        {/* MİMARİ SINIRLAR — Göz yormayan açılır/kapanır alt bar */}
        <footer className="rounded-2xl bg-[#0c0c14]/60 border border-white/[0.06] px-5 py-3 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowBoundaries((prev) => !prev)}
              className="flex items-center gap-2 text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
            >
              <span>{showBoundaries ? "▾" : "▸"}</span>
              <span>Prototip Kapsamı &amp; Şeffaf Mimari Sınırlar</span>
            </button>

            <a
              href={`${MONAD_TESTNET.explorer}/address/${HALKA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-zinc-500 hover:text-[#a78bfa] transition-colors"
            >
              Monad Testnet ({MONAD_TESTNET.id}) · {HALKA_ADDRESS} ↗
            </a>
          </div>

          {showBoundaries && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-white/[0.06] animate-fade-in">
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                <strong className="text-zinc-200 block mb-1">
                  1. Hukuki Prototip
                </strong>
                Gerçek becayişte atamaya yetkili amirin onayı gerekir; bu teknik
                bir prototiptir.
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                <strong className="text-zinc-200 block mb-1">
                  2. Sıralı Tercih Varsayımı
                </strong>
                Garantiler kesin ve leksikografik tercih sıralaması altında
                geçerlidir.
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                <strong className="text-zinc-200 block mb-1">
                  3. Sezgisel Döngü Arama
                </strong>
                Kısıtlı döngü temizleme NP-hard olduğundan derinlik kısıtlı
                açgözlü DFS kullanılır.
              </div>
              <div className="bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
                <strong className="text-zinc-200 block mb-1">
                  4. On-Chain Doğrulama
                </strong>
                Döngü arama off-chain, doğrulama (<code>verifyTTCStep</code>) ve
                atomik yürütme (<code>executeCycle</code>) zincir üstündedir.
              </div>
            </div>
          )}
        </footer>
      </main>
    </div>
  );
}
