# Halka — Takım Planı ve Arayüz Sözleşmesi

**İkiniz de bunu okuyun.** Rol brief'leriniz: `BACKEND.md` (Erdem) ve `FRONTEND.md` (takım arkadaşı).

---

## Ne yapıyoruz

**Halka**, üç veya daha fazla kişinin yer/eşya değiştirmesini **tek işlemde atomik olarak** gerçekleştiren bir takas motoru.

Çözdüğü problem: becayiş (657 sayılı Kanun madde 73) yapısı gereği **iki kişilik**. Hakkari'deki öğretmen Ankara'ya gelmek istiyor; Ankara'da Hakkari'ye gitmek isteyen yok. Ama Ankara'da İzmir'e, İzmir'de Hakkari'ye gitmek isteyen var. Bu üçü istediği yere gidebilir — mevcut sistemde gidemiyor.

Neden kimse çözmedi: böbrek nakli takas literatürü (Abraham, Blum & Sandholm, EC '07) döngüleri 2-3'te kesiyor, çünkü *"teşvik nedenleriyle bir döngüdeki tüm nakillerin eşzamanlı yapılması gerekir."* Kısıt matematik değil, **fizik**. Akıllı kontratta eşzamanlılık bedava — sınırı kaldırıyoruz.

**Tek cümlelik satış:** "Üç kişilik halkada kim önce istifa eder? Devlet iki dilekçeyi aynı anda onaylayabiliyor, on bir kişiyi kimse çıkaramıyor. Kontrat çıkarabilir."

---

## Kurallar (atlanırsa diskalifiye)

| Kural | Sonucu |
|---|---|
| **Tüm kod bugün yazılacak** | Mevcut proje kullanmak yok. `npx create-next-app` ile sıfırdan. Standart kütüphaneler serbest. |
| **Canlı URL zorunlu** | localhost diskalifiye. Vercel'e deploy. |
| **Public GitHub repo** | Özel repo kabul edilmiyor. |
| **Kontrat etkinlik içinde deploy** | Monad Testnet (10143). |
| **Düzgün README** | Ne yapıyor, nasıl kurulur, nasıl çalıştırılır. |
| **Teslim 16:30** | blitz.devnads.com üzerinden. 90 saniyelik video + linkler. |

---

## Zaman çizelgesi (3 saat)

| Saat | Backend (Erdem) | Frontend (takım arkadaşı) |
|---|---|---|
| **+0:00 → +0:20** | Repo kur, `Halka.sol` iskeleti, **ABI + tipleri `src/lib/halka.ts`'e commit et** | Next.js kur, burner cüzdan, `FIXTURE` verisiyle UI iskeleti |
| **+0:20** | — | **ABI geldi, gerçek tiplere geç** |
| **+0:20 → +1:00** | Kontratı bitir, testnet'e deploy, adresi commit et | Çoklu seçim + sıralama arayüzü |
| **+1:00** | **Adres hazır** | Adresi bağla, okuma çalışıyor |
| **+1:00 → +1:30** | Döngü bulucu `/api/cycles`, faucet `/api/fund` | Türkiye haritası ekranı (Mod A) |
| **+1:30 → +2:00** | Seed script, kontrat doğrulama | Graf ekranı (Mod B), paneller |
| **+2:00** | **ÖZELLİK DONDURMA** | Vercel'e deploy, uçtan uca test |
| **+2:00 → +2:30** | README yaz | **Video kaydı** |
| **+2:30 → +2:45** | Son kontrol | Teslim |

**En büyük risk: entegrasyonu sona bırakmak.** +1:00'da frontend gerçek kontrata bağlanmış olmalı.

---

## ARAYÜZ SÖZLEŞMESİ — ikisi de buna uyacak

Bu bölüm her iki brief'te birebir aynı. **Değiştirmeyin, değiştirmek gerekirse ikiniz de aynı anda değiştirin.**

### Veri modeli

Kontrat eşyaların/kadroların sahipliğini **kendi içinde** tutuyor. ERC-1155 yok, approve yok, external transfer yok — döngü yürütmek sadece sahip ataması değiştirmek demek. Bu hem çok daha hızlı yazılıyor hem atomikliği tartışmasız kılıyor.

```solidity
struct Item {
    address owner;     // şu anki sahibi
    uint8   kind;      // 0 = kadro (becayiş modu), 1 = sticker (salon modu)
    bool    active;    // takas edildikten sonra da true kalır; sadece iptalde false
    string  label;     // "Hakkari / Matematik" veya "Mor Molandak"
}
```

### Kontrat ABI (kesin imzalar)

```solidity
// --- OKUMA ---
function itemCount() external view returns (uint32);
function getItem(uint32 itemId) external view returns (
    address owner, uint8 kind, bool active, string memory label
);
function getItemsOf(address who) external view returns (uint32[] memory);
function getWants(uint32 itemId) external view returns (uint32[] memory);
function rankOf(uint32 itemId, uint32 targetId) external view returns (uint16);
    // 0 = istenmiyor, 1 = en çok istenen, 2 = ikinci, ...

// --- YAZMA ---
function claimStickers(uint8 howMany) external returns (uint32[] memory);
    // salon modu: çağırana rastgele sticker verir (max 3)

function setWants(uint32 itemId, uint32[] calldata rankedTargets) external;
    // SADECE itemId'nin sahibi çağırabilir
    // rankedTargets = leksikografik tercih, en çok istenen önce
    // eski liste tamamen silinir ve yenisi yazılır

function executeCycle(uint32[] calldata cycle) external;
    // cycle = [A, B, C] şu anlama gelir:
    //   A'nın sahibi B'yi alır
    //   B'nin sahibi C'yi alır
    //   C'nin sahibi A'yı alır
    // Kontrat şunları doğrular, biri geçersizse TÜMÜ revert:
    //   1. cycle.length >= 2
    //   2. her item active
    //   3. tüm sahipler birbirinden farklı
    //   4. her i için rankOf(cycle[i], cycle[i+1]) > 0   <-- herkes aldığını gerçekten istiyor
    // Sonra sahipleri atomik olarak kaydırır ve wants listelerini temizler.

function verifyTTCStep(uint32[] calldata cycle) external view returns (bool);
    // true dönerse: döngüdeki HER item, o an aktif olan EN ÇOK istediği item'ı alıyor
    // Bu, Top Trading Cycles'ın değişmezi — sağlandığında sonuç strict core'da
    // Demoda gösterdiğimiz garanti bu. Tam core kontrolü eksponansiyel, bunu iddia etmiyoruz.

// --- OLAYLAR ---
event ItemCreated(uint32 indexed itemId, address indexed owner, uint8 kind, string label);
event WantsSet(uint32 indexed itemId, uint32[] rankedTargets);
event CycleExecuted(uint32[] cycle, address[] participants, uint256 length);
```

### Paylaşılan TypeScript dosyası

Backend bunu **+0:20'de** commit eder, frontend buradan import eder. Tek doğruluk kaynağı.

```ts
// src/lib/halka.ts
export const HALKA_ADDRESS = "0x..." as const;   // +1:00'da dolacak
export const HALKA_ABI = [ /* ... */ ] as const;

export const MONAD_TESTNET = {
  id: 10143,
  rpc: "https://testnet-rpc.monad.xyz",
  explorer: "https://testnet.monadscan.com",
} as const;

export type Item = {
  id: number;
  owner: `0x${string}`;
  kind: 0 | 1;          // 0 = kadro, 1 = sticker
  active: boolean;
  label: string;
};

export type Cycle = {
  items: number[];            // item id'leri, döngü sırasında
  participants: `0x${string}`[];
  isTopChoice: boolean;       // verifyTTCStep sonucu
};
```

### API rotaları (backend yazar, frontend çağırır)

```
POST /api/fund
  body:  { address: "0x..." }
  200:   { ok: true, txHash: "0x..." }
  429:   { ok: false, error: "rate_limited" }
  → burner cüzdana gas damlatır (devnads faucet + kendi cüzdanımız)

GET  /api/cycles?kind=0
  200:   { cycles: Cycle[] }
  → off-chain DFS ile döngüleri bulur, en uzundan kısaya sıralı döner
  → kind=0 becayiş kadroları, kind=1 salon stickerları

GET  /api/state?kind=0
  200:   { items: Item[], wants: Record<number, number[]> }
  → tek çağrıda tüm durum (frontend bunu 2 saniyede bir çeker)
  → Multicall3 (0xcA11bde05977b3631167028862bE2a173976CA11) ile batch okuma
```

**Frontend kuralı:** backend hazır olmadan `FIXTURE` verisiyle çalış, aynı tipleri kullan. Rotalar gelince sadece veri kaynağını değiştir.

### Monad'a özgü kurallar (ikisi de bilsin)

- Chain ID **10143**, RPC `https://testnet-rpc.monad.xyz`
- **Gas, kullanılan değil LİMİT üzerinden kesiliyor** (`value + gas_price * gas_limit`). Gas limitini savurgan ayarlamayın.
- `eth_sendRawTransactionSync` destekli: işlem gönder + makbuz al **tek çağrıda**, polling yok. Demoyu akıcı yapan şey bu.
- Solidity config'de **`evmVersion: "osaka"` şart.**
- `eth_getLogs` ile polling yapmayın. `/api/state` yeterli.
- Multicall3: `0xcA11bde05977b3631167028862bE2a173976CA11`

### devnads Agents API (auth yok, ikisi de kullanabilir)

```bash
# Gas al (adres başına günde 10 MON, IP başına 50)
curl -X POST https://agents.devnads.com/v1/faucet \
  -H "Content-Type: application/json" \
  -d '{"chainId":10143,"address":"0xSENIN_ADRESIN"}'

# Kontrat doğrula  (evmVersion'ı MUTLAKA osaka geç, varsayılanı prague ve uyuşmaz)
curl -X POST https://agents.devnads.com/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"chainId":10143,"contractAddress":"0x...","contractName":"src/Halka.sol:Halka",
       "compilerVersion":"v0.8.28+commit.7893614a","evmVersion":"osaka",
       "standardJsonInput":{}}'
```

---

## Kapsam dışı (yapmayın, zaman yok)

- ERC-1155 / ERC-721 entegrasyonu — sahiplik kontratın içinde, yeterli
- Gerçek MEB onay akışı — prototip olduğunu söylüyoruz
- Tam core doğrulaması — eksponansiyel, `verifyTTCStep` yeterli
- Kullanıcı hesapları, login, profil — burner cüzdan yeterli
- Mobil responsive mükemmelliği — rubrik "worry less about perfect UI/UX" diyor
- Optimal döngü kümesi araması — NP-hard, açgözlü yeterli

---

## Demoda söyleyeceğimiz eksikler

Rubrikte "upfront about what's unfinished" puan getiriyor. Videonun sonunda:

1. Hukuki araç değil, prototip — gerçek becayişte amirin onayı gerekiyor, onay akışını modellemedik.
2. Garantiler leksikografik tercih varsayıyor; genel tercihlerde strict core boş olabilir.
3. En iyi döngü kümesini bulmak NP-hard; biz sezgisel arıyoruz.
4. Döngü arama off-chain; yürütme ve doğrulama zincirde.
