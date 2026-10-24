/**
 * Seeds the becayis board: 20 teaching posts across Turkey, 11 of which form a
 * guaranteed ring (each wants the next, the last wants the first). That ring is
 * the centrepiece of the demo -- no two of those eleven can trade bilaterally,
 * but all eleven can trade at once.
 *
 *   npx tsx scripts/seed.ts
 *
 * Two admin transactions, nothing else. An earlier version gave each fixture
 * owner its own funded burner so it could sign its own setWants. That fought
 * Monad's reserve balance (every EOA reserves 10 MON; a transaction reverts at
 * execution if it leaves the sender below that reserve) and it bought us nothing
 * -- these twenty "teachers" are synthetic fixtures. Room participants still
 * sign their own setWants from their own wallet; seedWants cannot touch a
 * kind-1 (sticker) item.
 */
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "../src/lib/chain";
import { RING_CITIES, NOISE_CITIES } from "../src/lib/cities";

const ROOT = process.cwd();
const BRANCH = "Matematik";

// Monad charges value + gas_price * gas_LIMIT, not gas used, so a loose limit
// really does burn the money. The base fee floor is 100 MON-gwei.
const FEES = {
  maxFeePerGas: 120_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
} as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function env(key: string): string {
  const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} missing from .env`);
  return m[1];
}

/** Deterministic address per fixture slot, so reseeding is reproducible. */
function fixtureAddress(i: number) {
  return privateKeyToAccount(keccak256(toHex(`halka-seed-v1-${i}`))).address;
}

async function main() {
  const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "Halka.json"), "utf8"));
  const abi = artifact.abi;
  const address = env("HALKA_ADDRESS") as `0x${string}`;

  const admin = privateKeyToAccount(env("PRIVATE_KEY") as `0x${string}`);
  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account: admin, chain: monadTestnet, transport: http(RPC_URL) });

  const ringCount = RING_CITIES.length; // 11
  const cities = [...RING_CITIES, ...NOISE_CITIES];
  const owners = cities.map((_, i) => fixtureAddress(i));
  const labels = cities.map((c) => `${c.name} / ${BRANCH}`);
  const idOf = (i: number) => i + 1; // seedItems assigns ids 1..n in order

  console.log(`contract ${address}`);
  console.log(`admin    ${admin.address}  ${formatEther(await pub.getBalance({ address: admin.address }))} MON`);
  console.log(`seeding ${cities.length} posts, ${ringCount} of them a ring\n`);

  // ---- 1. mint the posts ----
  const already = Number(
    (await pub.readContract({ address, abi, functionName: "itemCount" })) as bigint | number
  );
  if (already >= cities.length) {
    console.log(`itemCount already ${already}; skipping seedItems.`);
  } else {
    const hash = await wallet.writeContract({
      address,
      abi,
      functionName: "seedItems",
      args: [owners, labels],
      gas: 5_000_000n,
      ...FEES,
    });
    const r = await pub.waitForTransactionReceipt({ hash });
    console.log(`seedItems  ${r.status}  gas ${r.gasUsed}  ${hash}`);
    if (r.status !== "success") throw new Error("seedItems reverted");
    // Leave a few blocks: an account below the 10 MON reserve may dip below it
    // only via an "emptying transaction", and only once every k = 3 blocks.
    await sleep(2000);
  }

  // ---- 2. the wish lists ----
  // ring: post i wants post i+1 first, plus one harmless second choice
  // noise: wants point inside the noise set, so they cannot shortcut the ring
  const wants: number[][] = cities.map((_, i) => {
    if (i < ringCount) {
      const next = idOf((i + 1) % ringCount);
      const alt = idOf(ringCount + ((i * 3) % NOISE_CITIES.length));
      return [next, alt];
    }
    const j = i - ringCount;
    return [
      idOf(ringCount + ((j + 1) % NOISE_CITIES.length)),
      idOf(ringCount + ((j + 4) % NOISE_CITIES.length)),
    ];
  });

  const ids = cities.map((_, i) => idOf(i));
  const hash2 = await wallet.writeContract({
    address,
    abi,
    functionName: "seedWants",
    args: [ids, wants],
    gas: 5_000_000n,
    ...FEES,
  });
  const r2 = await pub.waitForTransactionReceipt({ hash: hash2 });
  console.log(`seedWants  ${r2.status}  gas ${r2.gasUsed}  ${hash2}`);
  if (r2.status !== "success") throw new Error("seedWants reverted");

  // ---- 3. prove the ring is real ----
  const ring = Array.from({ length: ringCount }, (_, i) => idOf(i));
  const isTop = (await pub.readContract({
    address,
    abi,
    functionName: "verifyTTCStep",
    args: [ring],
  })) as boolean;

  console.log(`\nring = [${ring.join(", ")}]`);
  console.log(`verifyTTCStep(ring) = ${isTop}   <-- must be true for the demo claim`);
  console.log(`${monadTestnet.blockExplorers.default.url}/address/${address}`);
}

main().catch((e) => {
  console.error(e?.details ?? e?.shortMessage ?? e);
  process.exit(1);
});
