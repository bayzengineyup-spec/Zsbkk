# 09 — Arayüz & UX

> Senin isteğin: "arayüz" iyileştirilmeli. Mobil-önce, başparmakla oynanır,
> temiz ve okunur.

## İlkeler
- **Mobil-önce, yatay ekran.** Her sık eylem başparmak menzilinde (alt/yan raylar).
- **Az ama net.** Ekranı bilgiyle boğma; ayrıntı istenince açılır panelde.
- **Bağlamsal.** Bir şeye dokununca ilgili eylemler çıkar (bina → yükselt/işçi;
  ordu → hareket/saldır).
- **Geri bildirim.** Her dokunuşta görsel+ses+titreşim yanıtı (prototipte haptic var).
- **Tutarlı dil.** Tek ikon seti, tek renk kodu, tek tipografi.

## Ekran düzeni (prototip temeli üstüne)
- **Üst şerit:** kaynaklar (yiyecek/odun/taş/altın/bilgi), nüfus, ordu, mutluluk,
  mevsim/yıl (prototipte var) — sadeleştirilip okunur hale getirilecek.
- **Alt/yan ray:** Keşif, İnşa, Diplomasi, Teknoloji, Ordu, Menü (prototipte var;
  tekrarlı butonlar temizlenecek — bilinen hata).
- **Sağ üst:** minimap + efsane/biyom (prototipte var).
- **Sol:** seçili karo/bina/köylü/ordu bilgi kartı.
- **Ortada:** oyun dünyası (canvas), dokunmatik kamera.

## Kamera & kontrol (dokunmatik)
Prototipte atalet kaydırmalı dokunmatik var. Standart şema:
- **Tek parmak sürükle:** kamerayı kaydır (bırakınca kayarak durur).
- **İki parmak:** yakınlaştır/uzaklaştır (+ döndürme opsiyonel).
- **Dokun:** seç (karo/bina/köylü/ordu).
- **Uzun bas:** bağlam menüsü / hızlı eylem.
- **Çift dokun:** o noktaya odaklan/zoom.

## Paneller
- **İnşa paneli:** kategoriye göre binalar, maliyet, süre önizleme, kilit durumu.
- **Yerleştirme çubuğu:** hayalet önizleme + Kur/İptal (prototipte var).
- **Bina paneli:** seviye, işçi +/−, yükselt (süre), üretim, iptal/yık.
- **Teknoloji paneli:** dal ağacı, maliyet, önkoşul (prototipte var).
- **Diplomasi paneli:** krallık listesi + eylemler (prototipte var).
- **Ordu/Askeri paneli:** eğitim kuyruğu, ordu kur, komutan ata.
- **Nüfus paneli:** meslek dağılımı, mutluluk kırılımı.
- **Menü:** kaydet/yükle/ayar/çık (prototipte var).

## Bildirimler & günlük
- **Toast** (prototipte var): kısa anlık bildirim (renk kodlu iyi/kötü).
- **Olay günlüğü (yeni):** kaydırılabilir tarihçe → "sen yokken/az önce neler oldu".
  Önemli olaylara tıklayınca haritada ilgili yere git.
- **Uyarı rozetleri:** depo dolu, açlık yakın, saldırı geliyor → ilgili ikonda.

## Öğretici (onboarding)
Prototipte adım adım hedef sistemi var. Genişletme:
- İlk oyun: yumuşak, elle tutulan ilk 10 dakika (köy kur → topla → ev → asker →
  ilk savaş) — her adımda ipucu + hedef.
- İpuçları bağlamsal (ne zaman gerekliyse çıkar), atlanabilir.
- "Neden" açıklamaları: bir mekanik ilk kez açılınca kısa bilgi kartı.

## Erişilebilirlik
- Renk körü dostu palet/ikon (renge ek şekil/etiket).
- Ölçeklenebilir yazı boyutu, yüksek kontrast seçeneği.
- Titreşim/ses kapatma (prototipte ayar var).
- Tek elle oynanabilirlik.

## Yerelleştirme (i18n)
- **Türkçe (ana) + İngilizce.** Tüm metinler `ui/i18n/*.json` içinde, kodda
  gömülü metin yok.
- Sayı/tarih biçimleri yerele göre.
- İleride daha çok dil eklenebilir yapı.

## Ayarlar
- Ses (müzik/efekt — prototipte var), grafik kalitesi/LOD, oyun hızı, dil,
  titreşim, otomatik kayıt sıklığı, performans göstergesi (prototipte var).

## Kabul ölçütü
- Yeni oyuncu kılavuzsuz ilk köyü kurabiliyor.
- Sık eylemler ≤2 dokunuş.
- Küçük telefonda hiçbir düğme "parmak kaçırtmıyor".
