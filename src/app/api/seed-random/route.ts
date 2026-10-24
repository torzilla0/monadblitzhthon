import { NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HALKA_ABI, HALKA_ADDRESS, monadTestnet, RPC_URL } from "@/lib/halka";

/**
 * Yeni bir rastgele öğretmen partisi üretir ve ZİNCİRE yazar.
 *
 * Gerçek işlem gönderir, yani testnet MON harcar (yaklaşık 0.4-0.7 MON).
 * Tarayıcıda sahte satır üretmek yerine zincire yazıyoruz: tablo ve halka
 * bulucu zaten zinciri okuyor, sahte veri eklersek ikisi birbirini tutmaz.
 */

const CITIES = [
  "Adiyaman", "Afyon", "Agri", "Amasya", "Artvin", "Aydin", "Balikesir",
  "Bilecik", "Bingol", "Bitlis", "Bolu", "Burdur", "Corum", "Edirne",
  "Elazig", "Erzincan", "Giresun", "Isparta", "Karabuk", "Kastamonu",
  "Kirsehir", "Kutahya", "Nevsehir", "Nigde", "Ordu", "Rize", "Sinop",
  "Tokat", "Usak", "Yozgat", "Zonguldak", "Aksaray", "Karaman", "Batman",
];
const BRANCHES = ["Matematik", "Turkce", "Fen", "Ingilizce", "Tarih", "Resim"];

const FEES = {
  maxFeePerGas: 120_000_000_000n,
  maxPriorityFeePerGas: 1_000_000_000n,
} as const;

/** Deterministik ama parti başına farklı cüzdanlar. */
function ownerFor(batch: number, i: number) {
  return privateKeyToAccount(keccak256(toHex(`halka-random-${batch}-${i}`)))
    .address;
}

/** Tohumlanabilir rastgelelik: aynı parti aynı sonucu verir. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Seed script'inin yazdığı becayiş tahtası: bunlara asla dokunmuyoruz. */
const BASE_BOARD = 20;

export async function POST(req: Request) {
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!key) {
    return NextResponse.json({ ok: false, error: "relayer_not_configured" }, { status: 500 });
  }

  let mode: "replace" | "append" = "replace";
  let COUNT = 30;
  try {
    const body = await req.json();
    if (body?.mode === "append") mode = "append";
    if (Number.isInteger(body?.count)) COUNT = Math.min(30, Math.max(1, body.count));
  } catch {
    /* gövdesiz çağrı = varsayılan: 30 kişiyi yeniden üret */
  }

  try {
    const admin = privateKeyToAccount(key as `0x${string}`);
    const pub = createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
    const wallet = createWalletClient({ account: admin, chain: monadTestnet, transport: http(RPC_URL) });

    const before = Number(
      await pub.readContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "itemCount",
      })
    );

    const batch = before + 1;
    const rand = rng(batch * 7919 + Date.now() % 100000);

    // "Yeniden üret": kontratta kadro silme yok, o yüzden önceki rastgele
    // partilerin TERCİHLERİNİ temizliyoruz. Tercihi olmayan kadro hiçbir
    // halkaya giremez ve tabloda da gizleniyor, yani pratikte emekli oluyor.
    // Becayiş tahtasının ilk BASE_BOARD kadrosuna dokunmuyoruz.
    if (mode === "replace" && before > BASE_BOARD) {
      // Sadece kind-0 (seed) kadroları temizlenebilir: seedWants kind-1
      // sticker'larda NotSeededItem ile revert ediyor. Ayrıca zaten boş
      // olanları da atlıyoruz, boşuna gas yakmayalım.
      const snap = (await pub.readContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "snapshot",
      })) as readonly [
        readonly `0x${string}`[],
        readonly (number | bigint)[],
        readonly boolean[],
        readonly string[],
        readonly (number | bigint)[],
        readonly (number | bigint)[],
      ];
      const kinds = snap[1];
      const wantsLen = snap[5];

      const stale: number[] = [];
      for (let i = BASE_BOARD; i < kinds.length; i++) {
        const id = i + 1;
        if (Number(kinds[i]) === 0 && Number(wantsLen[i]) > 0) stale.push(id);
      }
      const empty = stale.map(() => [] as number[]);

      if (stale.length === 0) {
        // temizlenecek bir şey yok, doğrudan yeni partiye geç
      } else {
      const estClear = await pub.estimateContractGas({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "seedWants",
        args: [stale, empty],
        account: admin,
      });
      const hashClear = await wallet.writeContract({
        address: HALKA_ADDRESS,
        abi: HALKA_ABI,
        functionName: "seedWants",
        args: [stale, empty],
        gas: (estClear * 120n) / 100n,
        ...FEES,
      });
      await pub.waitForTransactionReceipt({ hash: hashClear });
      await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const owners = Array.from({ length: COUNT }, (_, i) => ownerFor(batch, i));
    const labels = Array.from({ length: COUNT }, (_, i) => {
      const city = CITIES[(i + batch * 3) % CITIES.length];
      const branch = BRANCHES[Math.floor(rand() * BRANCHES.length)];
      return `${city} / ${branch}`;
    });

    // --- 1. kadroları yaz ---
    const hash1 = await wallet.writeContract({
      address: HALKA_ADDRESS,
      abi: HALKA_ABI,
      functionName: "seedItems",
      args: [owners, labels],
      gas: 8_000_000n,
      ...FEES,
    });
    const r1 = await pub.waitForTransactionReceipt({ hash: hash1 });
    if (r1.status !== "success") {
      return NextResponse.json({ ok: false, error: "seedItems_reverted", txHash: hash1 }, { status: 502 });
    }

    // Monad'da rezerv sınırı yüzünden iki işlem arasında birkaç blok bırakıyoruz.
    await new Promise((r) => setTimeout(r, 1800));

    // --- 2. her kadroya 2-4 rastgele tercih ---
    const ids = Array.from({ length: COUNT }, (_, i) => before + 1 + i);
    const wants: number[][] = ids.map((_, i) => {
      const howMany = 2 + Math.floor(rand() * 3); // 2,3,4
      const picked = new Set<number>();
      // İlk tercih bir sonraki kadro: böylece bu parti kendi içinde
      // en az bir kapanan halka garanti eder.
      picked.add(ids[(i + 1) % COUNT]);
      while (picked.size < howMany) {
        const cand = ids[Math.floor(rand() * COUNT)];
        if (cand !== ids[i]) picked.add(cand);
      }
      return [...picked];
    });

    const est = await pub.estimateContractGas({
      address: HALKA_ADDRESS,
      abi: HALKA_ABI,
      functionName: "seedWants",
      args: [ids, wants],
      account: admin,
    });

    const hash2 = await wallet.writeContract({
      address: HALKA_ADDRESS,
      abi: HALKA_ABI,
      functionName: "seedWants",
      args: [ids, wants],
      gas: (est * 120n) / 100n,
      ...FEES,
    });
    const r2 = await pub.waitForTransactionReceipt({ hash: hash2 });
    if (r2.status !== "success") {
      return NextResponse.json({ ok: false, error: "seedWants_reverted", txHash: hash2 }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      created: COUNT,
      firstId: ids[0],
      lastId: ids[ids.length - 1],
      txHashes: [hash1, hash2],
    });
  } catch (e: unknown) {
    const err = e as { details?: string; shortMessage?: string };
    return NextResponse.json(
      { ok: false, error: err.details ?? err.shortMessage ?? "failed" },
      { status: 502 }
    );
  }
}
