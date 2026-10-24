# Halka — Backend Brief (Erdem)

Bu dosyayı coding agent'ına olduğu gibi verebilirsin. Önce `TAKIM.md`'yi oku — arayüz sözleşmesi orada ve frontend de aynısına uyuyor.

**Senin sorumluluğun:** akıllı kontrat, testnet deploy, döngü bulucu, API rotaları, seed verisi, kontrat doğrulama.
**Senin sorumluluğunda OLMAYAN:** hiçbir React bileşeni, hiçbir CSS, video.

**Kritik:** `src/lib/halka.ts` dosyasını **+0:20'de** commit et, kontrat bitmemiş olsa bile. Frontend ona bakarak çalışıyor. Geciktirirsen iki kişi birden tıkanır.

---

## 0. Kurulum (+0:00 → +0:10)

```bash
npx create-next-app@latest halka --typescript --tailwind --eslint --app --src-dir --no-import-alias
cd halka
npm install viem@2.40.0
npm install --save-dev hardhat@2 @nomicfoundation/hardhat-toolbox dotenv
npx hardhat init   # TypeScript, mevcut dizine
git init && git add -A && git commit -m "init"
```

GitHub'da **public** repo aç ve push et. Diskalifiye sebebi.

`hardhat.config.ts`:

```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "osaka",          // ZORUNLU - Monad bunu istiyor
      optimizer: { enabled: true, runs: 200 },
      metadata: { bytecodeHash: "ipfs" },   // doğrulama için gerekli
    },
  },
  networks: {
    monadTestnet: {
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
};
export default config;
```

`.env` (repoya **koymayacaksın**, `.gitignore`'da olsun):

```
PRIVATE_KEY=0x...
RELAYER_PRIVATE_KEY=0x...
```

Deployer cüzdanına hemen gas al — her şeyden önce bunu yap:

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST https://agents.devnads.com/v1/faucet \
    -H "Content-Type: application/json" \
    -d '{"chainId":10143,"address":"0xSENIN_ADRESIN"}'
  sleep 2
done
```

Adres başına günde 10 MON sınırı var. 5 MON yeter ama **erken al** — öğleden sonra fark edersen kurtarmak zor.

---

## 1. Kontrat: `contracts/Halka.sol` (+0:10 → +0:50)

Tam spesifikasyon. Agent'a bunu ver.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Halka {
    struct Item {
        address owner;
        uint8   kind;      // 0 = kadro (becayis), 1 = sticker (salon)
        bool    active;
        string  label;
    }

    uint32 public itemCount;
    mapping(uint32 => Item) private _items;
    mapping(address => uint32[]) private _owned;

    // itemId -> siralanmis istek listesi
    mapping(uint32 => uint32[]) private _wants;
    // itemId -> targetId -> sira+1  (0 = istenmiyor, 1 = en cok istenen)
    mapping(uint32 => mapping(uint32 => uint16)) private _rank;

    address public immutable admin;

    event ItemCreated(uint32 indexed itemId, address indexed owner, uint8 kind, string label);
    event WantsSet(uint32 indexed itemId, uint32[] rankedTargets);
    event CycleExecuted(uint32[] cycle, address[] participants, uint256 length);

    constructor() { admin = msg.sender; }

    // ---------- SEED (sadece admin, becayis kadrolari icin) ----------
    function seedItems(
        address[] calldata owners,
        string[]  calldata labels
    ) external returns (uint32[] memory ids) { /* kind = 0 */ }

    // ---------- SALON MODU ----------
    function claimStickers(uint8 howMany) external returns (uint32[] memory ids) {
        // howMany <= 3, cagiran daha once claim etmediyse
        // label'lari sabit bir isim dizisinden pseudo-rastgele sec
        //   (blockhash + msg.sender + i  -- VRF gerekmez, demo)
        // kind = 1
    }

    // ---------- TERCIHLER ----------
    function setWants(uint32 itemId, uint32[] calldata rankedTargets) external {
        // require(_items[itemId].owner == msg.sender)
        // require(_items[itemId].active)
        // ESKI listeyi temizle: _wants[itemId] icindeki her target icin _rank[itemId][t] = 0
        // sonra yeni listeyi yaz: _rank[itemId][rankedTargets[i]] = uint16(i + 1)
        // require(rankedTargets.length <= 64)
        // kendi item'ini isteyemez, ayni target iki kez olamaz
        // emit WantsSet
    }

    // ---------- DONGU YURUTME ----------
    function executeCycle(uint32[] calldata cycle) external {
        uint256 n = cycle.length;
        require(n >= 2, "cycle too short");

        // 1) hepsi aktif, sahipleri farkli
        // 2) her i icin: _rank[cycle[i]][cycle[(i+1) % n]] > 0
        //    yani cycle[i]'nin sahibi, alacagi item'i gercekten istiyor
        // 3) sahipleri topla
        // 4) ATOMIK KAYDIRMA:
        //    cycle[i]'nin sahibi  <-  cycle[(i+1) % n]'in eski sahibi olur
        //    pratikte: owners[i] yeni olarak cycle[(i+1)%n]'i alir
        // 5) _owned dizilerini guncelle
        // 6) katilan her item icin wants listesini temizle (eski tercihler artik gecersiz)
        // 7) emit CycleExecuted

        // Herhangi bir require patlarsa TUM islem revert eder.
        // Atomiklik iste bu - projenin tek cumlelik satis argumani.
    }

    // ---------- TTC DEGISMEZI ----------
    function verifyTTCStep(uint32[] calldata cycle) external view returns (bool) {
        // Dongudeki HER item, o an aktif olan EN COK istedigi item'i mi aliyor?
        // Her i icin:
        //   target = cycle[(i+1) % n]
        //   _wants[cycle[i]] listesini basindan tara
        //   ilk AKTIF ve sahibi farkli olan eleman == target  ise devam, degilse false
        // Hepsi gecerse true.
        //
        // Bu saglandiginda sonuc Top Trading Cycles'in urettigi sonuctur
        // ve kesin tercihler altinda strict core'dadir (Roth 1982, Ma 1994).
        // TAM core kontrolu eksponansiyel - onu iddia etmiyoruz.
    }

    // ---------- OKUMA ----------
    function getItem(uint32 itemId) external view
        returns (address owner, uint8 kind, bool active, string memory label);
    function getItemsOf(address who) external view returns (uint32[] memory);
    function getWants(uint32 itemId) external view returns (uint32[] memory);
    function rankOf(uint32 itemId, uint32 targetId) external view returns (uint16);
}
```

### Agent'a verilecek dikkat notları

- **`executeCycle` tüm doğrulamaları `require` ile yapsın.** Kısmi başarı diye bir şey olmayacak — ürünün tek satış argümanı bu.
- Gas limiti savurgan ayarlanmasın: Monad'da **gas limit üzerinden** kesiliyor, kullanılan üzerinden değil.
- String `label` saklamak pahalı ama kontrat limiti 128KB, sorun değil. Okunabilirlik demoda önemli.
- `_owned` dizisinden silme işini "swap & pop" ile yap, sıra önemli değil.
- Testler: en az bir 3'lü döngü, bir 5'li döngü, ve **bir başarısız döngü** (biri istemiyorsa revert ettiğini kanıtla). Bu son test demoda anlatacağımız şeyin kanıtı.

---

## 2. `src/lib/halka.ts` — EN ÖNEMLİ TESLİM (+0:20)

Kontrat bitmemiş olsa bile **imzalar kesinleştiği an** bunu commit et ve frontend'e haber ver.

```ts
export const MONAD_TESTNET = {
  id: 10143,
  rpc: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadscan.com",
} as const;

export const HALKA_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
// ^ +1:00'da gerçek adresle değiştir ve push et

export const HALKA_ABI = [ /* hardhat artifacts'tan kopyala */ ] as const;

export type Item = {
  id: number;
  owner: `0x${string}`;
  kind: 0 | 1;
  active: boolean;
  label: string;
};

export type Cycle = {
  items: number[];
  participants: `0x${string}`[];
  isTopChoice: boolean;
};
```

---

## 3. Deploy (+0:50 → +1:00)

```bash
npx hardhat run scripts/deploy.ts --network monadTestnet
```

Çıkan adresi `HALKA_ADDRESS`'e yaz, commit et, **frontend'e söyle.** Bu an entegrasyonun kilidini açıyor.

Sonra doğrula:

```bash
curl -X POST https://agents.devnads.com/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"chainId":10143,"contractAddress":"0xKONTRAT",
       "contractName":"contracts/Halka.sol:Halka",
       "compilerVersion":"v0.8.28+commit.7893614a",
       "evmVersion":"osaka",
       "standardJsonInput":<artifacts/build-info içindeki input objesi>}'
```

`evmVersion`'ı açıkça geçmezsen API varsayılan olarak `prague` kullanır ve bytecode uyuşmaz. Doğrulama başarılı olsa bile komut hata basabiliyor — explorer'dan kontrol et.

---

## 4. Seed verisi: becayiş kadroları (+1:30 → +1:45)

`scripts/seed.ts` — demonun ana gösterisi buna bağlı. **İçinde en az bir 11'li döngü garantili olacak.**

```ts
// 11 sehir, her biri bir sonrakini istiyor -> garantili 11'li dongu
const RING = [
  "Hakkari / Matematik", "Ankara / Matematik", "Izmir / Matematik",
  "Trabzon / Matematik", "Gaziantep / Matematik", "Van / Matematik",
  "Bursa / Matematik", "Konya / Matematik", "Samsun / Matematik",
  "Diyarbakir / Matematik", "Antalya / Matematik",
];
// + 20-30 tane gurultu kadrosu (dongu olusturmayan, grafi gercekci gosteren)
// Her kadro icin ayri bir burner adres uret (deterministik, seed'den)
// seedItems() ile yaz, sonra her biri icin setWants() cagir
```

Şehirlerin koordinatlarını frontend istiyor — `src/lib/cities.ts` olarak sen ver:

```ts
export const CITIES: Record<string, { lat: number; lon: number }> = {
  "Hakkari": { lat: 37.57, lon: 43.74 },
  "Ankara":  { lat: 39.93, lon: 32.86 },
  // ... 11 + gurultu sehirleri
};
```

---

## 5. API rotaları (+1:00 → +1:30)

### `POST /api/fund`

```ts
// src/app/api/fund/route.ts
// 1. body'den address al, doğrula
// 2. IP başına basit rate limit (in-memory Map yeter, 3 istek/dk)
// 3. RELAYER_PRIVATE_KEY cüzdanından 0.05 MON gönder
//    - gas limitini SABIT 21000 ver, eth_estimateGas'ı atla
// 4. { ok: true, txHash } dön
```

Niye kendi relayer'ımız: devnads faucet'i adres başına günde 10 MON veriyor ama **adres başına** — 100 kullanıcının her biri ayrı ayrı çağırmak zorunda kalır ve IP limiti (50/gün) patlar. Biz bir kere 10 MON alıp kendimiz dağıtıyoruz.

### `GET /api/state?kind=0`

```ts
// Multicall3 (0xcA11bde05977b3631167028862bE2a173976CA11) ile:
//   itemCount() -> sonra tüm getItem + getWants çağrılarını TEK batch'te
// Cevabı 2 saniye cache'le (frontend 2 sn'de bir çekiyor)
// { items: Item[], wants: Record<number, number[]> }
```

Seri `eth_call` yapma — her biri bir round trip. Monad dokümanı bunu açıkça uyarıyor.

### `GET /api/cycles?kind=0`

Döngü bulucu. Saf TypeScript, zincire dokunmuyor.

```ts
// 1. /api/state'ten durumu al
// 2. Yönlü graf kur: item i -> wants[i] içindeki her j için kenar
// 3. DFS ile döngü ara (Johnson's algorithm gerek yok, basit DFS yeter)
//    - maxDepth = 12  (11'li döngümüzü bulmalı)
//    - aynı sahibi iki kez içeren döngüleri at
// 4. Bulunan döngüleri UZUNLUĞA GÖRE AZALAN sırala
//    (demoda en uzunu göstermek istiyoruz)
// 5. Çakışan döngüleri ayıkla: bir item yalnızca bir döngüde olsun (açgözlü)
// 6. Her döngü için verifyTTCStep() çağırıp isTopChoice'ı doldur
// 7. { cycles: Cycle[] } dön
```

**Optimal döngü kümesi bulmak NP-hard** (Abraham/Blum/Sandholm) — açgözlü gidiyoruz ve bunu demoda söylüyoruz. Agent'a "optimize et" dedirtme, zaman yakar.

---

## 6. Son kontrol listesi (+2:30)

- [ ] Repo **public** ve push edilmiş
- [ ] `.env` repoda **yok**
- [ ] Kontrat testnet'te deploy ve doğrulanmış, explorer linki elde
- [ ] `HALKA_ADDRESS` gerçek adres
- [ ] Seed çalıştırılmış, 11'li döngü `/api/cycles`'ta görünüyor
- [ ] `/api/fund` çalışıyor, relayer cüzdanında bakiye var
- [ ] En az 3 Hardhat testi geçiyor (3'lü döngü, 5'li döngü, başarısız döngü revert)
- [ ] README: ne yapıyor, kurulum, çalıştırma, kontrat adresi, explorer linki

---

## Takıldığın yerde

- **Monad dokümanları:** docs.monad.xyz, tam index `docs.monad.xyz/llms.txt`
- **Monad Discord:** discord.gg/monaddev
- **Explorer:** testnet.monadscan.com ve testnet.monadvision.com
- Faucet tükendiyse mentorlardan testnet MON iste
