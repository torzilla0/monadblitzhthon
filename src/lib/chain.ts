import { defineChain } from "viem";

export const RPC_URL = "https://testnet-rpc.monad.xyz";

/** Monad Testnet. Defined by hand so we do not depend on a viem/chains version. */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Monadscan", url: "https://testnet.monadscan.com" },
  },
  testnet: true,
});
