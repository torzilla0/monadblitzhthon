# Halka — atomic multi-party barter cycles on Monad

Built at **Monad Blitz Ankara v4**, 24 October 2026. All code written during the event.

**Live contract:** [`0x118bb2018ca413a961f627ebf3b01afd6cd8eee7`](https://testnet.monadscan.com/address/0x118bb2018ca413a961f627ebf3b01afd6cd8eee7) on Monad Testnet (chain 10143)

**Proof it works:** an 11-party cycle settled in a single transaction →
[`0xba04c5bd…98bd9`](https://testnet.monadscan.com/tx/0xba04c5bd56c4344ee650aac9005a268f78f817101ac05c621b587bf567998bd9)

---

## What it does

Three or more people swap posts or items **in one transaction**, atomically.

The concrete problem: becayiş, the mutual-transfer right in Article 73 of Turkish
law 657, is **two-person by construction** — two civil servants in the same
service class petition together. So a teacher in Hakkari who wants Ankara is
stuck unless someone in Ankara wants Hakkari. But if someone in Ankara wants
İzmir and someone in İzmir wants Hakkari, all three could get what they want.
Today they cannot: there is no three-person becayiş.

Halka finds those cycles and executes them. Each participant lists, in order,
which posts they would accept. The engine searches the directed graph for cycles
and the contract executes each one atomically: **either every participant moves,
or nobody does.**

## Why this needs a blockchain

The barter-exchange literature already solves cycle finding — kidney exchange is
the canonical case. It caps cycles at length 2–3, and the reason is not
mathematical. From Abraham, Blum & Sandholm (EC '07): long cycles are forbidden
because *"for incentive reasons, all transplants in a cycle must be performed
simultaneously."* Eleven simultaneous operating rooms is impossible, and if one
party withdraws halfway the rest are harmed.

Becayiş has exactly the same shape: in a three-person ring, **who resigns
first?** The state can approve two petitions together. Nobody can move eleven
people at once.

A smart contract is a simultaneous executor that needs no trusted party. Once
simultaneity is free, the length cap disappears. That is the whole contribution.

Two further properties fall out of it: no money changes hands (Turkish civil
service rules forbid bargaining over a posting, on pain of disciplinary action),
and every step is publicly auditable.

## The algorithm

Top Trading Cycles (Gale). Under strict preferences TTC is strategyproof and
selects the strict core; Roth (1982) proved strategyproofness and Ma (1994)
showed the strong-core rule is the **unique** rule that is Pareto efficient,
strategyproof and individually rational.

`verifyTTCStep(cycle)` checks the TTC invariant on-chain: every item in the cycle
receives its most-preferred currently-tradeable item. When that holds, the
outcome is the TTC outcome. This is deliberately **not** a full core check —
verifying the core directly means enumerating coalitions, which is exponential.
We do not claim it.

## Why Monad specifically

1. **Lifting the cap means long cycles, and long cycles mean many transfers.**
   An 11-party cycle is 11 ownership writes in one transaction. Charged at the
   100 MON-gwei floor this costs a fraction of a cent; the same product is
   uneconomic where each transfer costs real money.
2. **Clearing is NP-hard**, so we search a wide graph and verify on-chain.
   Monad's 30M per-transaction gas limit carries it.
3. **Disjoint cycles touch disjoint storage pages**, so Monad's parallel
   executor settles them concurrently and re-runs only the ones that conflict.

## Repository layout

```
contracts/Halka.sol        the contract: items, ranked preferences, executeCycle, verifyTTCStep
scripts/compile.ts         solc-js compile  -> artifacts/Halka.json
scripts/deploy.ts          deploy with viem -> .env + src/lib/halka.ts
scripts/setup-wallet.ts    create/fund the deployer via the devnads faucet
scripts/seed.ts            seed 20 becayis posts, 11 of them a guaranteed ring
scripts/execute.ts         find cycles and execute the longest one
src/lib/halka.ts           GENERATED: address, ABI, shared types (frontend imports this)
src/lib/chain.ts           Monad Testnet chain definition
src/lib/cycles.ts          cycle finder (depth-limited DFS, greedy disjoint selection)
src/lib/cities.ts          Turkish cities + map projection
src/app/api/state          whole board in one snapshot() call, cached 2s
src/app/api/cycles         cycles + on-chain verifyTTCStep for each
src/app/api/fund           drips gas to a browser burner wallet
```

## Setup

Requires Node 20+.

```bash
npm install
npx tsx scripts/setup-wallet.ts     # creates .env, pulls MON from the faucet
npx tsx scripts/compile.ts
npx tsx scripts/deploy.ts           # writes the address into .env and src/lib/halka.ts
npx tsx scripts/seed.ts             # 20 posts, 11 of them a ring
npm run dev                         # http://localhost:3000
```

Verify the seeded ring and execute it:

```bash
npx tsx scripts/execute.ts          # dry run: list the cycles it found
npx tsx scripts/execute.ts --send   # execute the longest one
```

`.env` holds `PRIVATE_KEY`, `RELAYER_PRIVATE_KEY` and `HALKA_ADDRESS`. It is
gitignored and contains testnet keys only.

## API

```
GET  /api/state?kind=0   -> { items, wants }
GET  /api/cycles?kind=0  -> { cycles: [{ items, participants, isTopChoice }] }
POST /api/fund           -> { ok, txHash }      body: { address }
```
`kind` is 0 for becayiş posts and 1 for room-demo stickers.

## Three Monad behaviours that shaped the code

These cost us real time, so they are written down.

- **Gas is charged on the limit, not on usage** (`value + gas_price * gas_limit`).
  A loose 6M limit on a seeding call really did burn about 1 MON. Every script
  pins both the gas limit and `maxFeePerGas`.
- **Reserve balance: every EOA reserves 10 MON.** A transaction that decrements
  the balance and leaves the sender below that reserve reverts at execution —
  the ending balance may dip below it only by the gas spend. An account holding
  less than 10 MON can therefore only move value through the *emptying
  transaction* exception, available once every k=3 blocks. Funding twenty
  fixture wallets concurrently landed exactly one transfer. Transfers are now
  spaced, and `/api/fund` serialises them.
- **No global mempool.** Transactions go to the next few leaders, and ones whose
  nonce is not the account's next are dropped rather than queued, so bursts from
  a single account need care.

## What is NOT finished

Stated plainly, because it matters more than hiding it.

- **This is a prototype, not a legal instrument.** A real becayiş needs the
  appointing authority's approval; we did not model that approval flow.
- The guarantees assume **strict, lexicographic preferences**. With general
  indifferences the strict core can be empty, and in multiple-type markets no
  mechanism is simultaneously Pareto efficient, individually rational and
  strategyproof.
- **Choosing the best set of disjoint cycles is NP-hard.** We search
  depth-limited and select greedily; we do not claim optimality.
- Cycle *search* runs off-chain. Cycle *verification and execution* are
  on-chain, so nobody can execute a cycle that does not exist.
- The 20 becayiş posts are synthetic fixtures whose preferences are recorded by
  `seedWants` (admin-only, and only for seeded posts). Room participants sign
  their own `setWants` from their own wallet.

## License

MIT
