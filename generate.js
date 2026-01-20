const fs = require('fs');
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// 🔌 KONEKSI DATABASE (JANGAN LUPA ISI!)
// ==========================================
const SUPABASE_URL = "https://yavbkjznbahbopdnpkhl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhdmJranpuYmFoYm9wZG5wa2hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzMjYwNCwiZXhwIjoyMDg0NDA4NjA0fQ.M_RgfDVlgU8FNS9rcrOMYiVOFcvKp0-etyXPF5T8EYQ"; 
const VERCEL_APP_URL = "https://verify-app-chi.vercel.app";


// ==========================================
// 📖 KATALOG PRODUK (DAFTARKAN BARANGMU DISINI)
// ==========================================
const KATALOG_PRODUK = {
    
    // PRODUK 1: OLI
    "OLI": {
        nama: "Ahmto 2T Racing Oil",
        deskripsi: "Oli samping wangi permen karet. Low Smoke. Tarikan enteng.",
        spek: "Vol: 800ml | JASO: FD | ISO: L-EGD",
        kode_seri: "L2",       // Kode unik Oli
        folder: "./OUTPUT_OLI" // Masuk ke folder ini
    },

    // PRODUK 2: KAMPAS REM
    "REM": {
        nama: "Ahmto Brake Pads (Kampas Rem)",
        deskripsi: "Kampas rem pakem, anti-asbes, tahan panas tinggi.",
        spek: "Material: Ceramic Organic | Type: Disc Brake",
        kode_seri: "BP",       // Kode unik Rem
        folder: "./OUTPUT_REM"
    },

    // PRODUK 3: BUSI (Contoh nambah sendiri)
    "BUSI": {
        nama: "Ahmto Iridium Spark",
        deskripsi: "Busi api biru, pembakaran sempurna, irit bensin.",
        spek: "Type: Iridium | Heat Range: 8",
        kode_seri: "SP",
        folder: "./OUTPUT_BUSI"
    }
};

// ==========================================
// 🎛️ PILIH MAU CETAK YANG MANA?
// ==========================================

// Ganti tulisan ini dengan: "OLI", "REM", atau "BUSI" sesuai keinginan
const PILIHAN_SAYA = "OLI"; 

const JUMLAH_BIKIN = 1; // Mau bikin berapa biji?

// ==========================================
// ⚙️ MESIN PENGGERAK (JANGAN UBAH BAWAH INI)
// ==========================================

const target = KATALOG_PRODUK[PILIHAN_SAYA];

if (!target) {
    console.log(`❌ ERROR: Produk "${PILIHAN_SAYA}" tidak ada di katalog!`);
    console.log("👉 Pilihan yang ada: " + Object.keys(KATALOG_PRODUK).join(", "));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!fs.existsSync(target.folder)) fs.mkdirSync(target.folder);

function generateRandomString(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

console.log(`🏭 MEMULAI PRODUKSI: ${target.nama}`);
console.log(`📝 Deskripsi: ${target.deskripsi}`);
console.log(`📦 Seri Kode: ${target.kode_seri}-XXXX | Target: ${JUMLAH_BIKIN} pcs`);
console.log("-".repeat(50));

async function startFactory() {
    let berhasil = 0;
    const generatedCodes = new Set();

    while (berhasil < JUMLAH_BIKIN) {
        const acak = generateRandomString(5);
        const kodeUnik = `${target.kode_seri}-${acak}`; // Contoh: L2-X9K2M
        
        if (generatedCodes.has(kodeUnik)) continue; 
        generatedCodes.add(kodeUnik);

        const serialNum = `SN-${target.kode_seri}-26${generateRandomString(4)}`;
        const linkLengkap = `${VERCEL_APP_URL}/?code=${kodeUnik}`;

        const dataProduk = {
            code: kodeUnik,
            name: target.nama,
            description: target.deskripsi,
            specifications: target.spek,
            serial_number: serialNum,
            scan_count: 0
        };

        try {
            const { error } = await supabase
                .from('products')
                .upsert(dataProduk, { onConflict: 'code' });

            if (error) throw error;

            await QRCode.toFile(`${target.folder}/${kodeUnik}.png`, linkLengkap, {
                width: 300, margin: 2,
                color: { dark: '#000000', light: '#FFFFFF' }
            });

            berhasil++;
            console.log(`✅ [${berhasil}] ${kodeUnik}`);

        } catch (err) {
            console.log(`❌ Error: ${err.message}`);
        }
    }
    console.log("-".repeat(50));
    console.log(`🎉 SELESAI! Cek folder '${target.folder}'`);
}

startFactory();