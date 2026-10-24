"use client";

import React, { useState, useMemo } from "react";
import { type Item, type Cycle, MONAD_TESTNET } from "../lib/fixture";
import { SpotlightCard } from "./ui/ReactBits";

interface SalonGraphProps {
  items: Item[];
  wants: Record<number, number[]>;
  cycles: Cycle[];
  myAddress: `0x${string}`;
  onClaimStickers: () => Promise<void>;
  isClaiming: boolean;
  onExecuteCycle: (cycle: Cycle) => Promise<{
    txHash: `0x${string}`;
    mode: string;
    latencyMs: number;
  }>;
  onSelectItem: (id: number) => void;
}

const CYCLE_COLORS = ["#836EF9", "#10B981", "#06B6D4", "#F59E0B", "#EC4899"];

export default function SalonGraph({
  items,
  wants,
  cycles,
  myAddress,
  onClaimStickers,
  isClaiming,
  onExecuteCycle,
  onSelectItem,
}: SalonGraphProps) {
  const [selectedCycleIdx, setSelectedCycleIdx] = useState<number>(0);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastTx, setLastTx] = useState<{
    txHash: `0x${string}`;
    latencyMs: number;
    length: number;
  } | null>(null);

  const CX = 420;
  const CY = 240;
  const RADIUS = 175;

  const nodePositions = useMemo(() => {
    const posMap = new Map<number, { x: number; y: number; angle: number }>();
    const n = items.length || 1;
    items.forEach((item, idx) => {
      const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
      const x = CX + RADIUS * Math.cos(angle);
      const y = CY + RADIUS * Math.sin(angle);
      posMap.set(item.id, { x, y, angle });
    });
    return posMap;
  }, [items]);

  const itemCycleMap = useMemo(() => {
    const m = new Map<number, number>();
    cycles.forEach((cyc, cIdx) => {
      cyc.items.forEach((id) => m.set(id, cIdx));
    });
    return m;
  }, [cycles]);

  const handleRunCycle = async (cyc: Cycle) => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const res = await onExecuteCycle(cyc);
      setLastTx({
        txHash: res.txHash,
        latencyMs: res.latencyMs,
        length: cyc.items.length,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const totalTransfers = cycles.reduce((acc, c) => acc + c.items.length, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <SpotlightCard className="lg:col-span-8 p-5 flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Canlı Salon Takas Grafı
              </h2>
              <p className="text-xs text-zinc-400 font-mono">
                {items.length} sticker · {cycles.length} döngü · {totalTransfers}{" "}
                transfer
              </p>
            </div>
          </div>

          <button
            onClick={onClaimStickers}
            disabled={isClaiming}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#836EF9] hover:bg-[#745ce8] text-white shadow-lg shadow-[#836EF9]/20 transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isClaiming ? "Sticker Alınıyor…" : "🎁 3 Rastgele Sticker Al"}
          </button>
        </div>

        <div className="relative w-full aspect-[16/9.5] bg-[#07070c] rounded-xl border border-white/[0.05] overflow-hidden">
          <svg viewBox="0 0 840 480" className="w-full h-full select-none">
            <defs>
              {CYCLE_COLORS.map((col, idx) => (
                <marker
                  key={`marker-${idx}`}
                  id={`salon-arrow-${idx}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={col} />
                </marker>
              ))}
              <marker
                id="salon-arrow-muted"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4.5"
                markerHeight="4.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 2 L 8 5 L 0 8 z" fill="#3f3f56" />
              </marker>
            </defs>

            <circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              fill="none"
              stroke="#181826"
              strokeWidth="1.2"
              strokeDasharray="4 6"
            />

            {items.map((fromItem) => {
              const p1 = nodePositions.get(fromItem.id);
              if (!p1) return null;
              const tList = wants[fromItem.id] || [];
              return tList.map((tid) => {
                const p2 = nodePositions.get(tid);
                if (!p2) return null;
                return (
                  <line
                    key={`s-want-${fromItem.id}-${tid}`}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#2d2d42"
                    strokeWidth="1"
                    opacity="0.4"
                    markerEnd="url(#salon-arrow-muted)"
                  />
                );
              });
            })}

            {cycles.map((cyc, cIdx) => {
              const color = CYCLE_COLORS[cIdx % CYCLE_COLORS.length];
              const isFocused = selectedCycleIdx === cIdx;
              const n = cyc.items.length;

              return cyc.items.map((fromId, idx) => {
                const toId = cyc.items[(idx + 1) % n];
                const p1 = nodePositions.get(fromId);
                const p2 = nodePositions.get(toId);
                if (!p1 || !p2) return null;

                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.hypot(dx, dy) || 1;
                const x2 = p2.x - (dx / dist) * 14;
                const y2 = p2.y - (dy / dist) * 14;

                return (
                  <g
                    key={`s-cyc-${cIdx}-${fromId}-${toId}`}
                    onClick={() => setSelectedCycleIdx(cIdx)}
                    className="cursor-pointer"
                  >
                    {isFocused && (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={x2}
                        y2={y2}
                        stroke={color}
                        strokeWidth="6"
                        opacity="0.2"
                      />
                    )}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth={isFocused ? 2.5 : 1.6}
                      opacity={isFocused ? 1 : 0.65}
                      markerEnd={`url(#salon-arrow-${cIdx % CYCLE_COLORS.length})`}
                    />
                  </g>
                );
              });
            })}

            {items.map((item) => {
              const pos = nodePositions.get(item.id);
              if (!pos) return null;
              const cIdx = itemCycleMap.get(item.id);
              const color =
                cIdx !== undefined
                  ? CYCLE_COLORS[cIdx % CYCLE_COLORS.length]
                  : "#646482";
              const isMine =
                item.owner.toLowerCase() === myAddress.toLowerCase();

              const labelDist = RADIUS + 24;
              const lx = CX + labelDist * Math.cos(pos.angle);
              const ly = CY + labelDist * Math.sin(pos.angle);
              const anchor =
                Math.cos(pos.angle) > 0.2
                  ? "start"
                  : Math.cos(pos.angle) < -0.2
                  ? "end"
                  : "middle";

              return (
                <g
                  key={`s-node-${item.id}`}
                  onClick={() => onSelectItem(item.id)}
                  className="cursor-pointer"
                >
                  {isMine && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={12}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={cIdx !== undefined ? 7.5 : 5.5}
                    fill={color}
                    stroke="#07070c"
                    strokeWidth="2"
                  />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor={anchor}
                    fill={cIdx !== undefined ? "#e4e4e7" : "#8e8ea8"}
                    fontSize="9.5"
                    fontWeight={cIdx !== undefined ? "600" : "400"}
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {lastTx && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2 text-xs flex items-center justify-between text-emerald-200 animate-fade-in">
            <span>
              ✓ {lastTx.length} stickerlık halka yürütüldü ({lastTx.latencyMs}ms)
            </span>
            <a
              href={`${MONAD_TESTNET.explorer}/tx/${lastTx.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-mono text-emerald-300"
            >
              tx/{lastTx.txHash.slice(0, 10)}… ↗
            </a>
          </div>
        )}
      </SpotlightCard>

      <div className="lg:col-span-4 flex flex-col gap-5">
        <SpotlightCard className="p-5 flex-1">
          <h3 className="text-sm font-semibold text-white mb-3">
            Aktif Salon Halkaları ({cycles.length})
          </h3>

          {cycles.length === 0 ? (
            <div className="text-xs text-zinc-400 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 leading-relaxed">
              Henüz kapanmış bir sticker halkası yok.{" "}
              <strong className="text-zinc-200">3 Rastgele Sticker Al</strong>{" "}
              butonuna basıp aşağıdan tercih sıralamanı kaydederek ilk halkayı
              başlatabilirsin.
            </div>
          ) : (
            <div className="space-y-2.5">
              {cycles.map((cyc, idx) => {
                const color = CYCLE_COLORS[idx % CYCLE_COLORS.length];
                const isSelected = selectedCycleIdx === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCycleIdx(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white/[0.05] border-white/[0.15]"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-semibold text-white">
                          Halka #{idx + 1} ({cyc.items.length} Sticker)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400">
                        TTC ✓
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleRunCycle(cyc);
                      }}
                      disabled={isExecuting}
                      className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold bg-[#836EF9]/20 hover:bg-[#836EF9] text-purple-200 hover:text-white transition-all cursor-pointer"
                    >
                      Atomik Yürüt ({cyc.items.length} Transfer)
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SpotlightCard>

        <SpotlightCard className="p-4 text-xs text-zinc-400 leading-relaxed">
          <strong className="text-zinc-200 block mb-1">
            ⚡ Paralel Yürütme
          </strong>
          Birbirini kesmeyen takas halkaları farklı depolama alanlarına dokunur;
          Monad paralel yürütücüsü bunları eşzamanlı işler.
        </SpotlightCard>
      </div>
    </div>
  );
}
