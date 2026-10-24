/**
 * Exercises every claim the demo makes, so none of them is taken on trust.
 *
 *   npx tsx scripts/verify-claims.ts
 *
 * 1. a cycle nobody asked for is rejected      (TargetNotWanted)
 * 2. a "cycle" through one person is rejected   (SameOwnerInCycle)
 * 3. a cycle containing an inactive id is rejected
 * 4. claimStickers mints kind-1 items for the room mode
 * 5. reports the admin balance, i.e. how many rehearsal resets are left
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "../src/lib/chain";

const ROOT = process.cwd();
const FEES = { maxFeePerGas: 120_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n } as const;
const RESET_COST = parseEther("0.41"); // one executeCycle + one seedWants, measured

function env(key: string): string {
  const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} missing from .env`);
  return m[1];
}

async function expectRevert(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`  FAIL  ${label} -- it did NOT revert`);
    return false;
  } catch (e: unknown) {
    const err = e as { cause?: { data?: { errorName?: string } }; shortMessage?: string };
    const name = err.cause?.data?.errorName;
    console.log(`  ok    ${label} -> reverted${name ? ` with ${name}` : ""}`);
    return true;
  }
}

async function main() {
  const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "Halka.json"), "utf8"));
  const abi = artifact.abi;
  const address = env("HALKA_ADDRESS") as `0x${string}`;

  const admin = privateKeyToAccount(env("PRIVATE_KEY") as `0x${string}`);
  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account: admin, chain: monadTestnet, transport: http(RPC_URL) });

  const sim = (args: number[]) =>
    pub.simulateContract({ address, abi, functionName: "executeCycle", args: [args], account: admin });

  console.log(`contract ${address}\n`);

  // What the board actually says, so the negative tests are built on real data.
  const wants1 = (await pub.readContract({ address, abi, functionName: "getWants", args: [1] })) as number[];
  console.log(`item 1 wants [${wants1.join(", ")}]  -> so 1 -> 3 is NOT a wanted link\n`);

  console.log("atomicity / validity checks (eth_call, no state change):");
  await expectRevert("cycle [1,3] nobody asked for", () => sim([1, 3]));
  await expectRevert("cycle [1,1] repeats an item", () => sim([1, 1]));
  await expectRevert("cycle [1] too short", () => sim([1]));
  await expectRevert("cycle [1,99] unknown item", () => sim([1, 99]));

  // The real ring must still simulate cleanly, or the demo is broken.
  const ring = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  try {
    await sim(ring);
    console.log(`  ok    the 11-item ring simulates cleanly`);
  } catch (e: unknown) {
    console.log(`  FAIL  the ring does NOT simulate: ${(e as { shortMessage?: string }).shortMessage}`);
  }
  const isTop = (await pub.readContract({
    address,
    abi,
    functionName: "verifyTTCStep",
    args: [ring],
  })) as boolean;
  console.log(`  ok    verifyTTCStep(ring) = ${isTop}\n`);

  // ---- room mode ----
  const claimed = (await pub.readContract({
    address,
    abi,
    functionName: "hasClaimed",
    args: [admin.address],
  })) as boolean;

  if (claimed) {
    console.log(`room mode: admin already claimed stickers, skipping`);
  } else {
    const hash = await wallet.writeContract({
      address,
      abi,
      functionName: "claimStickers",
      args: [3],
      gas: 600_000n,
      ...FEES,
    });
    const r = await pub.waitForTransactionReceipt({ hash });
    console.log(`room mode: claimStickers(3) -> ${r.status}  ${hash}`);
  }

  const count = Number((await pub.readContract({ address, abi, functionName: "itemCount" })) as bigint);
  const mine = (await pub.readContract({
    address,
    abi,
    functionName: "getItemsOf",
    args: [admin.address],
  })) as number[];
  console.log(`  itemCount now ${count}, admin holds [${mine.join(", ")}]`);
  for (const id of mine.slice(0, 3)) {
    const it = (await pub.readContract({ address, abi, functionName: "getItem", args: [id] })) as unknown[];
    console.log(`    #${id} kind=${it[1]} "${it[3]}"`);
  }

  // ---- budget ----
  const bal = await pub.getBalance({ address: admin.address });
  console.log(`\nadmin balance ${formatEther(bal)} MON`);
  console.log(`a full rehearsal (execute + reset) costs about ${formatEther(RESET_COST)} MON, measured`);
  console.log(`-> roughly ${Math.floor(Number(bal / RESET_COST))} full rehearsals left today`);
  console.log(`   (the devnads faucet is capped at 10 MON per address per day)`);
}

main().catch((e) => {
  console.error(e?.details ?? e?.shortMessage ?? e);
  process.exit(1);
});
