import { NextResponse } from "next/server";
import { createPublicClient, createWalletClient, http, isAddress, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL, type FundResponse } from "@/lib/halka";

const DRIP = parseEther("0.12");
const FEES = { maxFeePerGas: 120_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n } as const;

const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

const seenIp = new Map<string, number[]>();
const funded = new Set<string>();

/**
 * Transfers are SERIALISED behind this promise chain, on purpose.
 *
 * Every Monad EOA reserves 10 MON. A transaction that decrements the balance and
 * leaves the sender below that reserve reverts at execution; the only way
 * through is the "emptying transaction" exception, which an undelegated account
 * gets once every k = 3 blocks. Our relayer holds less than 10 MON, so its
 * transfers must be spaced. Sending them concurrently landed exactly one.
 *
 * Known limit, stated in the README: this funds roughly one wallet every two
 * seconds. Raising the relayer above 10 MON would remove the constraint
 * entirely, which is the fix if this ever needs to serve a real crowd.
 */
let queue: Promise<unknown> = Promise.resolve();
const GAP_MS = 1800;

function serialise<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => new Promise((r) => setTimeout(r, GAP_MS)),
    () => new Promise((r) => setTimeout(r, GAP_MS))
  );
  return run;
}

function rateLimited(ip: string) {
  const now = Date.now();
  const hits = (seenIp.get(ip) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  seenIp.set(ip, hits);
  return hits.length > 4;
}

export async function POST(req: Request) {
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "relayer_not_configured" } satisfies FundResponse, {
      status: 500,
    });
  }

  let address: string;
  try {
    address = (await req.json()).address;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" } satisfies FundResponse, { status: 400 });
  }
  if (!address || !isAddress(address)) {
    return NextResponse.json({ ok: false, error: "bad_address" } satisfies FundResponse, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" } satisfies FundResponse, { status: 429 });
  }

  const lower = address.toLowerCase();
  if (funded.has(lower)) {
    return NextResponse.json({ ok: false, error: "already_funded" } satisfies FundResponse, { status: 409 });
  }

  try {
    const existing = await pub.getBalance({ address: address as `0x${string}` });
    if (existing >= DRIP) {
      funded.add(lower);
      return NextResponse.json({ ok: false, error: "already_funded" } satisfies FundResponse, { status: 409 });
    }

    const account = privateKeyToAccount(key as `0x${string}`);
    const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

    const txHash = await serialise(() =>
      wallet.sendTransaction({ to: address as `0x${string}`, value: DRIP, gas: 21_000n, ...FEES })
    );
    const rcpt = await pub.waitForTransactionReceipt({ hash: txHash });
    if (rcpt.status !== "success") {
      return NextResponse.json({ ok: false, error: "transfer_reverted" } satisfies FundResponse, { status: 502 });
    }

    funded.add(lower);
    return NextResponse.json({ ok: true, txHash } satisfies FundResponse);
  } catch (e: unknown) {
    const err = e as { details?: string; shortMessage?: string };
    return NextResponse.json(
      { ok: false, error: err.details ?? err.shortMessage ?? "send_failed" } satisfies FundResponse,
      { status: 502 }
    );
  }
}
