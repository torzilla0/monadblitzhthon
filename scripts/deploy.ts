/**
 * Deploys Halka to Monad Testnet with viem, records the address in .env and
 * regenerates src/lib/halka.ts.
 *
 *   npx tsx scripts/compile.ts && npx tsx scripts/deploy.ts
 */
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, RPC_URL } from "../src/lib/chain";
import { genLib } from "./gen-lib";

const ROOT = process.cwd();

function env(key: string): string {
  const m = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) throw new Error(`${key} missing from .env -- run scripts/setup-wallet.ts first`);
  return m[1];
}

function setEnv(key: string, value: string) {
  const p = path.join(ROOT, ".env");
  let txt = fs.readFileSync(p, "utf8");
  txt = new RegExp(`^${key}=.*$`, "m").test(txt)
    ? txt.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
    : txt.trimEnd() + `\n${key}=${value}\n`;
  fs.writeFileSync(p, txt);
}

async function main() {
  const artifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, "artifacts", "Halka.json"), "utf8")
  );

  const account = privateKeyToAccount(env("PRIVATE_KEY") as `0x${string}`);
  const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
  const wallet = createWalletClient({ account, chain: monadTestnet, transport: http(RPC_URL) });

  const before = await pub.getBalance({ address: account.address });
  console.log(`deployer ${account.address}  balance ${formatEther(before)} MON`);

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [],
  });
  console.log(`deploy tx ${hash}`);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) {
    throw new Error(`deploy failed: ${receipt.status}`);
  }

  const addr = receipt.contractAddress;
  const after = await pub.getBalance({ address: account.address });

  console.log(`\nHalka deployed at ${addr}`);
  console.log(`gas used ${receipt.gasUsed}  cost ${formatEther(before - after)} MON`);
  console.log(`${monadTestnet.blockExplorers.default.url}/address/${addr}`);

  setEnv("HALKA_ADDRESS", addr);
  setEnv("NEXT_PUBLIC_HALKA_ADDRESS", addr);
  genLib();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
