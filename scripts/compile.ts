/**
 * Compiles contracts/Halka.sol with solc-js.
 *
 * We deliberately do NOT use Hardhat: Monad's docs recommend WSL 2 for Hardhat
 * on Windows, and we are on Windows with no time to set that up. solc-js plus
 * viem does the same job here with no extra toolchain.
 *
 * Writes artifacts/Halka.json holding abi, bytecode and the exact standard JSON
 * input, which the devnads /v1/verify endpoint needs verbatim.
 */
import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "contracts", "Halka.sol");
const OUT_DIR = path.join(ROOT, "artifacts");

const EVM_VERSION = "osaka"; // required by Monad

function buildInput(evmVersion: string) {
  return {
    language: "Solidity",
    sources: {
      "contracts/Halka.sol": { content: fs.readFileSync(SRC, "utf8") },
    },
    settings: {
      evmVersion,
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: "ipfs" },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] },
      },
    },
  };
}

function compile(evmVersion: string) {
  const input = buildInput(evmVersion);
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  return { input, out };
}

function main() {
  console.log(`solc ${solc.version()}`);

  let evmVersion = EVM_VERSION;
  let { input, out } = compile(evmVersion);

  // If this solc build does not know "osaka", fall back so we are not blocked.
  const unknownEvm = (out.errors ?? []).some(
    (e: any) => e.severity === "error" && /evmVersion|Invalid option/i.test(e.formattedMessage ?? "")
  );
  if (unknownEvm) {
    console.warn(`!! solc rejected evmVersion "${evmVersion}", falling back to "prague"`);
    evmVersion = "prague";
    ({ input, out } = compile(evmVersion));
  }

  for (const e of out.errors ?? []) {
    if (e.severity === "error") console.error(e.formattedMessage);
    else console.warn(e.formattedMessage);
  }
  if ((out.errors ?? []).some((e: any) => e.severity === "error")) {
    console.error("\ncompile FAILED");
    process.exit(1);
  }

  const c = out.contracts["contracts/Halka.sol"].Halka;
  const artifact = {
    contractName: "contracts/Halka.sol:Halka",
    compilerVersion: `v${solc.version().replace(/\+.*/, "")}+commit.${solc.version().match(/commit\.([0-9a-f]+)/)?.[1] ?? ""}`,
    solcVersionRaw: solc.version(),
    evmVersion,
    abi: c.abi,
    bytecode: ("0x" + c.evm.bytecode.object) as `0x${string}`,
    standardJsonInput: input,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "Halka.json"), JSON.stringify(artifact, null, 2));

  const sizeKb = (c.evm.deployedBytecode.object.length / 2 / 1024).toFixed(1);
  console.log(`compiled OK  evmVersion=${evmVersion}  deployed size=${sizeKb} KB (Monad limit 128 KB)`);
  console.log(`-> artifacts/Halka.json`);
}

main();
