# Halka — çok taraflı takas altyapısı

**Monad Blitz Ankara v4** · 24 Ekim 2026 · tüm kod etkinlik içinde yazıldı

🔗 **Canlı:** https://halka-rosy.vercel.app
📄 **Kontrat:** [`0x118bb201…d8eee7`](https://testnet.monadscan.com/address/0x118bb2018ca413a961f627ebf3b01afd6cd8eee7) · Monad Testnet (10143) · Monadscan'de doğrulanmış
✅ **Kanıt:** 11 kişilik bir takas, [tek işlemde](https://testnet.monadscan.com/tx/0xba04c5bd56c4344ee650aac9005a268f78f817101ac05c621b587bf567998bd9)

---

## Ne yapıyor

Üç veya daha fazla kişinin yer ya da eşya değiştirmesini **tek işlemde, atomik olarak** gerçekleştirir.

İkili takas çoğu zaman tıkanır: A, B'nin yerini ister ama B, A'nınkini istemez. Oysa A→B→C→A şeklinde kapanan bir halka varsa üçü de istediğini alır. Halka bu halkaları bulur ve hepsini aynı anda taşır — **ya hepsi, ya hiçbiri.**

Örnek alan olarak **becayişi** (657 sayılı Kanun madde 73, memurların karşılıklı yer değiştirmesi) seçtik. Mevzuat yapısı gereği iki kişilik: aynı kurum, aynı hizmet sınıfı, karşılıklı dilekçe. Üç tarafın birlikte takası tanımlı bir yol değil. Bir sendika merkezi bir eşleştirme sistemi için MEB'e başvurdu; böyle bir sistem yok, insanlar Facebook gruplarında elle eşleşme arıyor.

Aynı sıkışma hemşire nöbetinde, yurt odasında, vardiya değişiminde, ikinci el takasında da var.

## Neden blockchain

Üç kişilik bir halkada **kim önce istifa eder?** Birinci istifa ettiğinde ikinci hâlâ görevdedir; vazgeçerse birinci hem işsiz hem evsiz kalır. Devlet iki dilekçeyi aynı anda onaylayabiliyor, on bir kişiyi kimse aynı anda çıkaramıyor.

Akıllı kontrat, güvenilir bir aracıya ihtiyaç duymayan bir **eşzamanlı yürütücüdür**. `executeCycle` halkanın her bağını yeniden doğrular; biri geçersizse işlemin tamamı geri alınır. Arada çekilme diye bir şey yoktur, çünkü "ara" yoktur.

İkincisi: mevzuat görev yerinin para karşılığı pazarlanmasını yasaklıyor. Burada **para el değiştirmiyor**, eşleştirmeyi algoritma yapıyor, her adım denetlenebiliyor.

## Neden Monad

1. **Sınırı kaldırmak uzun halka demek.** 11 kişilik bir halka tek işlemde 11 sahiplik yazımı. Monad'da bir kuruşun altı; transfer başına gerçek para yakan bir ağda bu ürün ekonomik değil.
2. **Temizleme problemi NP-hard.** Geniş bir graf tarayıp doğrulamayı zincirde yapıyoruz; işlem başına 30M gas limiti bunu taşıyor.
3. **Ayrık halkalar ayrı storage sayfalarına dokunur**, Monad'ın paralel yürütücüsü eşzamanlı işler.

## Algoritma

**Top Trading Cycles** (Gale). Kesin tercihler altında strategyproof ve strict core'da bir dağıtım üretir. Roth (1982) strategyproofness'ı kanıtladı; Ma (1994) bunun Pareto etkinlik + strategyproofness + bireysel akılcılığı birlikte sağlayan **tek kural** olduğunu gösterdi.

`verifyTTCStep(cycle)` bu değişmezi zincirde kontrol eder: halkadaki her kadro, o an takas edilebilir en çok istediği kadroyu alıyor mu? Sağlanıyorsa sonuç TTC sonucudur.

Bu **tam bir core kontrolü değildir** — core'u doğrudan doğrulamak tüm koalisyonları taramak demektir ve eksponansiyeldir. Böyle bir iddiada bulunmuyoruz.

## Kullanım

Sayfada yönetici rolündesiniz: kadroları ve tercihleri siz girersiniz.

1. **Kayıtlı öğretmenler** tablosu kimin nerede olduğunu ve sıralı tercihlerini gösterir
2. **🎲 30 Öğretmen Yeniden Üret** zincire yeni bir parti yazar, öncekini emekliye ayırır
3. **+ 5 Öğretmen Ekle** emekliye ayırmadan ekler
4. **Şu an seçili halka** bulunan bütün halkaları listeler
5. **Takası Yürüt** seçili halkayı tek işlemde gerçekleştirir

## Kurulum

Node 20+ gerekir.

```bash
npm install
npx tsx scripts/setup-wallet.ts   # .env üretir, musluktan MON çeker
npx tsx scripts/compile.ts        # solc-js
npx tsx scripts/deploy.ts         # adresi .env ve src/lib/halka.ts içine yazar
npx tsx scripts/seed.ts           # 20 kadro, 11'i bir halka
npm run dev
```

```bash
npx tsx scripts/execute.ts          # bulunan halkaları listele
npx tsx scripts/execute.ts --send   # en uzun halkayı yürüt
npx tsx scripts/verify-claims.ts    # tüm iddiaları zincirde sına
```

## Mimari

```
contracts/Halka.sol     sahiplik, sıralı tercihler, executeCycle, verifyTTCStep
scripts/                derleme, deploy, seed, yürütme, doğrulama (solc-js + viem)
src/lib/halka.ts        ÜRETİLEN: adres, ABI, paylaşılan tipler
src/lib/cycles.ts       halka bulucu (derinlik sınırlı DFS, açgözlü ayrık seçim)
src/app/api/state       tüm tahta tek snapshot() çağrısında
src/app/api/cycles      halkalar + her biri için zincirde verifyTTCStep
src/app/api/simulate    eth_call ile kuru çalıştırma, gas harcamaz
src/app/api/seed-random rastgele öğretmen partisi üretir
src/app/api/fund        tarayıcı cüzdanına gas damlatır
```

Hardhat yerine **solc-js + viem** kullandık: Monad dokümanları Windows'ta Hardhat için WSL 2 öneriyor ve tek kontrat için bu zincir gereksizdi.

## Monad'ın bize öğrettiği üç şey

- **Gas, kullanılan değil limit üzerinden kesiliyor** (`value + gas_price * gas_limit`). Bir seed çağrısına verdiğimiz gevşek 5M limit gerçekten ~0.6 MON yaktı. Artık her script `estimateContractGas` + %20 kullanıyor.
- **Her EOA 10 MON rezerv tutuyor.** Bakiyeyi rezervin altına düşüren bir işlem execution'da revert eder; tek çıkış, 3 blokta bir kullanılabilen "emptying transaction" istisnası. 20 cüzdanı eşzamanlı fonlamak tam bir transferi tutturdu.
- **Global mempool yok.** İşlemler sıradaki birkaç lidere gider; nonce'u sırada olmayan işlemler kuyruğa alınmaz, düşer.

## Bitmemiş olanlar

- **Hukuki araç değil, prototip.** Gerçek becayişte atamaya yetkili amirin onayı gerekir; onay akışını modellemedik.
- Garantiler **leksikografik tercih** varsayar. Genel kayıtsızlıklarda strict core boş olabilir; çok tipli piyasalarda Pareto etkinlik + bireysel akılcılık + strategyproofness'ı birlikte sağlayan mekanizma yoktur.
- **En iyi ayrık halka kümesini bulmak NP-hard.** Derinlik sınırlı arayıp açgözlü seçiyoruz; optimallik iddia etmiyoruz.
- Halka **arama** off-chain; **doğrulama ve yürütme** zincirde.
- Kontratta kadro silme yok. "Yeniden üret" eski partinin tercihlerini temizleyerek emekliye ayırır.

## Kaynaklar

**Algoritma ve teori**
- Shapley & Scarf, *On Cores and Indivisibility* — housing market modeli ve Gale'in Top Trading Cycles algoritması
- Roth (1982), *Incentive compatibility in a market with indivisible goods* — TTC'nin strategyproof olduğu
- Ma (1994), *Strategy-proofness and the strict core in a market with indivisible goods* — teklik teoremi
- Abraham, Blum & Sandholm, *Clearing Algorithms for Barter Exchange Markets* (EC '07) — döngü uzunluğu kısıtlı temizlemenin NP-hard olduğu ve kısıtın sebebi: *"bir döngüdeki tüm nakiller eşzamanlı yapılmalı"*
- Sikdar, Adali & Xia (AAAI 2017) — çok tipli piyasalarda MTTC, leksikografik tercihler altında strict-core
- Hatfield & Milgrom, *Matching with Contracts* (AER) — eşleştirme ve takasın ortak çerçevesi

**Mevzuat ve bağlam**
- 657 sayılı Devlet Memurları Kanunu, madde 73 — karşılıklı yer değiştirme (becayiş)
- Eğitim Gücü Sen'in MEB'e merkezi becayiş sistemi başvurusu

**Teknik**
- [Monad dokümanları](https://docs.monad.xyz) — ağ bilgileri, gas fiyatlaması, rezerv bakiyesi, EIP-7966
- [devnads Agents API](https://agents.devnads.com) — musluk ve kontrat doğrulama
- viem, Next.js, solc-js

## Lisans

MIT
