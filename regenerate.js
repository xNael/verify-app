const fs = require('fs');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// 🚑 KONFIGURASI PEMULIHAN (REGENERATE)
// ==========================================

// ISI INI DENGAN KUNCI SUPABASE KAMU (Sama kayak di generate.js)
const SUPABASE_URL = "https://yavbkjznbahbopdnpkhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhdmJranpuYmFoYm9wZG5wa2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzMjYwNCwiZXhwIjoyMDg0NDA4NjA0fQ.M_RgfDVlgU8FNS9rcrOMYiVOFcvKp0-etyXPF5T8EYQ"; 
const VERCEL_APP_URL = "https://verify-app-chi.vercel.app";

// Folder tempat hasil restore
const FOLDER_RESTORE = "./RESTORED_QR_CODES";

// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!fs.existsSync(FOLDER_RESTORE)) {
    fs.mkdirSync(FOLDER_RESTORE);
}

console.log(`🚑 MEMULAI PROSES PEMULIHAN (REGENERATE)...`);
console.log(`⏳ Sedang mengambil data dari Supabase...`);

async function restoreFactory() {
    try {
        // Ambil SEMUA data produk dari database
        const { data: produkList, error } = await supabase
            .from('products')
            .select('*'); 

        if (error) throw error;

        if (!produkList || produkList.length === 0) {
            console.log("⚠️ Database kosong! Tidak ada yang bisa dipulihkan.");
            return;
        }

        console.log(`✅ Ditemukan ${produkList.length} data produk. Mulai mencetak ulang...`);
        console.log("-".repeat(50));

        let berhasil = 0;

        for (const item of produkList) {
            const kodeUnik = item.code;
            // Gunakan link vercel app untuk isi QR
            const linkLengkap = `${VERCEL_APP_URL}/?code=${kodeUnik}`;
            const namaFile = `${FOLDER_RESTORE}/${kodeUnik}.png`;

            // Bikin Gambar QR lagi
            await QRCode.toFile(namaFile, linkLengkap, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            berhasil++;
            // Print setiap 10 item biar terminal gak penuh kalau datanya ribuan
            if (berhasil % 10 === 0 || berhasil === produkList.length) {
                console.log(`♻️  Restored progress: ${berhasil}/${produkList.length}`);
            }
        }

        console.log("-".repeat(50));
        console.log(`🎉 SUKSES! ${berhasil} gambar telah kembali.`);
        console.log(`📁 Cek folder '${FOLDER_RESTORE}' di laptopmu.`);

    } catch (err) {
        console.log(`❌ ERROR FATAL: ${err.message}`);
    }
}

restoreFactory();