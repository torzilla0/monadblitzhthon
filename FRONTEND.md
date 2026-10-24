# Halka — Frontend + Sunum Brief

Bu dosyayı coding agent'ına olduğu gibi verebilirsin. Önce `TAKIM.md`'yi oku — arayüz sözleşmesi orada ve backend de aynısına uyuyor.

**Senin sorumluluğun:** tüm arayüz, burner cüzdan, Türkiye haritası, graf ekranı, Vercel deploy, 90 saniyelik video.
**Senin sorumluluğunda OLMAYAN:** Solidity, Hardhat, API rotalarının içi.

**Kritik:** Backend'in `src/lib/halka.ts` dosyası +0:20'de gelecek. **O gelene kadar bekleme** — aşağıdaki `FIXTURE` verisiyle başla, tipler aynı olduğu için sonra sadece veri kaynağını değiştireceksin.

---

## 0. Kurulum (+0:00 → +0:10)

Backend repoyu kuruyor. Ondan repo linkini al, klonla, `src/app` ve `src/components` altında çalış. Çakışmamak için **`contracts/`, `scripts/`, `src/app/api/` klasörlerine dokunma.**

```bash
git clone <repo>
cd halka
npm install
npm install viem@2.40.0
npm run dev
```

---

## 1. Hemen başla: FIXTURE verisi (+0:00)

Backend beklemeden bununla çalış. Tipler `TAKIM.md`'deki ile aynı.

```ts
// src/lib/fixture.ts
import type { Item, Cycle } from "./halka";   // backend +0:20'de verecek, o zamana kadar burada tanımla

export const FIXTURE_ITEMS: Item[] = [
  { id: 1,  owner: "0xaaa...", kind: 0, active: true, label: "Hakkari / Matematik" },
  { id: 2,  owner: "0xbbb...", kind: 0, active: true, label: "Ankara / Matematik" },
  { id: 3,  owner: "0xccc...", kind: 0, active: true, label: "Izmir / Matematik" },
  { id: 4,  owner: "0xddd...", kind: 0, active: true, label: "Trabzon / Matematik" },
  // ... 11'e kadar devam
];

export const FIXTURE_WANTS: Record<number, number[]> = {
  1: [2, 3],      // Hakkari'deki once Ankara, olmazsa Izmir istiyor
  2: [3, 4],
  3: [4, 5],
  // ... halka kapanacak sekilde: 11 -> [1]
};

export const FIXTURE_CYCLES: Cycle[] = [
  { items: [1,2,3,4,5,6,7,8,9,10,11], participants: [], isTopChoice: true },
  { items: [12,13,14], participants: [], isTopChoice: true },
];
```

---

## 2. Burner cüzdan (+0:10 → +0:30)

Salonun 10 saniyede içeri girmesini sağlayan parça. MetaMask **yok**, seed phrase **yok**.

```ts
// src/lib/wallet.ts
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, defineChain } from "viem";

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } },
});

const KEY = "halka.pk";

export function getOrCreateAccount() {
  let pk = localStorage.getItem(KEY) as `0x${string}` | null;
  if (!pk) {
    pk = generatePrivateKey();
    localStorage.setItem(KEY, pk);
  }
  return privateKeyToAccount(pk);
}

// Ilk girişte: hesabı oluştur, sonra POST /api/fund ile gas çek
```

**Akış:** QR okut → sayfa açılır → `getOrCreateAccount()` → `POST /api/fund` → 3 saniye içinde gas gelir → `claimStickers(3)` → kullanıcı oyunda.

`localStorage` erişimini **try/catch içine al** — gizli sekmede patlıyor.

### İşlem gönderirken

Monad'ın özel RPC metodunu kullan, demoyu akıcı yapan şey bu:

```ts
// eth_sendRawTransactionSync: gönder + makbuzu TEK çağrıda al, polling yok
const serialized = await walletClient.signTransaction({ ...tx, gas: 150000n });
const receipt = await publicClient.request({
  method: "eth_sendRawTransactionSync" as any,
  params: [serialized],
});
```

Gas limitini **elle ver** (`gas: 150000n` gibi). `eth_estimateGas` çağırmak cüzdan akışını yavaşlatıyor ve Monad'da gas **limit üzerinden** kesildiği için savurgan değer para yakar.

---

## 3. Çoklu seçim + sıralama arayüzü (+0:30 → +1:00)

Projenin teorik omurgası burası. Sıralama, algoritmanın çalışması için **gereken** veri.

İki panel:

**"Elimde olanlar"** — `getItemsOf(myAddress)` ile gelen itemlar, kart olarak. Her kartta "Bunun için ne istiyorsun?" butonu.

**"İstediklerim"** — seçilen item için, diğer itemların listesi. Kullanıcı birden fazla seçiyor **ve sıralıyor**:

```
1. Ankara / Matematik     [yukarı] [aşağı] [çıkar]
2. Izmir / Matematik      [yukarı] [aşağı] [çıkar]
3. Bursa / Matematik      [yukarı] [aşağı] [çıkar]
```

Drag-and-drop yapma, zaman yakar. **Yukarı/aşağı okları yeterli.**

"Kaydet" → `setWants(itemId, [2, 3, 7])` — sıra önemli, dizi sırası = tercih sırası.

Arayüzde bir satır açıklama bulunsun: *"Sıra önemli: en çok istediğini en üste koy."* Jüri bunun neden sıralı olduğunu soracak, cevabı ekranda dursun.

---

## 4. Mod A — Türkiye Haritası (+1:00 → +1:30) ★ ANA GÖSTERİ

**Videonun kazanan karesi bu. Zamanın çoğu buraya gitsin.**

- Türkiye haritası: basit SVG yeter, harita kütüphanesi kurmakla uğraşma. Backend `src/lib/cities.ts` içinde lat/lon veriyor; basit bir doğrusal projeksiyonla x/y'ye çevir.
- Her şehirde bir nokta, üstünde kadro etiketi.
- Her noktadan "gitmek istediği" şehre **ince gri ok**.
- `GET /api/cycles?kind=0` → bulunan döngüler.
- "Halkayı Bul" butonu → en uzun döngü **kalın ve renkli** olarak sırayla yanar (her kenar 150ms arayla — Monad'ın blok süresi 300ms, ritmi oraya oturt).
- "Takası Yürüt" → tek işlem gider, noktaların etiketleri **aynı anda** yer değiştirir.

İki yan panel — ikisi de jürinin puan verdiği kalemlere doğrudan hitap ediyor:

**Maliyet paneli**
```
Bu halka: 11 transfer
Monad'da:  0.0715 MON  (~$0.0018)
```

**Garanti paneli**
```
verifyTTCStep() -> true
"Bu 11 kişiden hiçbir alt grup, sistemden
 ayrılıp kendi arasında takas yaparak
 daha iyi duruma geçemezdi."
```

Altta explorer linki: `https://testnet.monadscan.com/tx/<hash>`

---

## 5. Mod B — Salon grafı (+1:30 → +1:50)

Canlı demoda salonu katılımcı yapan ekran. Video için ikincil, ama elde olsun.

- Kuvvet-yönlü graf (basit: itemları daire üzerine yerleştir, okları çiz — fizik motoru kurmakla uğraşma)
- Üstte sayaç: `47 kişi · 9 döngü · 112 transfer`
- Döngüler bulundukça renkli halkalar olarak yanıyor

---

## 6. Vercel deploy (+1:50 → +2:00) ★ DİSKALİFİYE SEBEBİ

**localhost ile teslim edilen proje diskalifiye.** Bunu erken yap, sona bırakma.

```bash
npm i -g vercel
vercel --prod
```

Environment variable'ları Vercel panelinden gir (`RELAYER_PRIVATE_KEY` vb. — backend'den al).

Deploy ettikten sonra **telefonundan aç ve test et.** Demo telefonlardan çalışacak.

---

## 7. 90 saniyelik video (+2:00 → +2:30)

Önceden kaydedilecek. Ekran kaydı + sesli anlatım. OBS veya Windows'ta `Win+G`.

### Kayıt öncesi hazırlık

- Tarayıcıyı temiz bir pencerede aç, sekmeleri kapat
- Haritayı hazır konumda bırak, "Halkayı Bul" butonuna basmaya hazır
- Explorer sekmesini önceden aç
- **Bir kere prova yap** — ilk çekimde süre tutmaz

### Metin (kelime kelime)

> **(0-18s) — harita ekranda**
> "Hakkari'de bir öğretmen Ankara'ya gelmek istiyor. Ankara'da Hakkari'ye gitmek isteyen kimse yok. Ama Ankara'da İzmir'e gitmek isteyen var, İzmir'de de Hakkari'ye gitmek isteyen var. Bu üçü istediği yere gidebilir — ama gidemiyorlar. Çünkü becayiş, 657'nin 73. maddesine göre **iki kişilik.**"
>
> **(18-32s)**
> "Sebep basit: üç kişilik halkada kim önce istifa eder? Devlet iki dilekçeyi aynı anda onaylayabiliyor. On bir kişiyi kimse aynı anda çıkaramıyor."
>
> **(32-50s) — "Halkayı Bul" + "Takası Yürüt"**
> "Akıllı kontratın yaptığı tek şey bu. On bir kişi, tek işlem. Ya hepsi yer değiştirir ya hiçbiri. Arada çekilme yok, çünkü ara yok."
>
> **(50-68s) — garanti paneli**
> "Algoritma Top Trading Cycles. İki kanıtlanmış özelliği var: yalan söyleyerek daha iyi bir yer alamazsınız, ve hiçbir alt grup sistemden ayrılıp daha iyisini yapamaz. Para el değiştirmiyor — mevzuatın yasakladığı pazarlık yapısal olarak imkânsız."
>
> **(68-82s) — maliyet paneli + explorer**
> "On bir transfer, Monad'da bir kuruşun altı. Literatür bu döngüleri üçte kesiyor çünkü eşzamanlılık fiziksel olarak imkânsız. Zincirde imkânsız değil."
>
> **(82-90s)**
> "Bir sendika bu sistemi MEB'den resmen istedi. Yok. Biz bugün yaptık. İşte canlı link, işte kontrat."

### Eksikleri söyleme kısmı

Rubrikte "upfront about what's unfinished" **puan getiriyor**. 90 saniyeye sığmazsa teslim notuna yaz:

> "Üç şey eksik: bu hukuki bir araç değil, prototip — gerçek becayişte amirin onayı gerekiyor ve onay akışını modellemedik. Garantiler leksikografik tercih varsayıyor. En iyi döngü kümesini bulmak NP-hard, biz sezgisel arıyoruz."

---

## 8. Teslim (+2:30 → +2:45)

blitz.devnads.com üzerinden, **16:30'dan önce**:

- [ ] 90 saniyelik video
- [ ] Canlı Vercel URL'i (telefonda test edilmiş)
- [ ] Public GitHub repo linki
- [ ] Kontrat adresi + explorer linki
- [ ] Kategori: `Consumer / Marketplace`
- [ ] Takım üyeleri

---

## Tasarım notları

Rubrik açıkça **"worry less about perfect UI/UX"** diyor. Buna uy:

- Tailwind'in varsayılanları yeterli, tasarım sistemi kurma
- Koyu tema + Monad'ın moru (`#836EF9`) aksan olarak
- Animasyon sadece bir yerde: **halkanın yanması.** Başka hiçbir yerde.
- Mobil: tek kolon, 16px kenar boşluğu. Mükemmel olmasına uğraşma, çalışsın yeter.
- **Sakın** landing page, hakkımızda sayfası, footer, dark/light toggle yapma. Zaman yakar, puan getirmez.

### Öncelik sırası — zaman yetmezse buradan kes

1. Türkiye haritası + halka animasyonu + yürütme ★ bunsuz video olmaz
2. Vercel deploy ★ bunsuz diskalifiye
3. Video ★ bunsuz teslim olmaz
4. Maliyet ve garanti panelleri
5. Burner cüzdan + çoklu seçim arayüzü
6. Mod B salon grafı ← ilk kesilecek şey
