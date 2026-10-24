import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { HALKA_ABI, HALKA_ADDRESS, monadTestnet, RPC_URL } from "@/lib/halka";

const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

/**
 * Dry-runs executeCycle against the live contract with eth_call and reports what
 * the chain actually says. No transaction, no gas, no state change.
 *
 * This exists so the atomicity claim in the UI is a real answer from the node
 * rather than a sentence we wrote ourselves.
 *
 *   GET /api/simulate?cycle=1,2,12   -> { ok: false, error: "TargetNotWanted", args: [...] }
 *   GET /api/simulate?cycle=1,2,3,…  -> { ok: true }
 */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("cycle") ?? "";
  const cycle = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (cycle.length === 0) {
    return NextResponse.json({ ok: false, error: "bad_cycle_param" }, { status: 400 });
  }

  // Any address works: executeCycle is permissionless, so the caller does not
  // change the outcome. We use the zero address to make that explicit.
  const caller = "0x0000000000000000000000000000000000000000" as const;

  try {
    await pub.simulateContract({
      address: HALKA_ADDRESS,
      abi: HALKA_ABI,
      functionName: "executeCycle",
      args: [cycle],
      account: caller,
    });

    let isTopChoice: boolean | null = null;
    try {
      isTopChoice = (await pub.readContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "verifyTTCStep",
        args: [cycle],
      })) as boolean;
    } catch {
      /* leave null */
    }

    return NextResponse.json({ ok: true, cycle, isTopChoice, transfersThatWouldHappen: cycle.length });
  } catch (e: unknown) {
    const err = e as {
      cause?: { data?: { errorName?: string; args?: readonly unknown[] } };
      shortMessage?: string;
    };
    const errorName = err.cause?.data?.errorName ?? null;
    const args = (err.cause?.data?.args ?? []).map((a) => String(a));

    return NextResponse.json({
      ok: false,
      cycle,
      error: errorName ?? err.shortMessage ?? "reverted",
      args,
      transfersThatHappened: 0,
    });
  }
}
