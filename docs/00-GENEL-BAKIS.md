# 00 — Genel Bakış (Vizyon)

## Tek cümlelik vizyon
Avucunun içinde nefes alan, canlı bir dünyada; küçük bir köyden başlayıp bir
imparatorluğa büyüdüğün, savaşın–diplomasinin–ekonominin gerçek sonuçlar
doğurduğu, **her açtığında kaldığın yerden devam eden** bir strateji oyunu.

## Neyi hedefliyoruz (ve neyi değil)
- **Hedef:** Gerçekten oynanabilir, derin, uzun soluklu bir oyun. Test/simülasyon
  değil — bitmiş bir ürün gibi hissettiren, saatlerce oynanan bir yapı.
- **Değil:** Basit bir tıkla-bekle mobil klonu. Ekranı emojiyle dolduran,
  "yapay zeka üretimi gibi" duran bir demo değil.

## Üç sütun (dengeli geliştirilecek)
1. **Şehir & Ekonomi** — inşa süreleri, üretim zincirleri, lojistik, nüfus.
2. **Büyük Strateji** — diplomasi, casusluk, krallık yönetimi, çağlar.
3. **Savaş & Fetih** — birim kontrolü, kuşatma, komutanlar, toprak ele geçirme.

Bunların **altında** bir dördüncü katman var: **Canlı Dünya** — tek tek görünen
köylüler, hayvanlar, mevsimler, gündüz-gece, olaylar. Bu katman oyunun "ruhu";
diğer üç sütun bu canlı dünyanın üstünde işler.

## Oyun hissi (deneyim hedefleri)
- **İlk 60 saniye:** Oyuncu kamerayı gezdirir, güzel bir vadi görür, köy
  meydanını kurar; hemen bir "inşa ediliyor" ilerleme çubuğu ve işçilerin
  çalışmaya koştuğu bir sahne. Anında "canlı" hissi.
- **İlk 10 dakika:** Kaynak topla, ev/tarla kur, ilk köylü doğsun, ilk gece
  gelsin, ilk komşu krallıkla temas.
- **İlk oturum sonu:** Küçük bir kasaba, birkaç asker, bir diplomasi ilişkisi,
  belki ilk barbar akını püskürtülmüş. Oyunu kapat — **açınca aynen kaldığın
  yerde**, hatta yokken geçen sürenin bir kısmı işlemiş (çevrimdışı ilerleme).
- **Uzun vade:** İmparatorluk, çağ atlama, harikalar, rakip krallıkları fetih
  ya da ittifakla dünyayı şekillendirme.

## Tasarım ilkeleri (her kararda başvuracağımız pusula)
1. **Görünür sebep-sonuç.** Olaylar rastgele değil koşulludur; oyuncu önlem
   alabilmeli. (Prototipte bu ilke zaten var — koruyacağız.)
2. **Determinizm.** Aynı tohum + aynı komutlar = aynı dünya. Kayıt küçük kalır,
   tekrar-oynatma (replay) ve çok oyunculu mümkün olur.
3. **Mobil-önce, başparmakla oynanır.** Her etkileşim tek elle, yatay ekranda
   rahat erişilebilir olmalı.
4. **Gerçekçi-ama-okunur sanat.** Emoji değil; elle ayarlanmış prosedürel
   dokular, doğru oranlar, akıcı animasyonlar. (Bkz. 02-GRAFIK-SANAT.)
5. **Hiçbir sürüm yarım kalmaz.** Her faz kendi başına oynanabilir bir oyun
   bırakır.
6. **Veri koddan ayrı.** Bina/birim/teknoloji/biyom tanımları veri dosyalarında
   → içerik eklemek kolay, denge testi otomatik.
7. **Performans bir özelliktir.** Binlerce köylü + büyük harita düşük telefonda
   akıcı çalışmalı (LOD, toplu çizim, uzamsal kovalar).

## Referans ilhamlar (ton için)
- **WorldBox / Rimworld** → canlı bireyler, ortaya çıkan hikâyeler.
- **Civilization / Humankind** → çağlar, teknoloji, zafer türleri.
- **Age of Empires** → ekonomi + gerçek zamanlı savaş.
- **Rise of Kingdoms / Travian** → inşa süreleri, komutanlar, çevrimdışı ilerleme.
- **The Settlers / Anno** → üretim zincirleri, lojistik.

## Başarı ölçütü
"Bir arkadaşına gönderdiğinde, 20 dakika oynayıp "bunu nereden indirdin?" diye
sorması." Yani: bitmiş, cilalı, kendine ait kimliği olan bir oyun.
