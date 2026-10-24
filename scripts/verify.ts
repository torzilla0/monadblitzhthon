/** Verifies the deployed contract on MonadVision + Monadscan via devnads. */
import fs from "node:fs"; import path from "node:path";
const ROOT = process.cwd();
const env = (k: string) => fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(new RegExp(`^${k}=(.*)$`, "m"))![1];
const a = JSON.parse(fs.readFileSync(path.join(ROOT, "artifacts", "Halka.json"), "utf8"));
(async () => {
  const body = {
    chainId: 10143,
    contractAddress: env("HALKA_ADDRESS"),
    contractName: "contracts/Halka.sol:Halka",
    compilerVersion: "v0.8.30+commit.73712a01",
    evmVersion: a.evmVersion,            // MUST be osaka; the API defaults to prague
    optimizationUsed: true,
    runs: 200,
    standardJsonInput: a.standardJsonInput,
  };
  const r = await fetch("https://agents.devnads.com/v1/verify", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  console.log("POST /v1/verify ->", r.status, (await r.text()).slice(0, 500));
  await new Promise((s) => setTimeout(s, 6000));
  const st = await fetch(`https://agents.devnads.com/v1/verify/status/10143/${body.contractAddress}`);
  console.log("status ->", st.status, (await st.text()).slice(0, 400));
})();
