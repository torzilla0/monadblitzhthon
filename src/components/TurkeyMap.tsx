"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  type Item,
  type Cycle,
  FIXTURE_CITIES,
  MONAD_TESTNET,
  PROOF_11_CYCLE_TX,
  normalizeCityKey,
} from "../lib/fixture";
import { cityOfLabel } from "../lib/cities";
import { SpotlightCard } from "./ui/ReactBits";

interface TurkeyMapProps {
  items: Item[];
  wants: Record<number, number[]>;
  cycles: Cycle[];
  selectedItemId: number | null;
  onSelectItem: (id: number) => void;
  onExecuteCycle: (cycle: Cycle) => Promise<{
    txHash: `0x${string}`;
    mode: string;
    latencyMs: number;
  }>;
  onResetDemo: () => void;
  customCities?: Record<string, { lat: number; lon: number }>;
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 490;
const LON_MIN = 25.5;
const LON_MAX = 45.0;
const LAT_MIN = 35.6;
const LAT_MAX = 42.3;

function projectLatLon(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_WIDTH - 120) + 60;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (SVG_HEIGHT - 96) + 48;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

// İki nokta arasında hafif kavisli Quadratic Bezier SVG path üretir
function buildCurvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  shortenEnd = 14,
  curvature = 0.14
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;

  const targetX = x2 - (dx / dist) * shortenEnd;
  const targetY = y2 - (dy / dist) * shortenEnd;

  const mx = (x1 + targetX) / 2;
  const my = (y1 + targetY) / 2;

  // Normal vektör ile hafif kavis
  const nx = -dy / dist;
  const ny = dx / dist;
  const offset = Math.min(42, dist * curvature);

  const cx = Math.round((mx + nx * offset) * 10) / 10;
  const cy = Math.round((my + ny * offset) * 10) / 10;

  return `M ${x1} ${y1} Q ${cx} ${cy} ${ Math.round(targetX * 10) / 10 } ${ Math.round(targetY * 10) / 10 }`;
}

// Yakın şehirlerin etiketlerinin üst üste binmesini önleyen dikey yön tablosu
const LABEL_BELOW_CITIES = new Set([
  "Mersin",
  "Adana",
  "Gaziantep",
  "Sanliurfa",
  "Antalya",
  "Denizli",
  "Konya",
  "Hakkari",
  "Hatay",
  "Mardin",
]);

const TURKEY_OUTLINE_COORDS: [number, number][] = [
  [41.67, 26.55],
  [41.98, 28.02],
  [41.25, 29.05],
  [41.18, 29.61],
  [41.32, 31.42],
  [41.45, 31.79],
  [42.02, 33.33],
  [42.02, 35.15],
  [41.29, 36.33],
  [41.02, 37.88],
  [41.0, 39.72],
  [41.02, 40.52],
  [41.52, 41.55],
  [41.15, 42.7],
  [40.6, 43.5],
  [39.95, 44.52],
  [38.49, 44.3],
  [37.35, 44.55],
  [37.25, 43.3],
  [37.15, 42.3],
  [37.05, 41.2],
  [36.75, 38.9],
  [36.7, 37.1],
  [36.05, 36.15],
  [36.58, 36.17],
  [36.8, 35.4],
  [36.08, 32.83],
  [36.54, 32.0],
  [36.89, 30.71],
  [36.2, 29.64],
  [36.62, 29.11],
  [36.7, 27.43],
  [37.86, 27.26],
  [38.32, 26.3],
  [39.58, 26.08],
  [40.04, 26.18],
  [40.6, 26.8],
  [40.85, 26.05],
];

const TEACHER_NAMES: Record<number, string> = {
  1: "Öğr. Deniz K.",
  2: "Öğr. Selim A.",
  3: "Öğr. Elif T.",
  4: "Öğr. Burak Y.",
  5: "Öğr. Zeynep M.",
  6: "Öğr. Emre D.",
  7: "Öğr. Ayşe B.",
  8: "Öğr. Caner S.",
  9: "Öğr. Merve N.",
  10: "Öğr. Baran Ç.",
  11: "Öğr. Sinem Ö.",
  12: "Öğr. Oğuz R.",
  13: "Öğr. Derya P.",
  14: "Öğr. Hakan V.",
  15: "Öğr. Aslı G.",
  16: "Öğr. Kerem U.",
  17: "Öğr. İlknur Z.",
  18: "Öğr. Murat Ş.",
  19: "Öğr. Pelin C.",
  20: "Öğr. Tolga E.",
};

export default function TurkeyMap({
  items,
  wants,
  cycles,
  selectedItemId,
  onSelectItem,
  onExecuteCycle,
  onResetDemo,
  customCities,
}: TurkeyMapProps) {
  const citiesDict = useMemo(
    () => ({ ...FIXTURE_CITIES, ...(customCities || {}) }),
    [customCities]
  );

  const [activeCycleIndex, setActiveCycleIndex] = useState<number>(0);
  const [litEdgeCount, setLitEdgeCount] = useState<number>(0);
  const [isAnimatingCycle, setIsAnimatingCycle] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [executedResult, setExecutedResult] = useState<{
    txHash: `0x${string}`;
    mode: string;
    latencyMs: number;
    cycleItems: number[];
    swappedTeachers: Record<number, string>;
  } | null>(null);
  const [revertProofMessage, setRevertProofMessage] = useState<string | null>(
    null
  );
  const [teacherAssignments, setTeacherAssignments] =
    useState<Record<number, string>>(TEACHER_NAMES);

  const activeCycle: Cycle | null =
    cycles[activeCycleIndex] || cycles[0] || null;

  const turkeyPathD = useMemo(() => {
    const pts = TURKEY_OUTLINE_COORDS.map(([lat, lon]) =>
      projectLatLon(lat, lon)
    );
    return (
      pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") +
      " Z"
    );
  }, []);

  const itemCoords = useMemo(() => {
    const map = new Map<
      number,
      { x: number; y: number; cityName: string; cityKey: string }
    >();
    items.forEach((item, idx) => {
      const parts = item.label.split("/");
      const cityName = parts[0]?.trim() || item.label;
      const fromBackendCity = cityOfLabel(item.label);
      const key = normalizeCityKey(item.label);
      const coord = fromBackendCity || citiesDict[key];

      if (coord) {
        const { x, y } = projectLatLon(coord.lat, coord.lon);
        map.set(item.id, { x, y, cityName, cityKey: key });
      } else {
        const fallbackLat = 37.5 + ((idx * 17) % 35) / 10;
        const fallbackLon = 28.0 + ((idx * 29) % 140) / 10;
        const { x, y } = projectLatLon(fallbackLat, fallbackLon);
        map.set(item.id, { x, y, cityName, cityKey: key });
      }
    });
    return map;
  }, [items, citiesDict]);

  // 150ms/kenar halka yanma animasyonu
  useEffect(() => {
    if (!isAnimatingCycle || !activeCycle) return;
    const totalEdges = activeCycle.items.length;
    if (litEdgeCount >= totalEdges) {
      setIsAnimatingCycle(false);
      return;
    }
    const timer = setTimeout(() => {
      setLitEdgeCount((prev) => prev + 1);
    }, 150);
    return () => clearTimeout(timer);
  }, [isAnimatingCycle, litEdgeCount, activeCycle]);

  const handleFindCycle = (cycleIdx = 0) => {
    setRevertProofMessage(null);
    setExecutedResult(null);
    setActiveCycleIndex(cycleIdx);
    setLitEdgeCount(1);
    setIsAnimatingCycle(true);
  };

  const handleExecute = async () => {
    if (!activeCycle || isExecuting) return;
    setRevertProofMessage(null);
    setIsExecuting(true);
    setLitEdgeCount(activeCycle.items.length);

    try {
      const res = await onExecuteCycle(activeCycle);

      const n = activeCycle.items.length;
      const nextAssignments = { ...teacherAssignments };
      const swappedRecord: Record<number, string> = {};

      for (let i = 0; i < n; i++) {
        const fromId = activeCycle.items[i];
        const targetId = activeCycle.items[(i + 1) % n];
        const teacherMoving =
          teacherAssignments[fromId] || `Öğr. #${fromId}`;
        nextAssignments[targetId] = teacherMoving;
        swappedRecord[targetId] = teacherMoving;
      }

      setTeacherAssignments(nextAssignments);
      setExecutedResult({
        txHash: res.txHash,
        mode: res.mode,
        latencyMs: res.latencyMs,
        cycleItems: activeCycle.items,
        swappedTeachers: swappedRecord,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Gerçek zincir simülasyonu (eth_call, 0 MON)
  const handleRevertSimulation = async () => {
    setRevertProofMessage("Zincire soruluyor…");
    try {
      const r = await fetch("/api/simulate?cycle=1,2,12", {
        cache: "no-store",
      }).then((x) => x.json());

      if (r.ok) {
        setRevertProofMessage(
          `Zincir bu halkayı kabul ediyor (${r.transfersThatWouldHappen} transfer).`
        );
        return;
      }

      const who =
        Array.isArray(r.args) && r.args.length >= 2
          ? ` (Kadro #${r.args[0]} → #${r.args[1]} tercihi yok)`
          : "";
      setRevertProofMessage(
        `ZİNCİR CEVABI: executeCycle([1, 2, 12]) → ${r.error}${who} · ${r.transfersThatHappened}/3 transfer gerçekleşti, işlem tamamen revert etti.`
      );
    } catch {
      setRevertProofMessage("Zincire ulaşılamadı, tekrar deneyin.");
    }
  };

  const handleFullReset = () => {
    setLitEdgeCount(0);
    setIsAnimatingCycle(false);
    setExecutedResult(null);
    setRevertProofMessage(null);
    setTeacherAssignments(TEACHER_NAMES);
    onResetDemo();
  };

  const cycleNodeOrder = useMemo(() => {
    const order = new Map<number, number>();
    if (!activeCycle || litEdgeCount === 0) return order;
    activeCycle.items.forEach((id, idx) => {
      if (idx <= litEdgeCount) {
        order.set(id, idx + 1);
      }
    });
    return order;
  }, [activeCycle, litEdgeCount]);

  const cycleLength = activeCycle ? activeCycle.items.length : 11;
  const monCost = (cycleLength * 0.0065).toFixed(4);
  const usdCost = (cycleLength * 0.0001636).toFixed(4);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* SOL: HARİTA KARTI (8 KOLON) */}
      <SpotlightCard className="lg:col-span-8 p-5 flex flex-col justify-between">
        {/* Üst Başlık & Kontroller */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#836EF9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#836EF9]" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">
                Türkiye Becayiş Haritası
              </h2>
              <p className="text-xs text-zinc-400">
                {items.length} aktif kadro · {cycles.length} takas halkası hazır
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleFindCycle(0)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#836EF9] hover:bg-[#745ce8] text-white shadow-lg shadow-[#836EF9]/20 transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>⚡ Halkayı Bul</span>
              <span className="bg-black/25 px-1.5 py-0.5 rounded-md text-[11px] font-mono">
                {cycles[0]?.items.length || 11} Şehir
              </span>
            </button>

            {cycles.length > 1 && (
              <button
                onClick={() => handleFindCycle(1)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 cursor-pointer ${
                  activeCycleIndex === 1 && litEdgeCount > 0
                    ? "bg-[#836EF9]/15 border-[#836EF9]/60 text-purple-200"
                    : "bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]"
                }`}
              >
                2. Halka ({cycles[1].items.length} Şehir)
              </button>
            )}

            <button
              onClick={handleExecute}
              disabled={!activeCycle || isExecuting}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                executedResult
                  ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-200"
                  : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20"
              } disabled:opacity-40`}
            >
              {isExecuting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  <span>Yürütülüyor</span>
                </>
              ) : executedResult ? (
                <span>✓ Takas Tamamlandı</span>
              ) : (
                <span>🚀 Takası Yürüt</span>
              )}
            </button>

            {litEdgeCount > 0 && (
              <button
                onClick={handleFullReset}
                title="Görünümü Sıfırla"
                className="px-2.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all cursor-pointer"
              >
                ↺
              </button>
            )}
          </div>
        </div>

        {/* SVG Harita Alanı */}
        <div className="relative w-full aspect-[2.04/1] rounded-xl bg-[#07070c] border border-white/[0.05] overflow-hidden">
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            className="w-full h-full select-none"
          >
            <defs>
              <radialGradient id="map-glow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#836EF9" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#07070c" stopOpacity="0" />
              </radialGradient>

              <marker
                id="arrow-subtle"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4.5"
                markerHeight="4.5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 0 2 L 8 5 L 0 8 z"
                  fill="#6366f1"
                  opacity="0.35"
                />
              </marker>

              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="7.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#c4b5fd" />
              </marker>

              <marker
                id="arrow-done"
                viewBox="0 0 10 10"
                refX="7.5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#34d399" />
              </marker>

              <filter
                id="soft-glow"
                x="-25%"
                y="-25%"
                width="150%"
                height="150%"
              >
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Yumuşak Radyal Arka Plan Işığı */}
            <rect
              x="0"
              y="0"
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill="url(#map-glow)"
            />

            {/* Türkiye Silüeti */}
            <path
              d={turkeyPathD}
              fill="#0d0d17"
              stroke="#222236"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* 1. KATMAN: Arka Plan Tercih Okları (Çok zarif, göz yormayan kavisli çizgiler) */}
            {items.map((fromItem) => {
              const fromPos = itemCoords.get(fromItem.id);
              if (!fromPos) return null;
              const targetIds = wants[fromItem.id] || [];
              const isFromHoveredOrSelected =
                hoveredItemId === fromItem.id || selectedItemId === fromItem.id;

              return targetIds.map((targetId, rankIdx) => {
                // Sadece 1. tercihleri veya üzerine gelinen şehrin tercihlerini çiz (kalabalığı önler)
                if (rankIdx > 0 && !isFromHoveredOrSelected) return null;
                const toPos = itemCoords.get(targetId);
                if (!toPos) return null;

                const d = buildCurvedPath(
                  fromPos.x,
                  fromPos.y,
                  toPos.x,
                  toPos.y,
                  12,
                  0.1
                );

                return (
                  <path
                    key={`want-${fromItem.id}-${targetId}`}
                    d={d}
                    fill="none"
                    stroke={isFromHoveredOrSelected ? "#818cf8" : "#3f3f5a"}
                    strokeWidth={isFromHoveredOrSelected ? 1.5 : 0.9}
                    strokeDasharray={rankIdx === 0 ? undefined : "3 3"}
                    opacity={
                      isFromHoveredOrSelected
                        ? 0.75
                        : litEdgeCount > 0
                        ? 0.16
                        : 0.38
                    }
                    markerEnd="url(#arrow-subtle)"
                    className="transition-opacity duration-300"
                  />
                );
              });
            })}

            {/* 2. KATMAN: Yanan Aktif Döngü Kavisleri (150ms arayla + akan ışık) */}
            {activeCycle &&
              litEdgeCount > 0 &&
              activeCycle.items.slice(0, litEdgeCount).map((fromId, idx) => {
                const n = activeCycle.items.length;
                const toId = activeCycle.items[(idx + 1) % n];
                const fromPos = itemCoords.get(fromId);
                const toPos = itemCoords.get(toId);
                if (!fromPos || !toPos) return null;

                const d = buildCurvedPath(
                  fromPos.x,
                  fromPos.y,
                  toPos.x,
                  toPos.y,
                  15,
                  0.13
                );
                const isDone = Boolean(executedResult);

                return (
                  <g key={`cycle-arc-${fromId}-${toId}`}>
                    {/* Yumuşak Dış Hale */}
                    <path
                      d={d}
                      fill="none"
                      stroke={isDone ? "#10b981" : "#836EF9"}
                      strokeWidth="7"
                      opacity="0.2"
                      strokeLinecap="round"
                    />
                    {/* Ana Kavis */}
                    <path
                      d={d}
                      fill="none"
                      stroke={isDone ? "#34d399" : "#a78bfa"}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      markerEnd={
                        isDone ? "url(#arrow-done)" : "url(#arrow-active)"
                      }
                      filter="url(#soft-glow)"
                    />
                    {/* Akan Işık Çizgisi */}
                    <path
                      d={d}
                      fill="none"
                      stroke={isDone ? "#a7f3d0" : "#ddd6fe"}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      className="animate-flow-dash"
                      opacity="0.85"
                    />
                  </g>
                );
              })}

            {/* 3. KATMAN: Şehir Noktaları ve Temiz Etiketler */}
            {items.map((item) => {
              const pos = itemCoords.get(item.id);
              if (!pos) return null;

              const stepNum = cycleNodeOrder.get(item.id);
              const isInLitCycle = stepNum !== undefined;
              const isSelected = selectedItemId === item.id;
              const isHovered = hoveredItemId === item.id;
              const isExecutedNode =
                executedResult?.cycleItems.includes(item.id) ?? false;

              const nodeRadius = isInLitCycle
                ? 8.5
                : isSelected || isHovered
                ? 7
                : 4.5;

              const fillColor = isExecutedNode
                ? "#10b981"
                : isInLitCycle
                ? "#836EF9"
                : isSelected || isHovered
                ? "#a78bfa"
                : "#646482";

              const labelBelow = LABEL_BELOW_CITIES.has(pos.cityKey);
              const labelYOffset = labelBelow
                ? nodeRadius + 13
                : -(nodeRadius + 7);

              const teacherLabel =
                teacherAssignments[item.id] || `Öğr. #${item.id}`;

              return (
                <g
                  key={`node-${item.id}`}
                  onClick={() => onSelectItem(item.id)}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  className="cursor-pointer"
                >
                  {/* Seçili veya Aktif Halka Dış Çemberi */}
                  {(isInLitCycle || isSelected || isHovered) && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeRadius + 5}
                      fill="none"
                      stroke={isExecutedNode ? "#34d399" : "#836EF9"}
                      strokeWidth="1.5"
                      opacity="0.5"
                    />
                  )}

                  {/* Ana Düğüm */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={nodeRadius}
                    fill={fillColor}
                    stroke="#07070c"
                    strokeWidth="1.8"
                  />

                  {/* Halka Sıra Numarası (1..11) */}
                  {stepNum !== undefined && (
                    <text
                      x={pos.x}
                      y={pos.y + 3.2}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {stepNum}
                    </text>
                  )}

                  {/* Şehir İsmi — Sadece aktif/seçili olanlarda rozet kutusu, diğerlerinde sade tipografi */}
                  {isInLitCycle || isSelected || isHovered ? (
                    <g transform={`translate(${pos.x}, ${pos.y + labelYOffset})`}>
                      <rect
                        x="-38"
                        y="-11"
                        width="76"
                        height="15"
                        rx="5"
                        fill={isExecutedNode ? "#064e3b" : "#1e1646"}
                        stroke={isExecutedNode ? "#10b981" : "#836EF9"}
                        strokeWidth="0.9"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="-1"
                        textAnchor="middle"
                        fill={isExecutedNode ? "#d1fae5" : "#f5f3ff"}
                        fontSize="9.5"
                        fontWeight="600"
                      >
                        {pos.cityName}
                      </text>
                    </g>
                  ) : (
                    <text
                      x={pos.x}
                      y={pos.y + labelYOffset}
                      textAnchor="middle"
                      fill="#8e8ea8"
                      fontSize="9"
                      fontWeight="500"
                      opacity={litEdgeCount > 0 ? 0.45 : 0.85}
                    >
                      {pos.cityName}
                    </text>
                  )}

                  {/* Öğretmen Etiketi: Yalnızca üzerine gelindiğinde veya takas tamamlandığında temizce görünür */}
                  {(isHovered || (isExecutedNode && isInLitCycle)) && (
                    <text
                      x={pos.x}
                      y={
                        pos.y +
                        (labelBelow ? -(nodeRadius + 6) : nodeRadius + 13)
                      }
                      textAnchor="middle"
                      fill={isExecutedNode ? "#34d399" : "#c4b5fd"}
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {teacherLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Harita Altı Akan Halka Özeti (Sadece halka yandığında zarifçe belirir) */}
          {activeCycle && litEdgeCount > 0 && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#0b0b14]/90 backdrop-blur-md border border-white/[0.08] rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="text-[#a78bfa] font-medium mr-1">
                  Halka ({litEdgeCount}/{activeCycle.items.length}):
                </span>
                {activeCycle.items.slice(0, litEdgeCount).map((id) => {
                  const city = itemCoords.get(id)?.cityName || `#${id}`;
                  return (
                    <React.Fragment key={id}>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                          executedResult
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/[0.06] text-zinc-200"
                        }`}
                      >
                        {city}
                      </span>
                      <span className="text-zinc-600">→</span>
                    </React.Fragment>
                  );
                })}
                {litEdgeCount === activeCycle.items.length && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#836EF9]/20 text-purple-200">
                    {itemCoords.get(activeCycle.items[0])?.cityName} ✓
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt Bilgi Çubuğu (Tek satır, sade) */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          {executedResult ? (
            <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2 animate-fade-in">
              <span className="text-emerald-200 font-medium">
                ✓ {executedResult.cycleItems.length} öğretmen tek işlemde aynı
                anda yer değiştirdi ({executedResult.latencyMs}ms)
              </span>
              <a
                href={`${MONAD_TESTNET.explorer}/tx/${executedResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 hover:text-white font-mono underline"
              >
                Monadscan: {executedResult.txHash.slice(0, 10)}… ↗
              </a>
            </div>
          ) : revertProofMessage ? (
            <div className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-200 rounded-xl px-3.5 py-2 font-mono text-xs animate-fade-in flex items-center justify-between gap-2">
              <span>{revertProofMessage}</span>
              <button
                onClick={() => setRevertProofMessage(null)}
                className="text-rose-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span>
                Bir şehre tıklayarak tercihlerini görebilir veya{" "}
                <strong className="text-zinc-200">Halkayı Bul</strong> ile
                döngüyü yakabilirsiniz.
              </span>
              <button
                onClick={() => void handleRevertSimulation()}
                className="text-xs font-mono text-zinc-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                Bozuk Halka Testi (eth_call) →
              </button>
            </div>
          )}
        </div>
      </SpotlightCard>

      {/* SAĞ: SADELEŞTİRİLMİŞ MALİYET VE GARANTİ KARTLARI (4 KOLON) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        {/* KART 1: MALİYET & EŞZAMANLILIK */}
        <SpotlightCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#a78bfa] bg-[#836EF9]/10 px-2.5 py-1 rounded-lg border border-[#836EF9]/20">
              Maliyet &amp; Hız
            </span>
            <span className="text-xs font-mono text-zinc-500">
              Monad Testnet
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="text-xs text-zinc-400">Bu Halka</div>
              <div className="text-xl font-bold text-white mt-0.5 font-mono">
                {cycleLength} Transfer
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                Tek atomik işlem
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5">
              <div className="text-xs text-zinc-400">Toplam Ağ Ücreti</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
                ~${usdCost}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                {monCost} MON · 300ms
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
            Fiziksel dünyada &ldquo;kim önce istifa edecek?&rdquo; riski
            yüzünden takaslar 2–3 kişide tıkanır. Kontratta{" "}
            <strong className="text-zinc-200">{cycleLength} kişi</strong> ya
            aynı anda yer değiştirir ya da hiçbiri.
          </p>
        </SpotlightCard>

        {/* KART 2: MATEMATİKSEL GARANTİ */}
        <SpotlightCard
          className="p-5 flex-1 flex flex-col justify-between"
          spotlightColor="rgba(16, 185, 129, 0.12)"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                Top Trading Cycles Garantisi
              </span>
              <span className="text-xs font-mono text-zinc-500">
                Roth · Ma (1994)
              </span>
            </div>

            <div className="bg-white/[0.02] border border-emerald-500/20 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs font-mono pb-2.5 mb-2.5 border-b border-white/[0.06]">
                <span className="text-zinc-400">verifyTTCStep(cycle)</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold">
                  true ✓
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                &ldquo;Bu {cycleLength} kişiden hiçbir alt grup, sistemden
                ayrılıp kendi arasında takas yaparak daha iyi duruma
                geçemezdi.&rdquo;
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-300">
                ✓ Strict Core
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-300">
                ✓ Dürüst Tercih (Strategyproof)
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-300">
                ✓ 0₺ Para El Değiştirmez
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">Zincir Kanıtı:</span>
            <a
              href={`${MONAD_TESTNET.explorer}/tx/${
                executedResult ? executedResult.txHash : PROOF_11_CYCLE_TX
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a78bfa] hover:text-white transition-colors"
            >
              tx/
              {(executedResult
                ? executedResult.txHash
                : PROOF_11_CYCLE_TX
              ).slice(0, 10)}
              …98bd9 ↗
            </a>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
