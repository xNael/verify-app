'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';

// --- DEFINISI TIPE DATA (Biar TS Gak Marah) ---
interface Product {
  id?: number;
  code: string;
  name: string;
  description: string;
  specifications?: string;
  serial_number: string;
  scan_count: number;
}

type ScanStatus = 'IDLE' | 'LOADING' | 'FIRST_SCAN' | 'WARNING' | 'FAKE' | 'INVALID' | 'ERROR';

// --- KONFIGURASI SUPABASE ---
// Pastikan variabel env ini ada di .env.local kamu
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- KOMPONEN UTAMA ---
function VerifyContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<ScanStatus>('IDLE');
  const [product, setProduct] = useState<Product | null>(null);
  const [scanTime, setScanTime] = useState<string>('');

  useEffect(() => {
    const rawCode = searchParams.get('code');
    if (rawCode) {
      verifyProduct(rawCode);
    }
  }, [searchParams]);

  const verifyProduct = async (rawCode: string) => {
    setStatus('LOADING');

    // 1. BERSIHKAN KODE
    let code = rawCode;
    if (code.includes('code=')) {
      code = code.split('code=')[1];
    }

    try {
      // 2. CEK DATABASE
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        setStatus('INVALID');
        return;
      }

      // Casting data ke tipe Product
      const productData = data as Product;

      // 3. LOGIKA LIMIT 3 (PERAWAN VS JANDA VS HANGUS) 🕵️‍♂️
      const newCount = (productData.scan_count || 0) + 1;
      const BATAS_AMAN = 3; // <--- LIMIT DISET JADI 3 DISINI

      // Update Database
      await supabase
        .from('products')
        .update({ scan_count: newCount })
        .eq('code', code);

      // Update State Lokal
      setProduct({ ...productData, scan_count: newCount });
      setScanTime(new Date().toLocaleString('id-ID'));

      // 4. VOPNIS HAKIM ⚖️
      if (newCount === 1) {
        setStatus('FIRST_SCAN'); // HIJAU EMAS (Perawan)
      } else if (newCount <= BATAS_AMAN) {
        setStatus('WARNING');    // KUNING (Bekas tapi Aman)
      } else {
        setStatus('FAKE');       // MERAH (Hangus/Palsu)
      }

    } catch (err) {
      console.error(err);
      setStatus('ERROR');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md text-center border-t-8 border-gray-300 relative overflow-hidden">
        
        {/* LOGO */}
        <h1 className="text-xl font-bold text-gray-400 mb-6 tracking-widest">AHMTO VERIFY</h1>

        {/* LOADING */}
        {status === 'LOADING' && (
          <div className="animate-pulse">
            <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Memeriksa keaslian...</p>
          </div>
        )}

        {/* IDLE */}
        {status === 'IDLE' && (
          <p className="text-gray-600">Silakan scan QR Code pada kemasan produk.</p>
        )}

        {/* INVALID */}
        {status === 'INVALID' && (
          <div className="border-t-8 border-red-500 -mt-6 pt-6">
            <div className="text-6xl mb-2">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">TIDAK TERDAFTAR</h2>
            <p className="text-gray-600">Kode QR ini tidak dikenali. Kemungkinan besar produk ini <b>PALSU</b>.</p>
          </div>
        )}

        {/* ERROR */}
        {status === 'ERROR' && (
          <div>
            <div className="text-6xl mb-2">⚠️</div>
            <p className="text-red-500">Gagal terhubung ke server.</p>
          </div>
        )}

        {/* HASIL SUKSES */}
        {product && (
          <div className="mt-2">
            
            {/* FIRST SCAN (1x) */}
            {status === 'FIRST_SCAN' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="text-5xl mb-2">🌟</div>
                <h2 className="text-2xl font-extrabold text-green-600">AUTHENTIC</h2>
                <div className="mt-2 px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full inline-block">
                  VERIFIKASI PERTAMA
                </div>
                <p className="text-sm text-green-700 mt-3 font-medium">
                  Selamat! Anda orang pertama yang membuka segel kode ini. Produk 100% BARU & ASLI.
                </p>
              </div>
            )}

            {/* WARNING (2x - 3x) */}
            {status === 'WARNING' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="text-5xl mb-2">⚠️</div>
                <h2 className="text-2xl font-bold text-yellow-600">AUTHENTIC</h2>
                <div className="mt-2 px-3 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full inline-block">
                  SUDAH PERNAH DISCAN
                </div>
                <div className="text-sm text-left text-gray-700 mt-4 bg-white p-3 rounded border border-yellow-100">
                  <p><b>Info:</b> Kode ini sudah dipindai <b>{product.scan_count} kali</b>.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    <li>Jika Anda baru beli dan segel gosok <b>sudah terbuka</b>, harap waspada.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* FAKE (> 3x) */}
            {status === 'FAKE' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="text-5xl mb-2">⛔</div>
                <h2 className="text-2xl font-extrabold text-red-600">KODE HANGUS</h2>
                <p className="text-sm text-red-700 mt-3 font-bold">
                  Limit Scan Habis! (Total: {product.scan_count}x)
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  Kode ini sudah terlalu sering digunakan. Kemungkinan botol bekas/daur ulang.
                </p>
              </div>
            )}

            {/* DETAIL PRODUK */}
            <div className="text-left border-t pt-4">
              <h3 className="text-lg font-bold text-gray-800">{product.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{product.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div>
                  <span className="block font-bold text-gray-400">SERIAL NUMBER</span>
                  {product.serial_number}
                </div>
                <div>
                  <span className="block font-bold text-gray-400">BATCH CODE</span>
                  {product.code}
                </div>
                <div className="col-span-2 mt-1 pt-2 border-t border-gray-200">
                   <span className="block font-bold text-gray-400">WAKTU CEK</span>
                   {scanTime}
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="mt-8 text-xs text-gray-300">
          Security System by Ahmto Tech
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">Loading System...</div>}>
      <VerifyContent />
    </Suspense>
  );
}