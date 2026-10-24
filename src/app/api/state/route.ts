import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { HALKA_ABI, HALKA_ADDRESS, monadTestnet, RPC_URL, type StateResponse } from "@/lib/halka";
import { decodeSnapshot } from "@/lib/cycles";

const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

// snapshot() returns the whole board in ONE call, so there is no Multicall and
// no per-item round trip. The public RPC allows ~50 rps, so we also cache.
let cache: { at: number; data: StateResponse } | null = null;
const TTL_MS = 2000;

export async function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind");

  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      const snap = (await pub.readContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "snapshot",
      })) as never;
      const board = decodeSnapshot(snap);
      cache = { at: Date.now(), data: { items: board.items, wants: board.wants } };
    }

    if (kind === null) return NextResponse.json(cache.data);

    const k = Number(kind);
    const items = cache.data.items.filter((i) => i.kind === k);
    const wants: Record<number, number[]> = {};
    for (const i of items) wants[i.id] = cache.data.wants[i.id] ?? [];
    return NextResponse.json({ items, wants } satisfies StateResponse);
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string };
    return NextResponse.json({ error: err.shortMessage ?? err.message ?? "read failed" }, { status: 502 });
  }
}
