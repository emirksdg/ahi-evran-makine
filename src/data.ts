import type { Course, StaffMember } from "./types";

export const departmentSource =
  "https://mf.ahievran.edu.tr/akademik/makina-muhendisligi/makine-muhendisligi-bolumu";
export const courseScheduleSource =
  "https://mf.ahievran.edu.tr/uploads/7290/Makine_Muhendisligi_Guz_Donemi_Haftalik_Ders_Programi.pdf";
export const courseAnnouncementSource =
  "https://mf.ahievran.edu.tr/arsiv-ogrenci-duyurulari/7290-mmf-2026-2027-guz-donemi-ders-programlari";
export const bolognaSource =
  "https://obs.ahievran.edu.tr/oibs/bologna/index.aspx?lang=tr&curOp=showPac&curUnit=25&curSunit=7494";

export const staff: StaffMember[] = [
  {
    name: "Levent URTEKİN",
    title: "Prof. Dr.",
    department: "Konstrüksiyon ve İmalat",
    initials: "LÜ",
  },
  {
    name: "Süleyman KILIÇ",
    title: "Prof. Dr.",
    department: "Konstrüksiyon ve İmalat",
    initials: "SK",
  },
  {
    name: "Necdet ALTUNTOP",
    title: "Prof. Dr.",
    department: "Termodinamik ve Isı Tekniği",
    initials: "NA",
  },
  {
    name: "Merdin DANIŞMAZ",
    title: "Doç. Dr.",
    department: "Termodinamik ve Isı Tekniği",
    initials: "MD",
  },
  {
    name: "Cüneyd DEMİR",
    title: "Dr. Öğr. Üyesi",
    department: "Makine Teorisi ve Sistem Dinamiği",
    initials: "CD",
  },
  {
    name: "Zeynep EKİCİOĞLU KÜZECİ",
    title: "Dr. Öğr. Üyesi",
    department: "Makine Teorisi ve Sistem Dinamiği",
    initials: "ZK",
  },
  {
    name: "Büşra DURMAZ",
    title: "Dr. Öğr. Üyesi",
    department: "Enerji",
    initials: "BD",
  },
  {
    name: "Müjdat ÖZTÜRK",
    title: "Dr. Öğr. Üyesi",
    department: "Enerji",
    initials: "MÖ",
  },
  {
    name: "Nihan ÇAĞLAYAN",
    title: "Dr. Öğr. Üyesi",
    department: "Otomotiv",
    initials: "NÇ",
  },
  {
    name: "Sercan BASİT",
    title: "Dr. Öğr. Üyesi",
    department: "Mekanik",
    initials: "SB",
  },
  {
    name: "Orhan KAYA",
    title: "Dr. Öğr. Üyesi",
    department: "Mekanik",
    initials: "OK",
  },
  {
    name: "Faik YILAN",
    title: "Arş. Gör.",
    department: "Mekanik",
    initials: "FY",
  },
  {
    name: "İbrahim Baki ŞAHİN",
    title: "Arş. Gör.",
    department: "Enerji",
    initials: "İŞ",
  },
];

export const courses: Course[] = [
  { name: "Akışkanlar Mekaniği" },
  { name: "Araştırma Projesi-I" },
  { name: "Atatürk İlkeleri ve İnkılap Tarihi I" },
  { name: "Bilgisayar Destekli Makine Resmi" },
  { name: "Bilgisayar Destekli Üretim" },
  { name: "Bilgisayar Programlama I" },
  { name: "Bilgisayar Programlama II" },
  { name: "Dinamik" },
  { name: "Diferansiyel Denklemler" },
  { name: "Elektrik Mühendisliğinin Temelleri" },
  { name: "Fizik-I" },
  { name: "Girişimcilik ve Kariyer Planlama" },
  { name: "Güneş Enerjisi Uygulamaları" },
  { name: "Isı Transferi" },
  { name: "İmal Usulleri-II" },
  { name: "İş Sağlığı ve Güvenliği-I" },
  { name: "İş Sağlığı ve Güvenliği-II" },
  { name: "İşletme Yönetimi" },
  { name: "Kimya" },
  { name: "Makine Elemanları-I" },
  { name: "Makine Mühendisliğinde Yapay Zekâ" },
  { name: "Makine Mühendisliği Laboratuvarı-I" },
  { name: "Makine Mühendisliğine Giriş" },
  { name: "Malzeme Bilimi" },
  { name: "Matematik-I" },
  { name: "Mekanizma Tekniği" },
  { name: "Mühendislik Etiği" },
  { name: "Mühendislik Matematiği" },
  { name: "Motorlar" },
  { name: "Mukavemet" },
  { name: "Otomatik Kontrol" },
  { name: "Proje Hazırlama" },
  { name: "Tesis Organizasyonu" },
  { name: "Termodinamik-I" },
  { name: "Temel Bilgi Teknolojileri Kullanımı" },
  { name: "Teknoloji Tarihi" },
  { name: "Toz Metal Teknolojileri" },
  { name: "Türk Dili II" },
  { name: "Yabancı Dil I: İngilizce" },
  { name: "Kaynak Yöntemleri" },
];
