"use client";

import React, { useRef, useState } from "react";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

/**
 * React Bits SpotlightCard — fare hareketini takip eden yumuşak radyal ışık efektli kart.
 */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(131, 110, 249, 0.14)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl bg-[#0c0c14]/85 backdrop-blur-xl border border-white/[0.07] transition-all duration-300 ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(480px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 45%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

/**
 * React Bits ShinyText — metin üzerinde zarif ışık yansıması geçişi.
 */
export function ShinyText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-[linear-gradient(110deg,#e4e4e7,45%,#a78bfa,55%,#e4e4e7)] animate-shine ${className}`}
    >
      {text}
    </span>
  );
}

/**
 * React Bits AuroraBackground — göz yormayan, yumuşak atmosferik arka plan katmanı.
 */
export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute -top-40 left-1/4 w-[520px] h-[340px] rounded-full bg-[#836EF9]/[0.08] blur-[120px] animate-aurora" />
      <div
        className="absolute top-1/3 right-1/5 w-[440px] h-[320px] rounded-full bg-emerald-500/[0.05] blur-[130px] animate-aurora"
        style={{ animationDelay: "-5s" }}
      />
      <div
        className="absolute -bottom-32 left-1/3 w-[500px] h-[300px] rounded-full bg-indigo-500/[0.06] blur-[130px] animate-aurora"
        style={{ animationDelay: "-9s" }}
      />
    </div>
  );
}
