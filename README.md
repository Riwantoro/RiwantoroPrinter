# Queue Printer (Barcode Scanner)

Web app sederhana untuk mencetak nomor antrian otomatis ketika barcode discan.

## Fitur
- Scan barcode (scanner USB/HID) -> auto print
- Nomor antrian berurutan format `001`
- Cetak berisi nomor antrian + tanggal + jam
- Reset otomatis setiap ganti tanggal lokal

## Jalankan
1. Install dependencies: `npm install`
2. Jalankan dev server: `npm run dev`

## Catatan Printing di Windows
Browser tidak bisa silent print secara default. Untuk auto print tanpa dialog, jalankan Chrome/Edge dengan opsi kiosk printing:

```bash
chrome.exe --kiosk-printing --app=http://localhost:5173
```

Jika tidak memakai kiosk, `window.print()` tetap berjalan namun dialog print akan muncul.
# RiwantoroPrinter
