# Makine Mühendisliği | Ahi Evran üniversitesi

Türkçe, mobil uyumlu bir bölüm rehberi: akademik personel ve yayımlanmış ders programı arşivi.

## Geliştirme

```powershell
npm install
npm run dev
```

Arama davranışlarını test et ve üretim sürümünü doğrula:

```powershell
npm test
npm run build
```

## Öğrenci topluluğu kurulumu (Supabase)

Topluluk alanı e-posta/şifre hesabı, e-posta doğrulaması, profil/fotoğraf,
paylaşım akışı, beğeni, topluluk üyeliği ve grup mesajları için Supabase
kullanır. Kayıt herkese açıktır; bu e-posta hesabı Ahi Evran öğrenciliğini
doğrulamaz. Gerçek veriler yalnızca giriş yapmış kullanıcılarca okunabilir.

1. Supabase'te bir proje oluştur.
2. Supabase SQL Editor'de `supabase/migrations/20261029200000_community.sql`
   dosyasının tamamını çalıştır. Bu migration tabloları, erişim kurallarını,
   özel profil fotoğrafı bucket'ını ve gerçek zamanlı yayın tablolarını kurar.
3. Supabase Project Settings → API bölümünden Project URL ve **publishable**
   (veya eski projelerde `anon`) istemci anahtarını al. `service_role` anahtarını
   asla istemciye, GitHub Pages'a veya bu depoya koyma.
4. `.env.example` dosyasını `.env.local` adıyla kopyalayıp URL ve istemci
   anahtarını doldur. `.env.local` git tarafından yok sayılır.
5. Authentication → URL Configuration altında yerel adresi (`http://localhost:5173`)
   ve yayımdaki adresi (`https://emirksdg.github.io/ahi-evran-makine/`) Site URL /
   Redirect URLs listesine ekle.
6. Authentication → Providers → Email'de e-posta doğrulamasını açık tut. Supabase'in
   varsayılan e-posta servisi deneme amaçlı ve limitlidir; gerçek kullanıcılar için
   kendi SMTP sağlayıcını yapılandır.
7. `npm run dev` ile test et. GitHub deposunda Settings → Secrets and variables →
   Actions → Variables altında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`
   değişkenlerini ekle; bunlar tarayıcıda kullanılan herkese açık proje
   bilgileridir. Pages kaynağının GitHub Actions olduğundan emin ol. `master`
   dalına gönderilen her değişiklik test edilir, bu değerlerle derlenir ve Pages'e
   dağıtılır. Yerelde `.env.local` kullanılır.

Supabase istemci anahtarı tarayıcıda görünür olacak şekilde tasarlanmıştır; güvenlik
Row Level Security kurallarına dayanır. Burada parola veya service-role anahtarı
tutulmaz. Profiller yalnızca giriş yapan kullanıcılara açıktır; avatar bucket'ı
özel tutulur ve oturum açmış kullanıcılar için süreli görüntü bağlantıları üretilir.
Topluluk mesajları, gönderiler ve profil alanları kişisel veri içerir: yayına
çıkmadan önce gizlilik metni, moderasyon/şikâyet süreci ve veri saklama/silme
politikasını belirleyin.

## İçerik kaynakları

- Akademik kadro: [Makine Mühendisliği bölüm sayfası](https://mf.ahievran.edu.tr/akademik/makina-muhendisligi/makine-muhendisligi-bolumu). Sayfa 4 Mayıs 2021 tarihli bir yayın tarihi gösterdiğinden, listedeki kadro güncel olmayabilir; sitede bu uyarı görünür biçimde belirtilir.
- Ders adları: üniversitenin yayımladığı [haftalık ders programı PDF’si](https://mf.ahievran.edu.tr/uploads/7290/Makine_Muhendisligi_Guz_Donemi_Haftalik_Ders_Programi.pdf). PDF’nin iç başlığı 2025–2026 bahar dönemini, bağlantılı duyurunun başlığı ise 2026–2027 güz dönemini belirtiyor. Bu nedenle dersler güncel program olarak değil, tarihsel arşiv olarak sunulur.
- Güncel ders bilgileri için [resmî Bologna kataloğunu](https://obs.ahievran.edu.tr/oibs/bologna/index.aspx?lang=tr&curOp=showPac&curUnit=25&curSunit=7494) kontrol edin.

Bu bağımsız öğrenci rehberi resmî üniversite sitesi değildir. Personel ve ders bilgileri değiştirilmeden önce kaynak sayfalarından yeniden doğrulanmalıdır.
