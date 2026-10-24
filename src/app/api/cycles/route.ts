import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import {
  HALKA_ABI,
  HALKA_ADDRESS,
  monadTestnet,
  RPC_URL,
  type Cycle,
  type CyclesResponse,
} from "@/lib/halka";
import { decodeSnapshot, findCycles, type Board } from "@/lib/cycles";

const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

let cache: { at: number; data: CyclesResponse } | null = null;
const TTL_MS = 3000;

export async function GET(req: Request) {
  const kindParam = new URL(req.url).searchParams.get("kind");
  const kind = kindParam === null ? null : Number(kindParam);

  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      const snap = (await pub.readContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "snapshot",
      })) as never;
      const full = decodeSnapshot(snap);

      const board: Board =
        kind === null
          ? full
          : {
              items: full.items.filter((i) => i.kind === kind),
              wants: Object.fromEntries(
                full.items.filter((i) => i.kind === kind).map((i) => [i.id, full.wants[i.id] ?? []])
              ),
            };

      const raw = findCycles(board);

      // Ask the contract whether each cycle satisfies the Top Trading Cycles
      // invariant. We do not compute that claim off-chain -- the chain answers.
      const cycles: Cycle[] = await Promise.all(
        raw.slice(0, 12).map(async (items) => {
          let isTopChoice = false;
          try {
            isTopChoice = (await pub.readContract({
              address: HALKA_ADDRESS,
              abi: HALKA_ABI,
              functionName: "verifyTTCStep",
              args: [items],
            })) as boolean;
          } catch {
            /* leave false if the node refuses the read */
          }
          const byId = new Map(full.items.map((i) => [i.id, i]));
          return {
            items,
            participants: items.map((id) => byId.get(id)!.owner),
            isTopChoice,
          };
        })
      );

      // Top Trading Cycles değişmezini sağlayan halkalar önce gelsin. Rastgele
      // üretilen tercihler bu değişmezi çoğu zaman sağlamıyor; en uzun halka
      // başa gelirse garanti paneli varsayılan olarak "false" gösteriyordu.
      cycles.sort((a, b) => {
        if (a.isTopChoice !== b.isTopChoice) return a.isTopChoice ? -1 : 1;
        return b.items.length - a.items.length;
      });

      cache = { at: Date.now(), data: { cycles } };
    }

    return NextResponse.json(cache.data);
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string };
    return NextResponse.json({ error: err.shortMessage ?? err.message ?? "read failed" }, { status: 502 });
  }
}
