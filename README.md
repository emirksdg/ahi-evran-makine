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
İçerikler şikâyet edilebilir; şikâyetler otomatik gizlenmez ve moderatör
tarafından incelenir.

1. Supabase'te bir proje oluştur.
2. Supabase SQL Editor'de `supabase/migrations/20261029200000_community.sql`
   dosyasının tamamını çalıştır. Bu migration tabloları, erişim kurallarını,
   özel profil fotoğrafı bucket'ını ve gerçek zamanlı yayın tablolarını kurar.
3. Sonra diğer migration dosyalarını zaman damgası sırasıyla çalıştır:
   `20261116160000_student_network.sql`,
   `20261116223000_profile_bio_university.sql` ve
   `20261117150000_moderation.sql`,
   `20261117151500_site_feedback.sql`.
4. Moderasyon migration'ları tamamlandıktan ve moderatör hesabı kayıt olduktan
   sonra, SQL Editor'de aşağıdaki sorguyu çalıştır. `MODERATOR_EMAIL_HERE`
   yerine moderatör olacak kayıtlı hesabın e-posta adresini yaz. Bu sorgu
   kullanıcıyı yetkilendirir; e-posta adresini uygulama koduna veya Git deposuna
   ekleme.

   ```sql
   insert into public.moderators (user_id)
   select id
   from auth.users
   where lower(email) = lower('MODERATOR_EMAIL_HERE')
   on conflict (user_id) do nothing;
   ```

5. Supabase Project Settings → API bölümünden Project URL ve **publishable**
   (veya eski projelerde `anon`) istemci anahtarını al. `service_role` anahtarını
   asla istemciye, GitHub Pages'a veya bu depoya koyma.
6. `.env.example` dosyasını `.env.local` adıyla kopyalayıp URL ve istemci
   anahtarını doldur. `.env.local` git tarafından yok sayılır.
7. Authentication → URL Configuration altında yerel adresi (`http://localhost:5173`)
   ve yayımdaki adresi (`https://emirksdg.github.io/ahi-evran-makine/`) Site URL /
   Redirect URLs listesine ekle.
8. Authentication → Providers → Email'de e-posta doğrulamasını açık tut. Supabase'in
   varsayılan e-posta servisi deneme amaçlı ve limitlidir; gerçek kullanıcılar için
   kendi SMTP sağlayıcını yapılandır.
9. `npm run dev` ile test et. GitHub deposunda Settings → Secrets and variables →
   Actions → Variables altında `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY`
   değişkenlerini ekle; bunlar tarayıcıda kullanılan herkese açık proje
   bilgileridir. Pages kaynağının GitHub Actions olduğundan emin ol. `master`
   dalına gönderilen her değişiklik test edilir, bu değerlerle derlenir ve Pages'e
   dağıtılır. Yerelde `.env.local` kullanılır.

Supabase istemci anahtarı tarayıcıda görünür olacak şekilde tasarlanmıştır; güvenlik
Row Level Security kurallarına dayanır. Burada parola veya service-role anahtarı
tutulmaz. Profiller yalnızca giriş yapan kullanıcılara açıktır; avatar bucket'ı
özel tutulur ve oturum açmış kullanıcılar için süreli görüntü bağlantıları üretilir.
Şikâyetler hesap başına günde 20 ile sınırlıdır; aynı kullanıcı aynı içeriği
yalnızca bir kez bildirebilir. Moderatör kuyruğundan içerik gizlenebilir,
yeniden görünür yapılabilir veya şikâyet reddedilebilir. Topluluk mesajları,
gönderiler ve profil alanları kişisel veri içerebileceğinden gizlilik metni ve
veri saklama/silme politikasını ayrıca belirleyin. Geri bildirimleri yalnızca
giriş yapan kullanıcılar gönderebilir; günde 5 gönderiyle sınırlıdır ve
moderatör panelinden okunup incelendi olarak işaretlenebilir. Geri bildirim için
e-posta bildirimi gönderilmez. İlgili migration'lar veritabanında etkinleşmeden
güncellenmiş arayüzü yayımlamayın.

## İçerik kaynakları

- Akademik kadro: [Makine Mühendisliği bölüm sayfası](https://mf.ahievran.edu.tr/akademik/makina-muhendisligi/makine-muhendisligi-bolumu). Sayfa 4 Mayıs 2021 tarihli bir yayın tarihi gösterdiğinden, listedeki kadro güncel olmayabilir; sitede bu uyarı görünür biçimde belirtilir.
- Ders adları: üniversitenin yayımladığı [haftalık ders programı PDF’si](https://mf.ahievran.edu.tr/uploads/7290/Makine_Muhendisligi_Guz_Donemi_Haftalik_Ders_Programi.pdf). PDF’nin iç başlığı 2025–2026 bahar dönemini, bağlantılı duyurunun başlığı ise 2026–2027 güz dönemini belirtiyor. Bu nedenle dersler güncel program olarak değil, tarihsel arşiv olarak sunulur.
- Güncel ders bilgileri için [resmî Bologna kataloğunu](https://obs.ahievran.edu.tr/oibs/bologna/index.aspx?lang=tr&curOp=showPac&curUnit=25&curSunit=7494) kontrol edin.

Bu bağımsız öğrenci rehberi resmî üniversite sitesi değildir. Personel ve ders bilgileri değiştirilmeden önce kaynak sayfalarından yeniden doğrulanmalıdır.
