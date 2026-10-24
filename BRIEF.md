HALKA — Monad Blitz Ankara v4 Proje Brifingi
1. Tek paragrafta ne yapıyoruz

Halka, üç veya daha fazla kişinin yer ya da eşya değiştirmesini tek işlemde, atomik olarak gerçekleştiren bir takas motorudur. Çözdüğü somut problem: becayiş (karşılıklı yer değiştirme) 657 sayılı Kanun’a göre yalnızca iki kişilik olduğu için, birbirine tam uyan üç kişi istediği yere gidemiyor. Kullanıcılar elindekini ve istediklerini sıralı olarak, birden fazla seçebiliyor; sistem yönlü graf üzerinde takas döngülerini buluyor ve her döngüyü zincir üstünde ya tamamen ya hiç gerçekleştiriyor. Kullandığımız algoritma Top Trading Cycles’ın çok mallı uzantısı (MTTC); verdiğimiz garanti “en iyi takas” değil, strict core — yani hiçbir alt grup sistemden ayrılıp kendi arasında takas yaparak daha iyi duruma geçemez.

2. Problem: becayiş yapısı gereği iki kişilik

657 sayılı Devlet Memurları Kanunu’nun 73. maddesi memurların karşılıklı yer değiştirmesine izin verir. Mekanizmanın şartları: aynı kurumun personeli olmak, farklı görev yerlerinde bulunmak, aynı hizmet sınıfında olmak, karşılıklı dilekçe vermek ve atamaya yetkili amirin onayı. Kaynaklarda mekanizmanın özü şöyle tarif ediliyor: “iki memurun anlaşması yeterlidir.” Üç tarafın birlikte takası mevzuatta tanımlı bir yol değil.

Somut hali şu:

Hakkari’deki bir öğretmen Ankara’ya gelmek istiyor. Ankara’da Hakkari’ye gitmek isteyen kimse yok. Ama Ankara’da İzmir’e gitmek isteyen biri var, İzmir’de de Hakkari’ye gitmek isteyen biri var. Bu üç kişi istediği yere gidebilir. Mevcut sistemde gidemiyor.

Üç destekleyici gerçek:

Talep belgelenmiş, arz yok. Eğitim Gücü Sen, öğretmenlerin karşılıklı yer değiştirme taleplerinin merkezi bir dijital sistemde eşleştirilmesi için MEB’e resmî başvuru yaptı. Gerekçede, mevcut yer değiştirme sisteminde öğretmenlerin bu taleplerini iletebilecekleri ve uygun eşleşmeleri görebilecekleri sistematik bir uygulamanın bulunmadığı belirtiliyor.

Bugün bu iş elle yürüyor. Facebook gruplarında insanlar kendilerine “tam tersi” birini arıyor. becayis.net ve becayismerkezi.com gibi siteler var ama hepsi ilan tahtası: ikili eşleştirme yapıyor, döngü aramıyor.

Bir uyum riski var ve bu bizim en güçlü kartımız. Mevzuata göre devlet memurluğunda görev yeri para karşılığı pazarlık konusu yapılamaz; böyle bir durum disiplin cezası gerektirir. Bizim tasarımda para el değiştirmiyor, eşleştirmeyi algoritma yapıyor ve her adım denetlenebilir. Yani mevzuatın yasakladığı şeyi yapısal olarak imkânsız kılıyoruz.

Aynı problemin diğer görünümleri
Alan	Örnek	İkili takas neden yetmiyor
Memur, öğretmen	Becayiş (657/73)	Mevzuat iki kişilik, döngü tanımlı değil
Sağlık	Nöbet ve vardiya değişimi	Üç yollu takas yapan ticari yazılım yok
Üniversite	Yurt odası, yatay geçiş	Tam tersi tercihi olan kişiyi bulmak şans işi
Konut	Ev takası, daire değişimi	Üçlü halka organize edilemiyor
Koleksiyon	Kart, ayakkabı, kitap, plak	Platformlar ikili kilitli

Vardiya takası özellikle güçlü bir örnek, çünkü boşluk akademik olarak kabul edilmiş durumda. Hemşire çizelgeleme literatüründe çift takas sezgiseli “birden fazla değişken arasında çoklu takas gereken durumları hesaba katamıyor” deniyor; bir yüksek lisans tezi takası “yalnızca bir takas zincirinin parçası olarak” ele alıyor. Üç yollu takası yapan ticari rostering yazılımı bulunamadı.

3. Neden bugüne kadar kimse çözmedi

Bu yeni bir problem değil. Böbrek nakli takasında aynısı var: benim böbreğim sana uyuyor, senin bana uymuyor — ama üçlü bir halka herkesi kurtarıyor. Literatür bunu çözmüş durumda.

Temel makale Abraham, Blum & Sandholm, “Clearing algorithms for barter exchange markets” (EC ‘07). İki şey söylüyor:

Birincisi, problem zor. Döngü uzunluğu kısıtlı takas temizleme problemi NP-hard. Karar versiyonu: bir grafın uzunluğu ≤ L döngülerden oluşan tam döngü örtüsü kabul edip etmediğine karar vermek L ≥ 3 için NP-complete. Yaklaşıklama tarafında da sınırlar var: MAX-WEIGHT-L-EXCHANGE için 14/13, MAX-WEIGHT-3-EXCHANGE için 434/433 boşluk raporlanıyor.

İkincisi — ve asıl mesele bu — sınırın neden konduğu. Literatür döngüleri 2-3 kişide kesiyor. Sebebi algoritma değil:

“Uzun döngüler yasaktır, çünkü teşvik nedenleriyle bir döngüdeki tüm nakillerin eşzamanlı yapılması gerekir.”

Yani kısıt fiziksel. On bir kişilik bir böbrek döngüsü için on bir ameliyathanenin aynı anda çalışması gerekir, ve biri son anda çekilirse geri kalan on kişi zarar görür.

Becayişte bunun tam karşılığı var ve soru şu: üç kişilik bir halkada kim önce istifa edecek? Hakkari’deki öğretmen istifa etti, ama Ankara’daki henüz çıkmadı. Çekilirse adam hem işsiz hem evsiz kalır.

Devlet iki dilekçeyi aynı anda onaylayabiliyor — ikili becayiş eşzamanlı yürütülebiliyor. On bir kişiyi kimse aynı anda çıkaramıyor. Mekanizma yok.

Akıllı kontratın yaptığı tek şey bu: eşzamanlılığı bedava kılmak. Zincir üstünde on bir taraflı bir döngü tek işlemdedir — ya on birinin hepsi yerini değiştirir ya hiçbiri değiştirmez. Arada çekilme diye bir şey yok, çünkü “ara” diye bir şey yok.

Projenin tek cümlelik katkısı şu:

Takas literatürü döngüleri üçte kesiyor çünkü eşzamanlılık fiziksel olarak imkânsız. Zincirde imkânsız değil. Sınırı kaldırıyoruz.

4. Matematiksel omurga
4.1 Tek mallı temel: TTC

Klasik model Shapley-Scarf housing market: her ajan bir ev sahibi, herkes başkasının evini isteyebilir, para yok. Çözüm algoritması Gale’in Top Trading Cycles (TTC)’dir:

Her ajan en çok istediği malın sahibine bir ok çizer.
Her düğümün tam bir çıkış oku olduğu sonlu grafda mutlaka en az bir döngü vardır.
Döngüler yürütülür, o ajanlar ve malları piyasadan çıkar.
Kalanlarla tekrarlanır.

Kesin tercihler (strict preferences) altındaki garantiler:

Özellik	Anlamı
Strategyproof	Yalan söyleyerek daha iyi bir sonuç alamazsın
Pareto etkin	Kimseyi kötüleştirmeden kimse iyileştirilemez
Core’da	Hiçbir alt grup ayrılıp kendi arasında daha iyisini yapamaz

Kaynaklar: Roth (1982) strategy-proofness’ı kanıtladı. Ma (1994) daha güçlü bir şey gösterdi — “strong core rule”, Pareto etkinlik + strategyproofness + bireysel akılcılığı birlikte sağlayan tek kuraldır. Ve kesin tercihler altında strong core rule = TTC.

Yani “bu algoritmayı neden seçtiniz” sorusunun cevabı bir tercih değil, bir teklik teoremi.

4.2 Kayıtsızlık problemi (bilinmesi gereken sınır)

Tercihlerde kayıtsızlık (indifference) olduğunda tablo bozuluyor. Sabit tie-break’li TTC, genel kayıtsızlıklar altında ne Pareto etkin ne de grup-strategyproof, ve core boş olmasa bile core dışı bir sonuç verebiliyor. Yalnızca “nesnel kayıtsızlık”ta (herkesin aynı şeyler arasında kayıtsız olması) garantiler korunuyor.

Biz kesin tercih varsayıyoruz ve bunu demoda söyleyeceğiz.

4.3 Çok mallı uzantı — ve çoklu seçimin neden teorik zorunluluk olduğu

Klasik TTC varsayımı: herkes tek bir mala sahip, tek bir mal istiyor. “Birden fazla ver, birden fazla al” dediğimiz an problem başka bir sınıfa geçiyor: multiple-type housing markets.

Orada iki kötü haber var:

Strict core boş olabilir.
Pareto etkin + bireysel akılcı + strategyproof olan hiçbir mekanizma yok. (İmkânsızlık teoremi.)

Ama çıkış yolları belirlenmiş durumda:

Varyant	Ne yapıyor	Koruduğu garantiler
bTTC (bundle)	Ajanlar yalnızca tüm varlıklarını bütün olarak takas eder	Strategyproofness, non-bossiness
cTTC (coordinate-wise)	Her tip ayrı ayrı takas edilir	Strategyproofness, non-bossiness
MTTC (Sikdar, Adali & Xia, AAAI 2017)	Çok tipli piyasa için TTC uzantısı	Leksikografik tercihler altında: polinom zaman, strict-core seçimi, non-bossiness, güçlü grup-strategyproofness

MTTC bizim seçtiğimiz yol. Ve kritik nokta şu: MTTC’nin garantileri leksikografik tercihler alanında geçerli. Leksikografik tercih = “önce şunu istiyorum, o olmazsa şunu, o da olmazsa şunu” — yani sıralanmış bir çoklu seçim listesi.

Dolayısıyla arayüzdeki “birden fazla seç, sırala” tasarımı bir kullanıcı deneyimi detayı değil, algoritmanın çalışması için gereken veri yapısının kendisi. Onsuz klasik TTC’yiz (ve NeoSwap’a yakınız), onunla MTTC’yiz (ve kimsenin olmadığı yerdeyiz).

Not: MTTC’nin grup-strategyproofness’ı, ajanların tipler üzerindeki önem sıralaması hakkında yalan söylemediği koşuluna bağlı. Bu da söylenecek bir sınır.

4.4 Çatı: Matching with Contracts

İlginç bir arka plan bilgisi: “kararlı eşleşme” (Gale-Shapley) ile “takas” (TTC) aynı matematiksel ailenin iki üyesi. Hatfield & Milgrom’un “Matching with Contracts” çerçevesi (AER) bunları tek çatı altında topluyor — temel analiz birimi “kontrat”; çerçeve kolej yerleştirme problemini, Kelso-Crawford işgücü eşleştirmesini ve artan paket ihalelerini özel durum olarak içeriyor. İkame edilebilirlik (substitutability) altında kararlı bir kontrat kümesi var oluyor; “cumulative offer” mekanizması onu buluyor.

Bu bilgi sunumda gerekmez ama bir jüri üyesi “bu Gale-Shapley’den ne kadar farklı” diye sorarsa cevabı burada.

5. NeoSwap ve diğerlerinden nasıl ayrılıyoruz

Bu, sorulması en muhtemel soru. Dürüst ve net cevap:

Sistem	Ne yapıyor	Bizden farkı
NeoSwap	Çok mallı, çok taraflı NFT takası. Kendi tanımıyla “birçok taraf arasındaki en iyi çoklu takası bulan algoritma”	Optimizasyon iddiası. Core garantisi, strategyproofness veya döngü uzunluğu sınırını kaldırma iddiası yok. Ayrıca yalnızca Stacks üzerinde ve kaynakları ~4 yıllık.
NFBarter	NFT için fiyat yerine takas teklifi listeleme	Yalnızca ikili. Döngü bulmuyor.
becayis.net / becayismerkezi.com	Becayiş ilan tahtası	İkili eşleştirme. Algoritma yok, döngü yok, yürütme garantisi yok.
Splitwise benzeri araçlar	Hesabı çıkarır	Yürütmeyi garanti etmez (bu bizim 3. fikrimizdi, farklı problem)
Böbnek nakli programları	Döngü bulur, gerçekten çalışır	Döngüleri 2-3'te kesiyor — fiziksel eşzamanlılık kısıtı yüzünden

Farkımızı üç cümlede özetlemek gerekirse:

NeoSwap optimize ediyor, biz garanti veriyoruz. “En iyi takas” bulmak ile “hiçbir alt grup ayrılıp daha iyisini yapamaz” (strict core) demek farklı iddialar. İkincisi daha güçlü ve daha anlaşılır.
Literatür döngüleri üçte kesiyor, biz sınırı kaldırıyoruz — ve bunu yapabilmemizin sebebi akıllı kontratın eşzamanlılığı bedava kılması.
Çoklu seçim bizi MTTC alanına taşıyor — strict-core seçimi ve güçlü grup-strategyproofness ile. Bu, NeoSwap’ın iddia ettiği bir şey değil.

Söylemeyeceğimiz şey: “İlk çok taraflı takas sistemiyiz.” Değiliz ve bunu iddia etmek bizi inandırıcılıktan düşürür.

6. Neden Monad

Üç ayrı argüman ve hiçbiri “çünkü hızlı” değil.

Argüman 1 — Sınırı kaldırmak uzun döngü demek, uzun döngü çok transfer demek.
On bir taraflı, çok mallı bir döngü 40'tan fazla transfer eder. Monad’da bir ERC-20 transferi ~0.0065 MON ≈ $0.00016; yani 40 transfer ≈ $0.006. Ethereum’da bu, takas edilen şeyin değerinden kat kat pahalı olur — küçük değerli takaslar (vardiya, oda, kart) ekonomik olarak imkânsız hale gelir. Literatürün döngüleri kesmesinin ikinci sebebi de budur.

Argüman 2 — Temizleme problemi NP-hard, biz daha geniş arama yapıyoruz.
Doğrulamayı zincirde yapıyoruz ve bu gas tüketir. Monad’ın işlem başına 30M gas limiti (blok başına 150M) bunu taşıyor. Taban ücret 100 MON-gwei.

Argüman 3 — Ayrık döngüler paralel oturuyor.
Monad işlemleri önce sıralayıp sonra paralel yürütüyor. Birbirini kesmeyen takas döngüleri farklı storage sayfalarına dokunur (Monad’da depolama 128 slotluk sayfalar halinde), dolayısıyla paralel yürütücü bunları eşzamanlı işler; kesişen döngüler yeniden çalıştırılır. Ürünün performans profili doğrudan Monad’ın mimarisine oturuyor — bu, “Monad’ın limitlerini keşfetmek” maddesinin karşılığı.

Ek teknik detaylar:

Zincir: Monad Testnet, chain ID 10143, RPC https://testnet-rpc.monad.xyz
Blok süresi 300ms, spekülatif kesinleşme 300ms, tam kesinleşme 600ms
eth_sendRawTransactionSync (EIP-7966) destekleniyor: işlem gönderip makbuzu tek çağrıda almak — polling yok, demo akıcı olur
Global mempool yok; işlemler sıradaki 3 lidere yönlendiriliyor
Gas, kullanılan değil limit üzerinden kesiliyor (value + gas_price * gas_limit) — gas limitini savurgan ayarlamamak gerekiyor
7. Ne inşa ediyoruz
Kontrat
offer(uint256[] gives, uint256[] wantsRanked)   // leksikografik tercih
executeCycle(address[] participants, uint256[] items)
    // döngüyü zincirde doğrular, tüm transferleri yapar,
    // biri geçersizse HEPSİ revert
verifyCore(uint256 cycleId) returns (bool)
    // sonucun strict core'da olduğunu zincirde ispatlar

Döngü arama off-chain (DFS), ama yürütme ve doğrulama zincirde — yani kimse olmayan bir döngüyü yürütemez, kontrat kendisi kontrol eder. Bu ayrım önemli: “fake on-chain” eleştirisine karşı savunmamız bu.

Malları ERC-1155 olarak tutuyoruz: tek kontratta çok çeşit, transfer ucuz, toplu transfer destekli.

Arayüz
QR okut → tarayıcıda burner cüzdan oluşur (localStorage’da anahtar) → devnads Agents API’den gas damlar
“Elimde olanlar” — çoklu işaretleme
“İstediklerim” — sıralayarak işaretleme (leksikografik tercih üretir)
Büyük ekran: kuvvet-yönlü graf, döngüler renkli halkalar olarak yanar
Teknik yığın
Ne	Niye
Next.js + viem ≥2.40	monadTestnet chain’i hazır geliyor
Tarayıcı burner cüzdan + Agents API faucet	Salon 10 saniyede içeride, MetaMask yok
eth_sendRawTransactionSync	Tek çağrıda onay, polling yok
ERC-1155	Tek kontratta çok çeşit, toplu transfer
Vercel	Canlı URL zorunlu — localhost diskalifiye
devnads /v1/verify	Kontrat doğrulama, evmVersion: "osaka" geçerek

devnads Agents API (bizim için kritik, auth yok):

POST https://agents.devnads.com/v1/faucet
  {"chainId":10143,"address":"0x..."}        → 1 MON
POST https://agents.devnads.com/v1/verify
  {chainId, contractAddress, contractName, compilerVersion, standardJsonInput, evmVersion:"osaka"}

Musluk sınırı: adres başına günde 10 MON, IP başına 50. Sabah erken toplamak gerekiyor.

8. Demo planı

90 saniyelik videoyu önceden kaydedeceğiz. İki mod kuruyoruz — ikincisi risk sigortası.

Mod A — Becayiş Haritası (ana gösteri)

Ekranda Türkiye haritası. Şehirlerde noktalar (önceden yüklenmiş öğretmen verisi, uydurma isimler, gerçek şehirler). Her noktadan gitmek istediği şehre ince bir ok.

solve() çağrılıyor → harita üzerinde bir halka yanıyor: Hakkari → Ankara → İzmir → Trabzon → … → Hakkari. On bir şehir, on bir öğretmen, tek işlem.

Yanında iki panel:

Maliyet: “Bu halka 11 transfer. Monad’da $0.0018.”
Garanti: verifyCore() → true
Mod B — Salon (canlı katılım için)

Girişte herkese rastgele 3 sticker. Çoklu seçim arayüzü. Büyük ekranda graf ve sayaç: “47 kişi, 9 döngü, 112 transfer.”

90 saniyelik anlatı metni (kelime kelime)

(0-18s) — harita ekranda
“Hakkari’de bir öğretmen Ankara’ya gelmek istiyor. Ankara’da Hakkari’ye gitmek isteyen kimse yok. Ama Ankara’da İzmir’e gitmek isteyen var, İzmir’de de Hakkari’ye gitmek isteyen var. Bu üçü istediği yere gidebilir — ama gidemiyorlar. Çünkü becayiş, 657'nin 73. maddesine göre iki kişilik.”

(18-32s)
“Sebep basit: üç kişilik halkada kim önce istifa eder? Devlet iki dilekçeyi aynı anda onaylayabiliyor. On bir kişiyi kimse aynı anda çıkaramıyor.”

(32-50s) — halka yanar
“Akıllı kontratın yaptığı tek şey bu. On bir kişi, tek işlem. Ya hepsi yer değiştirir ya hiçbiri. Arada çekilme yok, çünkü ara yok.”

(50-68s) — garanti paneli
“Algoritma Top Trading Cycles. İki kanıtlanmış özelliği var: yalan söyleyerek daha iyi bir yer alamazsınız, ve hiçbir alt grup sistemden ayrılıp daha iyisini yapamaz. Para el değiştirmiyor — mevzuatın yasakladığı pazarlık yapısal olarak imkânsız.”

(68-82s) — maliyet paneli + explorer
“On bir transfer, Monad’da bir kuruşun altı. Literatür bu döngüleri üçte kesiyor çünkü eşzamanlılık fiziksel olarak imkânsız. Zincirde imkânsız değil.”

(82-90s)
“Bir sendika bu sistemi MEB’den resmen istedi. Yok. Biz bugün yaptık. İşte canlı link, işte kontrat.”

9. Dürüst eksikler

Rubrikte “upfront about what’s unfinished” puan getiriyor. Demonun sonunda tek nefeste söylenecekler:

Bu hukuki bir araç değil, prototip. Gerçek becayişte atamaya yetkili amirin onayı gerekiyor; biz onay akışını modellemedik.
Garantiler leksikografik tercih varsayıyor. Genel tercihlerde strict core boş olabilir ve Pareto etkin + bireysel akılcı + strategyproof bir mekanizma yok (imkânsızlık teoremi).
MTTC’nin grup-strategyproofness’ı, kullanıcıların tip önem sıralaması hakkında yalan söylemediği koşuluna bağlı.
Temizleme NP-hard. Bütün döngü uzayını taramıyoruz, sezgisel arıyoruz.
Döngü arama off-chain. Yürütme ve doğrulama zincirde, ama arama değil.
NeoSwap benzer bir alanda çalışmış. Biz farklı bir iddiada bulunuyoruz, “ilk” demiyoruz.
10. Rubrik karşılığı
Ağırlık	Kriter	Bizim durumumuz
24%	Execution — “daha gerçek, daha az mock”	Kontrat + arayüz + canlı deploy; döngü yürütme gerçekten çalışıyor
20%	On-chain gereklilik	En güçlü kalemimiz. Atomik N-taraflı yürütme zincir olmadan mümkün değil — yavaş değil, imkânsız
20%	Topluluk oyu	Mod B salonu katılımcı yapıyor
16%	Problem & vaat	Sendika resmen talep etmiş; vardiya takasında ticari yazılım yok
12%	Özgünlük	Blitz’in 1.380 projelik geçmişinde yok; NeoSwap farklı iddia
8%	Sunum	Türkiye haritasında yanan halka + eksikleri açıkça söylemek
Teslim şartları (atlanırsa diskalifiye)
Kod bugün yazılmış olmalı (sıfırdan create-next-app, mevcut proje yok)
Canlı, erişilebilir URL — localhost diskalifiye
Public GitHub repo
Düzgün README: ne yapıyor, nasıl kurulur, nasıl çalıştırılır
Kontrat etkinlik süresi içinde Monad’a deploy edilmiş olmalı
Teslim: blitz.devnads.com, 16:30'dan önce
90 saniyelik video
11. Doğrulanan iddiaların kaynakları
657/73 ve becayiş şartları: kadimhukuk.com.tr, avukatsametoztorun.com, harbiyehukuk.com
Sendika başvurusu: egitimgucusen.org.tr, mebpersonel.com, webdeogren.com
“Görev yeri para karşılığı pazarlanamaz”: becayis.net
Abraham, Blum & Sandholm (EC ‘07), NP-hardness ve eşzamanlılık gerekçesi: archive.dimacs.rutgers.edu, dl.acm.org/doi/10.1145/1250910.1250954
Yaklaşıklama sınırları: arXiv 1605.08863
TTC, Roth (1982), Ma (1994), kayıtsızlık sınırları: cs.utexas.edu, arXiv 2503.18144
Çok tipli piyasalar, imkânsızlık, bTTC/cTTC, MTTC (Sikdar/Adali/Xia AAAI 2017): rieb.kobe-u.ac.jp/DP2023-14, arXiv 2308.14989, ojs.aaai.org
Hatfield & Milgrom, Matching with Contracts: milgrom.people.stanford.edu
NeoSwap, NFBarter: linkedin.com/pulse (NeoSwap tanıtımı), beincrypto.com
Vardiya takası boşluğu: arXiv 1205.2200, thesis.eur.nl/pub/70265
Monad teknik parametreleri: docs.monad.xyz (developer-essentials, summary, gas-pricing)
Blitz geçmişi (1.380 proje, 92 kazanan): GET https://blitz.devnads.com/api/showcase