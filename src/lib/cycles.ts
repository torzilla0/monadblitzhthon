import type { Item } from "./halka";

export type Board = {
  items: Item[];
  wants: Record<number, number[]>;
};

/**
 * Finds trade cycles in the directed graph "item -> items its owner wants".
 *
 * Picking the best SET of disjoint cycles is NP-hard (Abraham, Blum & Sandholm,
 * EC '07: the clearing problem with a cycle-length cap is NP-hard, and deciding
 * a perfect cycle cover with cycles of length <= L is NP-complete for L >= 3).
 * We do not attempt it: we enumerate cycles with a depth-limited DFS, prefer the
 * longest, and take disjoint ones greedily. The demo says so out loud.
 */
export function findCycles(board: Board, maxDepth = 14, maxCycles = 400): number[][] {
  const byId = new Map(board.items.map((i) => [i.id, i]));
  const active = (id: number) => byId.get(id)?.active === true;
  const ownerOf = (id: number) => byId.get(id)?.owner;

  const found: number[][] = [];
  const seen = new Set<string>();

  /** Canonical key so the same ring is not reported from every rotation. */
  const key = (cyc: number[]) => {
    const min = Math.min(...cyc);
    const k = cyc.indexOf(min);
    return [...cyc.slice(k), ...cyc.slice(0, k)].join(",");
  };

  for (const start of board.items) {
    if (!active(start.id)) continue;
    if (found.length >= maxCycles) break;

    const path: number[] = [];
    const onPath = new Set<number>();
    const ownersOnPath = new Set<string>();

    const dfs = (cur: number) => {
      if (found.length >= maxCycles) return;
      path.push(cur);
      onPath.add(cur);
      const o = ownerOf(cur);
      if (o) ownersOnPath.add(o.toLowerCase());

      for (const next of board.wants[cur] ?? []) {
        if (!active(next)) continue;

        if (next === start.id && path.length >= 2) {
          const k = key(path);
          if (!seen.has(k)) {
            seen.add(k);
            found.push([...path]);
          }
          continue;
        }
        if (onPath.has(next)) continue;
        if (path.length >= maxDepth) continue;

        // one person must not appear twice in a cycle: that is not a trade
        const no = ownerOf(next)?.toLowerCase();
        if (no && ownersOnPath.has(no)) continue;

        // only explore ids above the start, so each ring is enumerated once
        if (next < start.id) continue;

        dfs(next);
      }

      path.pop();
      onPath.delete(cur);
      if (o) ownersOnPath.delete(o.toLowerCase());
    };

    dfs(start.id);
  }

  found.sort((a, b) => b.length - a.length);

  // greedy disjoint selection: an item may take part in at most one cycle
  const used = new Set<number>();
  const chosen: number[][] = [];
  for (const cyc of found) {
    if (cyc.some((id) => used.has(id))) continue;
    cyc.forEach((id) => used.add(id));
    chosen.push(cyc);
  }
  return chosen;
}

/** Decode the packed snapshot() return into a Board. */
export function decodeSnapshot(
  snap: readonly [
    readonly `0x${string}`[],
    readonly (number | bigint)[],
    readonly boolean[],
    readonly string[],
    readonly (number | bigint)[],
    readonly (number | bigint)[],
  ]
): Board {
  const [owners, kinds, actives, labels, wantsFlat, wantsLen] = snap;
  const items: Item[] = owners.map((owner, i) => ({
    id: i + 1,
    owner,
    kind: Number(kinds[i]) as 0 | 1,
    active: actives[i],
    label: labels[i],
  }));

  const wants: Record<number, number[]> = {};
  let k = 0;
  for (let i = 0; i < wantsLen.length; i++) {
    const n = Number(wantsLen[i]);
    wants[i + 1] = Array.from(wantsFlat.slice(k, k + n)).map(Number);
    k += n;
  }
  return { items, wants };
}
