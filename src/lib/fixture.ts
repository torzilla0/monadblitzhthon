import {
  HALKA_ABI,
  HALKA_ADDRESS,
  monadTestnet,
  RPC_URL,
  type Item,
  type Cycle,
} from "./halka";
import { ALL_CITIES } from "./cities";

export { HALKA_ABI, HALKA_ADDRESS, monadTestnet, RPC_URL };
export type { Item, Cycle };

export const MONAD_TESTNET = {
  id: monadTestnet.id,
  rpc: RPC_URL,
  explorer: "https://testnet.monadscan.com",
} as const;

// 11 kişilik döngünün gerçek Monad Testnet yürütme kanıtı (tx hash)
export const PROOF_11_CYCLE_TX =
  "0xba04c5bd56c4344ee650aac9005a268f78f817101ac05c621b587bf567998bd9" as const;

export const FALLBACK_HALKA_ADDRESS = HALKA_ADDRESS;
export const FALLBACK_HALKA_ABI = HALKA_ABI;

// Türkiye Şehir Koordinatları (src/lib/cities.ts + ek şehirler birleşimi)
export const FIXTURE_CITIES: Record<string, { lat: number; lon: number }> = {
  ...Object.fromEntries(ALL_CITIES.map((c) => [c.name, { lat: c.lat, lon: c.lon }])),
  Hakkari: { lat: 37.5744, lon: 43.7408 },
  Ankara: { lat: 39.9334, lon: 32.8597 },
  Izmir: { lat: 38.4237, lon: 27.1428 },
  Trabzon: { lat: 41.0027, lon: 39.7168 },
  Gaziantep: { lat: 37.0662, lon: 37.3833 },
  Van: { lat: 38.4891, lon: 43.4089 },
  Bursa: { lat: 40.1826, lon: 29.0665 },
  Konya: { lat: 37.8746, lon: 32.4932 },
  Samsun: { lat: 41.2867, lon: 36.33 },
  Diyarbakir: { lat: 37.9144, lon: 40.2306 },
  Antalya: { lat: 36.8969, lon: 30.7133 },
  Erzurum: { lat: 39.9043, lon: 41.2679 },
  Eskisehir: { lat: 39.7767, lon: 30.5206 },
  Adana: { lat: 37.0, lon: 35.3213 },
  Istanbul: { lat: 41.0082, lon: 28.9784 },
  Kayseri: { lat: 38.7312, lon: 35.4787 },
  Mersin: { lat: 36.8121, lon: 34.6415 },
  Denizli: { lat: 37.7765, lon: 29.0864 },
  Mardin: { lat: 37.3212, lon: 40.7245 },
  Malatya: { lat: 38.3552, lon: 38.3095 },
  Canakkale: { lat: 40.1553, lon: 26.4142 },
  Sivas: { lat: 39.7477, lon: 37.0179 },
  Hatay: { lat: 36.4018, lon: 36.3498 },
  Mugla: { lat: 37.2153, lon: 28.3636 },
  Kars: { lat: 40.6013, lon: 43.0975 },
  Sanliurfa: { lat: 37.1591, lon: 38.7969 },
  Edirne: { lat: 41.6771, lon: 26.5557 },
  Rize: { lat: 41.0201, lon: 40.5234 },
};

export function normalizeCityKey(raw: string): string {
  const cityPart = raw.split("/")[0].trim();
  return cityPart
    .replace(/İ/g, "I")
    .replace(/ı/g, "i")
    .replace(/Ş/g, "S")
    .replace(/ş/g, "s")
    .replace(/Ğ/g, "G")
    .replace(/ğ/g, "g")
    .replace(/Ü/g, "U")
    .replace(/ü/g, "u")
    .replace(/Ö/g, "O")
    .replace(/ö/g, "o")
    .replace(/Ç/g, "C")
    .replace(/ç/g, "c");
}

function addr(n: number): `0x${string}` {
  return `0x${n.toString(16).padStart(4, "0")}${"a1b2c3d4e5f60718293a4b5c6d7e8f901234".slice(0, 36)}` as `0x${string}`;
}

// 1..11: Garantili 11'li Becayiş Döngüsü (Mod A Ana Gösteri)
// 12..14: 3'lü Becayiş Döngüsü
// 15..24: Gürültü (Noise) Kadroları (Döngü oluşturmayan gerçekçi talepler)
export const FIXTURE_ITEMS: Item[] = [
  // 11'li Ana Halka
  { id: 1, owner: addr(1), kind: 0, active: true, label: "Hakkari / Matematik" },
  { id: 2, owner: addr(2), kind: 0, active: true, label: "Ankara / Matematik" },
  { id: 3, owner: addr(3), kind: 0, active: true, label: "Izmir / Matematik" },
  { id: 4, owner: addr(4), kind: 0, active: true, label: "Trabzon / Matematik" },
  { id: 5, owner: addr(5), kind: 0, active: true, label: "Gaziantep / Matematik" },
  { id: 6, owner: addr(6), kind: 0, active: true, label: "Van / Matematik" },
  { id: 7, owner: addr(7), kind: 0, active: true, label: "Bursa / Matematik" },
  { id: 8, owner: addr(8), kind: 0, active: true, label: "Konya / Matematik" },
  { id: 9, owner: addr(9), kind: 0, active: true, label: "Samsun / Matematik" },
  { id: 10, owner: addr(10), kind: 0, active: true, label: "Diyarbakir / Matematik" },
  { id: 11, owner: addr(11), kind: 0, active: true, label: "Antalya / Matematik" },

  // 3'lü İkincil Halka
  { id: 12, owner: addr(12), kind: 0, active: true, label: "Erzurum / Matematik" },
  { id: 13, owner: addr(13), kind: 0, active: true, label: "Eskisehir / Matematik" },
  { id: 14, owner: addr(14), kind: 0, active: true, label: "Adana / Matematik" },

  // Gürültü Kadroları (henüz döngüsü kapanmamış talepler)
  { id: 15, owner: addr(15), kind: 0, active: true, label: "Istanbul / Matematik" },
  { id: 16, owner: addr(16), kind: 0, active: true, label: "Kayseri / Matematik" },
  { id: 17, owner: addr(17), kind: 0, active: true, label: "Mardin / Matematik" },
  { id: 18, owner: addr(18), kind: 0, active: true, label: "Malatya / Matematik" },
  { id: 19, owner: addr(19), kind: 0, active: true, label: "Canakkale / Matematik" },
  { id: 20, owner: addr(20), kind: 0, active: true, label: "Sivas / Matematik" },
  { id: 21, owner: addr(21), kind: 0, active: true, label: "Hatay / Matematik" },
  { id: 22, owner: addr(22), kind: 0, active: true, label: "Mugla / Matematik" },
  { id: 23, owner: addr(23), kind: 0, active: true, label: "Kars / Matematik" },
  { id: 24, owner: addr(24), kind: 0, active: true, label: "Sanliurfa / Matematik" },
];

export const FIXTURE_WANTS: Record<number, number[]> = {
  // 11'li halka: 1->2->3->4->5->6->7->8->9->10->11->1 (ve ikincil leksikografik tercihler)
  1: [2, 3, 7], // Hakkari -> önce Ankara, olmazsa İzmir, olmazsa Bursa
  2: [3, 11], // Ankara -> önce İzmir, olmazsa Antalya
  3: [4, 9], // İzmir -> önce Trabzon, olmazsa Samsun
  4: [5, 8], // Trabzon -> önce Gaziantep, olmazsa Konya
  5: [6, 10], // Gaziantep -> önce Van, olmazsa Diyarbakır
  6: [7, 2], // Van -> önce Bursa, olmazsa Ankara
  7: [8, 3], // Bursa -> önce Konya, olmazsa İzmir
  8: [9, 13], // Konya -> önce Samsun, olmazsa Eskişehir
  9: [10, 4], // Samsun -> önce Diyarbakır, olmazsa Trabzon
  10: [11, 5], // Diyarbakır -> önce Antalya, olmazsa Gaziantep
  11: [1, 2], // Antalya -> önce Hakkari (memleket), olmazsa Ankara

  // 3'lü halka: 12->13->14->12
  12: [13, 2], // Erzurum -> Eskişehir
  13: [14, 3], // Eskişehir -> Adana
  14: [12, 8], // Adana -> Erzurum

  // Gürültü kadrolarının açık tercih okları (döngü oluşturmayanlar)
  15: [22, 19], // İstanbul -> Muğla, Çanakkale
  16: [2, 8], // Kayseri -> Ankara, Konya
  17: [22, 11], // Mardin -> Muğla, Antalya
  18: [16, 2], // Malatya -> Kayseri, Ankara
  19: [3], // Çanakkale -> İzmir
  20: [9, 16], // Sivas -> Samsun, Kayseri
  21: [14, 11], // Hatay -> Adana, Antalya
  22: [3], // Muğla -> İzmir
  23: [9, 4], // Kars -> Samsun, Trabzon
  24: [5, 14], // Şanlıurfa -> Gaziantep, Adana
};

export const FIXTURE_CYCLES: Cycle[] = [
  {
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    participants: [
      addr(1),
      addr(2),
      addr(3),
      addr(4),
      addr(5),
      addr(6),
      addr(7),
      addr(8),
      addr(9),
      addr(10),
      addr(11),
    ],
    isTopChoice: true,
  },
  {
    items: [12, 13, 14],
    participants: [addr(12), addr(13), addr(14)],
    isTopChoice: true,
  },
];

// ---------------- MOD B: SALON GRAFI FIXTURE VERİSİ ----------------
const STICKER_NAMES = [
  "Mor Molandak #01",
  "Nad Chog #02",
  "Moyaki Kristal #03",
  "300ms Şimşek #04",
  "Paralel EVM #05",
  "Keone Kartı #06",
  "Osaka Bytecode #07",
  "Atomik Halka #08",
  "Becayiş Rozeti #09",
  "Strict Core #10",
  "Gale-Shapley #11",
  "Top Trading #12",
  "Monad Blitz #13",
  "Ankara v4 #14",
  "MTTC Uzantısı #15",
  "Mor Kirpi #16",
  "Faucet Damlası #17",
  "Sync Receipt #18",
  "Gas Saver #19",
  "Finality 600ms #20",
  "Molandak Kral #21",
  "Chog Efsanesi #22",
  "Sıfır Rüşvet #23",
  "Leksikografik #24",
];

export const FIXTURE_SALON_ITEMS: Item[] = STICKER_NAMES.map((label, idx) => ({
  id: 101 + idx,
  owner: addr(101 + idx),
  kind: 1,
  active: true,
  label,
}));

export const FIXTURE_SALON_WANTS: Record<number, number[]> = {
  // Halka 1 (6'lı): 101->102->103->104->105->106->101
  101: [102, 109],
  102: [103, 110],
  103: [104],
  104: [105, 112],
  105: [106],
  106: [101],
  // Halka 2 (5'li): 107->108->109->110->111->107
  107: [108],
  108: [109, 101],
  109: [110],
  110: [111],
  111: [107],
  // Halka 3 (4'lü): 112->113->114->115->112
  112: [113],
  113: [114],
  114: [115],
  115: [112],
  // Halka 4 (3'lü): 116->117->118->116
  116: [117],
  117: [118],
  118: [116],
  // Diğer açık oklar
  119: [101, 107],
  120: [112, 116],
  121: [104, 119],
  122: [108, 115],
  123: [102, 120],
  124: [113, 121],
};

export const FIXTURE_SALON_CYCLES: Cycle[] = [
  {
    items: [101, 102, 103, 104, 105, 106],
    participants: [addr(101), addr(102), addr(103), addr(104), addr(105), addr(106)],
    isTopChoice: true,
  },
  {
    items: [107, 108, 109, 110, 111],
    participants: [addr(107), addr(108), addr(109), addr(110), addr(111)],
    isTopChoice: true,
  },
  {
    items: [112, 113, 114, 115],
    participants: [addr(112), addr(113), addr(114), addr(115)],
    isTopChoice: true,
  },
  {
    items: [116, 117, 118],
    participants: [addr(116), addr(117), addr(118)],
    isTopChoice: true,
  },
];

/**
 * İstemci tarafı TTC / DFS Döngü Bulucu (Backend /api/cycles hazır olmadığında
 * veya kullanıcı yeni tercih eklediğinde anında gerçek döngü hesaplar).
 */
export function findCyclesClient(
  items: Item[],
  wants: Record<number, number[]>,
  maxDepth = 12
): Cycle[] {
  const activeMap = new Map<number, Item>();
  for (const it of items) {
    if (it.active) activeMap.set(it.id, it);
  }

  const foundCycles: number[][] = [];
  const seenSignatures = new Set<string>();

  function canonicalSignature(cycle: number[]): string {
    let minIdx = 0;
    for (let i = 1; i < cycle.length; i++) {
      if (cycle[i] < cycle[minIdx]) minIdx = i;
    }
    const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
    return rotated.join("-");
  }

  for (const startItem of activeMap.values()) {
    const startId = startItem.id;
    const path: number[] = [startId];
    const visitedIds = new Set<number>([startId]);
    const visitedOwners = new Set<string>([startItem.owner.toLowerCase()]);

    function dfs(currentId: number) {
      if (path.length > maxDepth) return;
      const targets = wants[currentId] || [];
      for (const nextId of targets) {
        const nextItem = activeMap.get(nextId);
        if (!nextItem) continue;

        if (nextId === startId && path.length >= 2) {
          const sig = canonicalSignature(path);
          if (!seenSignatures.has(sig)) {
            seenSignatures.add(sig);
            foundCycles.push([...path]);
          }
          continue;
        }

        const nextOwner = nextItem.owner.toLowerCase();
        if (visitedIds.has(nextId) || visitedOwners.has(nextOwner)) {
          continue;
        }

        visitedIds.add(nextId);
        visitedOwners.add(nextOwner);
        path.push(nextId);
        dfs(nextId);
        path.pop();
        visitedIds.delete(nextId);
        visitedOwners.delete(nextOwner);
      }
    }

    dfs(startId);
  }

  // Uzunluğa göre azalan sırala (Demoda 11'li döngü en başta)
  foundCycles.sort((a, b) => b.length - a.length);

  // Açgözlü (greedy) ayrık döngü seçimi
  const usedItems = new Set<number>();
  const result: Cycle[] = [];

  for (const cyc of foundCycles) {
    if (cyc.some((id) => usedItems.has(id))) continue;
    cyc.forEach((id) => usedItems.add(id));

    // verifyTTCStep kontrolü: döngüdeki her item aktif olan ilk tercihini mi alıyor?
    let isTopChoice = true;
    for (let i = 0; i < cyc.length; i++) {
      const currId = cyc[i];
      const targetId = cyc[(i + 1) % cyc.length];
      const currOwner = activeMap.get(currId)?.owner.toLowerCase();
      const prefs = wants[currId] || [];
      const firstActiveValid = prefs.find((tid) => {
        const tItem = activeMap.get(tid);
        return tItem && tItem.active && tItem.owner.toLowerCase() !== currOwner;
      });
      if (firstActiveValid !== targetId) {
        isTopChoice = false;
        break;
      }
    }

    result.push({
      items: cyc,
      participants: cyc.map((id) => activeMap.get(id)!.owner),
      isTopChoice,
    });
  }

  return result;
}
