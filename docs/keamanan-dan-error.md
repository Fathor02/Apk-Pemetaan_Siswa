# Laporan Keamanan & Penanganan Error — Integrasi API EduCluster AI

## 1. Model keamanan

API klasterisasi bersifat **publik tetapi stateless**. Klien dapat memanggilnya tanpa login karena:

- API hanya melakukan komputasi dan mengembalikan hasil;
- **tidak ada penulisan** ke Supabase, cache, maupun berkas;
- tidak ada data pribadi yang disimpan atau dikembalikan lintas sesi.

Operasi yang **ber efek samping** (upsert data, cache hasil, reset database, edit/hapus siswa) tetap berada di Server Action dan dilindungi oleh sesi admin HMAC-SHA256 (`src/lib/auth.ts`). Jadi membuka endpoint API tidak melemahkan mode Admin/Pengguna yang sudah ada.

## 2. Tindakan keamanan yang diterapkan

| No | Tindakan | Implementasi | Tujuan |
| :--- | :--- | :--- | :--- |
| 1 | Validasi `Content-Type` | Hanya `application/json` yang diterima (415) | Mencegah parsing tipe tak terduga |
| 2 | Pembatasan ukuran body | Maks 2 MB, cek `content-length` **dan** panjang teks aktual | Mencegah payload besar / DoS |
| 3 | Pembatasan jumlah baris | Maks 5000 `records` (413) | Mencegah loop komputasi berlebih |
| 4 | Validasi struktur | `records` harus array, setiap baris harus objek | Mencegah `TypeError` tak tertangani |
| 5 | Validasi nilai | Rentang 0–100 via `validateAndMapRow()` | Menjaga integritas data akademik |
| 6 | Hitung ulang Nilai Akhir di server | `nilai_akhir` dari klien diabaikan | Mencegah manipulasi bobot 0.3/0.3/0.4 |
| 7 | Validasi enum & tipe | `mode` hanya `3D`/`1D`, `periode` string non-kosong | Menghindari input tak terduga ke engine |
| 8 | Info error minimal | `500` hanya mengirim pesan umum; stack trace hanya di `console.error` server | Mencegah kebocoran struktur internal |
| 9 | Header respons | `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` | Mencegah penyimpanan hasil & MIME sniffing |
| 10 | Kerahasiaan token | `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` hanya di `.env.local` (server) | Tidak terekspos via API maupun git |
| 11 | CORS | Tidak ada header `Access-Control-Allow-Origin: *` | Hanya konsumsi same-origin secara default |
| 12 | Isolasi server-only | `clusterEngine.ts` memakai `import 'server-only'` | Algoritma tidak bisa dikirim ke browser |

## 3. Tabel penanganan error

| Kode HTTP | `error.code` | Penyebab | Penanganan |
| :--- | :--- | :--- | :--- |
| 400 | `INVALID_JSON` | Body bukan JSON / kosong | Response pesan "Body bukan JSON yang valid" |
| 400 | `INVALID_PAYLOAD` | Body bukan objek / `records` bukan array | Response `details.field = "records"` |
| 400 | `VALIDATION_ERROR` | Field wajib kosong, nilai < 0 atau > 100, `mode`/`periode` invalid | Response `details[]` berisi `row`, `field`, `received`, `message` (maks 20 baris) |
| 400 | `INSUFFICIENT_DATA` | Siswa unik < 3 | Pesan eksplisit minimal 3 siswa |
| 405 | *(Next.js)* | Method `PUT`/`DELETE` dll. | Ditolak otomatis oleh Route Handler |
| 413 | `PAYLOAD_TOO_LARGE` | Body > 2 MB / > 5000 baris | Ditolak sebelum parsing engine |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` bukan JSON | Pesan header yang benar |
| 500 | `INTERNAL_ERROR` | Exception tak terduga | Pesan umum; detail dicatat di server |

Semua error menggunakan bentuk konsisten:

```json
{
  "success": false,
  "error": { "code": "...", "message": "...", "details": [] }
}
```

## 4. Manajemen secret

- File `.env.local` **tidak termasuk** dalam repository (dilindungi `.gitignore`).
- Yang ikut ter-commit hanya `.env.local.example` berisi placeholder.
- Audit pra-push sudah dilakukan: tidak ada `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`, maupun URL Supabase asli di file ter-track.
- Di Vercel, kelima variabel lingkungan didaftarkan manual sebagai Environment Variables (3 di antaranya ditandai *sensitive*).
- Endpoint API ini **tidak memerlukan secret apa pun**, sehingga tidak ada kredensial yang muncul di contoh request, screenshot, maupun video demo.

## 5. Batasan & rekomendasi pengembangan

| Batasan | Rekomendasi |
| :--- | :--- |
| Belum ada rate limiting per IP | Tambahkan Vercel WAF / rate limiting di edge untuk produksi skala besar |
| Validasi hanya pada bentuk & rentang nilai | Tambahkan pemeriksaan konsistensi antar mapel jika diperlukan |
| Respons tidak dibatasi jumlah `students` selain batas 5000 baris | Pertimbangkan paginasi bila dataset besar |
| Free tier Supabase dapat dijeda saat tidak aktif | Pastikan project aktif sebelum demo/sidang |

## 6. Checklist pra-deploy

- [x] `.env.local` tidak ter-track git
- [x] Tidak ada secret di dokumen/contoh JSON
- [x] Semua response error tidak membocorkan stack trace
- [x] Header `no-store` & `nosniff` diterapkan
- [x] `npx tsc --noEmit` lulus
- [x] `npm run build` lulus
- [x] `npm run verify:kmeans` lulus
- [x] EMPAT skenario uji (termasuk tiga kondisi gagal) terdokumentasi
