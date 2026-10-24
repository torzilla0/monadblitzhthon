/**
 * Creates a deployer/relayer key if .env has none, then tops it up from the
 * devnads faucet (1 MON per request, 10 per address per day).
 *
 * Never prints the private key.
 *   npx tsx scripts/setup-wallet.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, http, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "../src/lib/chain";

const ENV = path.join(process.cwd(), ".env");
const FAUCET = "https://agents.devnads.com/v1/faucet";
const TARGET_MON = 4; // enough for deploy + seed + relaying

function readEnv(): Record<string, string> {
  if (!fs.existsSync(ENV)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function writeEnv(env: Record<string, string>) {
  const body = Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  fs.writeFileSync(ENV, body + "\n");
}

async function faucet(address: string) {
  const res = await fetch(FAUCET, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chainId: monadTestnet.id, address }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function main() {
  const env = readEnv();

  if (!env.PRIVATE_KEY) {
    env.PRIVATE_KEY = generatePrivateKey();
    console.log("generated a new deployer key -> .env (PRIVATE_KEY)");
  }
  if (!env.RELAYER_PRIVATE_KEY) {
    // same key for both: one less thing to fund in a 3-hour build
    env.RELAYER_PRIVATE_KEY = env.PRIVATE_KEY;
  }
  writeEnv(env);

  const account = privateKeyToAccount(env.PRIVATE_KEY as `0x${string}`);
  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });

  console.log(`deployer address: ${account.address}`);

  for (let i = 0; i < 8; i++) {
    const bal = await pub.getBalance({ address: account.address });
    const mon = Number(formatEther(bal));
    console.log(`balance: ${mon.toFixed(4)} MON`);
    if (mon >= TARGET_MON) break;

    const r = await faucet(account.address);
    console.log(`  faucet -> ${r.status} ${r.text.slice(0, 160)}`);
    if (r.status !== 200) break;
    await new Promise((r) => setTimeout(r, 2500));
  }

  const bal = await pub.getBalance({ address: account.address });
  console.log(`\nfinal balance: ${formatEther(bal)} MON`);
  console.log(`explorer: ${monadTestnet.blockExplorers.default.url}/address/${account.address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
