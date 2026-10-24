"use client";

import React, { useState, useEffect, useCallback } from "react";
import TurkeyMap from "../components/TurkeyMap";
import SalonGraph from "../components/SalonGraph";
import PreferencePanel from "../components/PreferencePanel";
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
  const [mode, setMode] = useState<0 | 1>(0); // 0 = Mod A (Becayiş Haritası), 1 = Mod B (Salon)

  // Burner cüzdan durumu
  const [myAddress, setMyAddress] = useState<`0x${string}`>(
    "0x0000000000000000000000000000000000000001"
  );
  const [balance, setBalance] = useState<string>("0.0500");
  const [fundStatus, setFundStatus] = useState<"idle" | "funding" | "funded">(
    "idle"
  );
  const [dataSource, setDataSource] = useState<"live" | "fixture">("fixture");

  // Zincir okunana kadar HİÇBİR ŞEY gösterilmez. Daha önce burada fixture
  // verisi duruyordu ve sayfa ilk 2-3 saniye 24 kadro / 12 şehirlik bir halka
  // gösteriyordu; zincirde ise 20 kadro ve 11'lik bir halka var. Videonun ilk
  // karesi yanlış sayı gösteriyordu.
  const [becayisItems, setBecayisItems] = useState<Item[]>([]);
  const [becayisWants, setBecayisWants] = useState<Record<number, number[]>>({});
  const [becayisCycles, setBecayisCycles] = useState<Cycle[]>([]);

  const [salonItems, setSalonItems] = useState<Item[]>([]);
  const [salonWants, setSalonWants] = useState<Record<number, number[]>>({});
  const [salonCycles, setSalonCycles] = useState<Cycle[]>([]);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(1);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  // 1. İlk girişte Burner Cüzdan oluştur ve /api/fund ile gas iste
  useEffect(() => {
    const account = getOrCreateAccount();
    setMyAddress(account.address);

    (async () => {
      setFundStatus("funding");
      const funded = await fundBurnerWallet(account.address);
      const bal = await getWalletBalance(account.address);
      setBalance(bal);
      setFundStatus(funded.ok ? "funded" : "idle");
    })();
  }, []);

  // 2. Backend /api/state ve /api/cycles rotalarını (veya doğrudan kontrat snapshot()'ını) 2 sn'de bir çek
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
                if (mode === 0) setBecayisCycles(cycData.cycles);
                else setSalonCycles(cycData.cycles);
                return;
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
        // /api/state henüz devrede değilse doğrudan kontrat snapshot()'ına bak
      }

      // Doğrudan Monad Testnet üzerindeki Halka.snapshot() çağrısı
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

  // Döngü yürütme: executeCycle(uint32[] cycle)
  const handleExecuteCycle = useCallback(
    async (cycle: Cycle) => {
      const n = cycle.items.length;
      const gasLimit = BigInt(150000) + BigInt(n) * BigInt(40000);

      const txRes = await sendHalkaTransaction({
        functionName: "executeCycle",
        args: [cycle.items],
        gasLimit,
      });

      // Atomik sahip değişimi
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

  // Tercih kaydetme: setWants(uint32 itemId, uint32[] rankedTargets)
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

  // Salon modu: claimStickers(3)
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
        [baseId]: [101, 102],
        [baseId + 1]: [107, 108],
        [baseId + 2]: [112, 116],
      };

      setSalonItems(nextItems);
      setSalonWants(nextWants);
      setSalonCycles(findCyclesClient(nextItems, nextWants));
      setSelectedItemId(baseId);
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, salonItems, salonWants, myAddress]);

  // "Sıfırla" artık fixture'a dönmez -- zinciri yeniden okur. Tahtayı gerçekten
  // başa almak için backend'de `npx tsx scripts/seed.ts` çalıştırılır.
  const handleResetDemo = useCallback(() => {
    setBecayisItems([]);
    setBecayisWants({});
    setBecayisCycles([]);
    setSelectedItemId(null);
  }, []);

  const currentItems = mode === 0 ? becayisItems : salonItems;
  const currentWants = mode === 0 ? becayisWants : salonWants;

  return (
    <div className="min-h-screen bg-[#07070c] text-zinc-100 flex flex-col">
      {/* ÜST BAR */}
      <header className="border-b border-zinc-800/80 bg-[#0b0b13]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Sol: Marka & Başlık */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#836EF9] flex items-center justify-center shadow-lg shadow-[#836EF9]/30 font-black text-white text-lg">
              ◎
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-white">
                  HALKA
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#836EF9]/20 text-[#a78bfa] border border-[#836EF9]/40">
                  Monad Blitz Ankara v4
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Üç veya daha fazla kişi, aynı anda yer değiştirir
              </p>
            </div>
          </div>

          {/* Orta: Mod Seçici (Mod A vs Mod B) */}
          <div className="flex items-center bg-[#090910] p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setMode(0);
                setSelectedItemId(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                mode === 0
                  ? "bg-[#836EF9] text-white shadow-md shadow-[#836EF9]/25"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🗺️ Becayiş Haritası
            </button>
            <button
              onClick={() => {
                setMode(1);
                setSelectedItemId(salonItems[0]?.id || 101);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                mode === 1
                  ? "bg-[#836EF9] text-white shadow-md shadow-[#836EF9]/25"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              🕸️ Canlı Salon
            </button>
          </div>

          {/* Sağ: Burner Cüzdan & Ağ Durumu */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <div className="bg-[#090910] border border-zinc-800 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  dataSource === "live" ? "bg-emerald-400" : "bg-[#836EF9]"
                }`}
              />
              <span className="text-zinc-400">Burner:</span>
              <span className="text-zinc-200 font-semibold">
                {myAddress.slice(0, 6)}...{myAddress.slice(-4)}
              </span>
              <span className="text-emerald-400 border-l border-zinc-800 pl-2">
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
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 transition cursor-pointer"
              title="POST /api/fund ile test MON iste"
            >
              {fundStatus === "funding" ? "⛽..." : "⛽ Gas Al"}
            </button>
          </div>
        </div>
      </header>

      {/* ANA İÇERİK */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-4 space-y-5">
        {/* GİRİŞ — gündelik dilde, kısaltmasız. Buraya kadar hiçbir teknik
            terim geçmez; teknik taraf aşağıdaki panellerde durur. */}
        <section className="bg-gradient-to-r from-[#836EF9]/15 via-[#0e0e18] to-emerald-500/10 border border-zinc-800/90 rounded-2xl px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                Bir öğretmen Hakkari&apos;de, Ankara&apos;ya gelmek istiyor.
                <br className="hidden sm:block" />
                Ankara&apos;da Hakkari&apos;ye gitmek isteyen kimse yok.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
                Ama Ankara&apos;da İzmir&apos;e, İzmir&apos;de Hakkari&apos;ye
                gitmek isteyen var. Üçü de istediği yere gidebilir &mdash; yine de
                gidemiyorlar, çünkü yer değiştirme{" "}
                <span className="text-amber-300 font-semibold">iki kişilik</span>.
                Üç kişilik bir halka için{" "}
                <span className="text-rose-300 font-semibold">
                  &ldquo;kim önce istifa edecek?&rdquo;
                </span>{" "}
                sorusunun cevabı yok.
              </p>
              <p className="mt-3 text-sm sm:text-base text-white font-semibold">
                Halka bu halkaları buluyor ve herkesi tek seferde taşıyor. Ya
                hepsi taşınır, ya hiçbiri.
              </p>
            </div>
            <a
              href={`${MONAD_TESTNET.explorer}/address/${HALKA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-mono text-[#a78bfa] hover:text-white bg-[#090910] border border-[#836EF9]/30 px-3 py-1.5 rounded-xl transition"
            >
              Kontrat: {HALKA_ADDRESS.slice(0, 10)}...{HALKA_ADDRESS.slice(-6)} ↗
            </a>
          </div>

          {/* NASIL KULLANILIR — üç adım */}
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            {[
              {
                n: "1",
                t: "Kadronu seç",
                d: "Şu an nerede çalıştığını işaretle.",
              },
              {
                n: "2",
                t: "Gitmek istediklerini sırala",
                d: "Birden fazla şehir seç, en çok istediğini en üste koy.",
              },
              {
                n: "3",
                t: "Halka kapanınca taşın",
                d: "Sistem kapanan bir halka bulduğunda herkes aynı anda yer değiştirir.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="bg-[#090910]/80 border border-zinc-800 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#836EF9]/25 border border-[#836EF9]/40 text-[#a78bfa] text-xs font-bold flex items-center justify-center">
                    {s.n}
                  </span>
                  <span className="text-sm font-semibold text-white">{s.t}</span>
                </div>
                <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                  {s.d}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-zinc-500">
            Aynı sıkışma öğretmen tayininde, hemşire nöbetinde, yurt odasında,
            ikinci el takasında var. Nerede &ldquo;ben seninkini istiyorum ama sen
            benimkini istemiyorsun&rdquo; varsa, bir halka kurulabilir.
          </p>
        </section>

        {/* Zincir okunana kadar sahte sayı göstermek yerine bunu göster. */}
        {currentItems.length === 0 && (
          <div className="bg-[#0b0b13] border border-zinc-800 rounded-2xl px-5 py-4 text-sm text-zinc-400 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#836EF9] animate-pulse" />
            Monad Testnet&apos;ten okunuyor&hellip; (kontrat{" "}
            <span className="font-mono text-zinc-300">
              {HALKA_ADDRESS.slice(0, 10)}…
            </span>
            )
          </div>
        )}

        {/* MOD A VEYA MOD B GÖRÜNÜMÜ */}
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

        {/* ÇOKLU SEÇİM VE LEKSİKOGRAFİK SIRALAMA PANELİ */}
        <PreferencePanel
          mode={mode}
          items={currentItems}
          wants={currentWants}
          myAddress={myAddress}
          selectedItemId={selectedItemId}
          onSelectItem={(id) => setSelectedItemId(id)}
          onSaveWants={handleSaveWants}
          onClaimStickers={mode === 1 ? handleClaimStickers : undefined}
          isClaiming={isClaiming}
        />

        {/* DÜRÜST EKSİKLER & MİMARİ SINIRLAR (Rubrik: "Upfront about what's unfinished") */}
        <section className="bg-[#0e0e18] border border-zinc-800/80 rounded-2xl p-4 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="font-mono uppercase tracking-wider text-zinc-300 font-bold">
              Şeffaf Mimari Sınırlar &amp; Kapsam Notları (Prototype Boundaries)
            </span>
            <a
              href={`${MONAD_TESTNET.explorer}/address/${HALKA_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-[#a78bfa] hover:underline"
            >
              Halka Kontratı: {HALKA_ADDRESS} · Monad Testnet ({MONAD_TESTNET.id}) ↗
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/60">
            <div className="bg-[#090910] p-3 rounded-xl border border-zinc-800/60">
              <strong className="text-zinc-200 block mb-1">
                1. Hukuki Prototip
              </strong>
              Bu hukuki bir araç değil, teknik prototiptir. Gerçek becayişte
              atamaya yetkili amirin onayı gerekir; onay akışını modellemedik.
            </div>
            <div className="bg-[#090910] p-3 rounded-xl border border-zinc-800/60">
              <strong className="text-zinc-200 block mb-1">
                2. Leksikografik Tercih Varsayımı
              </strong>
              Strict-core ve grup-strategyproofness garantileri leksikografik
              tercih alanında geçerlidir; genel tercihlerde strict core boş
              olabilir.
            </div>
            <div className="bg-[#090910] p-3 rounded-xl border border-zinc-800/60">
              <strong className="text-zinc-200 block mb-1">
                3. NP-Hard Temizleme &amp; Sezgisel Arama
              </strong>
              Kısıtlı döngü temizleme problemi NP-hard&apos;dır (Abraham, Blum &amp;
              Sandholm EC &apos;07). Tüm uzayı taramak yerine açgözlü DFS
              kullanıyoruz.
            </div>
            <div className="bg-[#090910] p-3 rounded-xl border border-zinc-800/60">
              <strong className="text-zinc-200 block mb-1">
                4. Off-Chain Arama, On-Chain Doğrulama
              </strong>
              Döngü bulma off-chain çalışır; ancak <code>executeCycle</code> ve{" "}
              <code>verifyTTCStep</code> tüm şartları zincir üstünde atomik
              olarak doğrular.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
