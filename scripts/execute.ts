/**
 * Finds cycles on the live board and executes the longest one, atomically.
 *
 *   npx tsx scripts/execute.ts          # dry run: find and report only
 *   npx tsx scripts/execute.ts --send   # actually execute the longest cycle
 *
 * This is the proof behind the demo's central claim. Anyone may call
 * executeCycle; it is not admin-gated. The contract re-verifies the whole cycle
 * and reverts all of it if a single link is invalid.
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "../src/lib/chain";
import { decodeSnapshot, findCycles } from "../src/lib/cycles";

const ROOT = process.cwd();
const FEES = { maxFeePerGas: 120_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n } as const;

function env(key: string): string {
  const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} missing from .env`);
  return m[1];
}

async function main() {
  const send = process.argv.includes("--send");
  const artifact = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "Halka.json"), "utf8"));
  const abi = artifact.abi;
  const address = env("HALKA_ADDRESS") as `0x${string}`;

  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const snap = (await pub.readContract({ address, abi, functionName: "snapshot" })) as any;
  const board = decodeSnapshot(snap);

  const cycles = findCycles(board);
  console.log(`board: ${board.items.length} items`);
  console.log(`disjoint cycles found: ${cycles.length}`);
  for (const c of cycles.slice(0, 6)) {
    console.log(`  len ${String(c.length).padStart(2)}  [${c.join(" -> ")}]`);
  }
  if (cycles.length === 0) return;

  const target = cycles[0];
  const labelOf = (id: number) => board.items[id - 1]?.label ?? `#${id}`;
  console.log(`\nlongest cycle (${target.length}):`);
  for (let i = 0; i < target.length; i++) {
    const from = labelOf(target[i]);
    const to = labelOf(target[(i + 1) % target.length]);
    console.log(`  ${from}  ->  receives  ${to}`);
  }

  const isTop = (await pub.readContract({
    address,
    abi,
    functionName: "verifyTTCStep",
    args: [target],
  })) as boolean;
  console.log(`\nverifyTTCStep = ${isTop}`);

  if (!send) {
    console.log(`\n(dry run -- pass --send to execute)`);
    return;
  }

  const account = privateKeyToAccount(env("PRIVATE_KEY") as `0x${string}`);
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

  const before = await pub.getBalance({ address: account.address });

  // Estimate and add 20%. Monad charges on the gas LIMIT, so a loose limit is
  // money burned -- a flat 3M limit cost 0.36 MON per run.
  const est = await pub.estimateContractGas({
    address,
    abi,
    functionName: "executeCycle",
    args: [target],
    account,
  });
  const gas = (est * 120n) / 100n;
  console.log(`\nestimate ${est} -> limit ${gas}`);

  const hash = await wallet.writeContract({
    address,
    abi,
    functionName: "executeCycle",
    args: [target],
    gas,
    ...FEES,
  });
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  const after = await pub.getBalance({ address: account.address });

  console.log(`\nexecuteCycle ${rcpt.status}`);
  console.log(`  ${target.length} participants moved in ONE transaction`);
  console.log(`  gas charged ${rcpt.gasUsed}  cost ${formatEther(before - after)} MON`);
  console.log(`  ${monadTestnet.blockExplorers.default.url}/tx/${hash}`);

  if (rcpt.status === "success") {
    const after2 = decodeSnapshot(
      (await pub.readContract({ address, abi, functionName: "snapshot" })) as any
    );
    console.log(`\nowners after:`);
    for (const id of target.slice(0, 4)) {
      console.log(`  ${labelOf(id)} -> ${after2.items[id - 1].owner}`);
    }
  }
}

main().catch((e) => {
  console.error(e?.details ?? e?.shortMessage ?? e);
  process.exit(1);
});
