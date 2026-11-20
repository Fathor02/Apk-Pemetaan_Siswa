# Folder Bukti Pengujian

Letakkan screenshot hasil pengujian API di folder ini dengan nama berikut:

| Nama file | Isi |
| :--- | :--- |
| `01-sukses.png` | Response `200` — 3 siswa valid, klaster Tinggi/Sedang/Rendah tampil |
| `02-gagal-nilai.png` | Response `400 VALIDATION_ERROR` — `nilai_uas = 150` |
| `03-gagal-data.png` | Response `400 INSUFFICIENT_DATA` — hanya 2 siswa |
| `04-gagal-content-type.png` | Response `415 UNSUPPORTED_MEDIA_TYPE` — header `text/plain` |
| `05-dashboard.png` | Hasil klasterisasi tampil di dashboard aplikasi |

Perintah curl untuk menghasilkan masing-masing response ada di
[`../laporan-integrasi-api.md`](../laporan-integrasi-api.md) bagian 5.2.

Video demonstrasi (opsional) juga dapat disimpan di folder ini, misalnya `demo-api.mp4`.
