"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "./lib/supabaseClient";
import QRCode from "react-qr-code";
import { 
  ShieldCheck, AlertTriangle, XCircle, Search, RefreshCcw, 
  QrCode, FileText, Settings, AlertCircle, Flag 
} from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");

  const [scanResult, setScanResult] = useState<string | null>(null);
  const [productData, setProductData] = useState<any | null>(null);
  const [status, setStatus] = useState<string>("IDLE");
  const [showScanner, setShowScanner] = useState<boolean>(false);

  // --- GANTI NOMOR WA DISINI (Format: 628...) ---
  const adminWhatsApp = "6281234567890"; 
  // ----------------------------------------------

  function handleReport(type: string) {
    let message = "";
    if (type === "FAKE") {
      message = `Halo Admin Ahmto, saya scan kode: ${scanResult} tapi muncul status FAKE. Mohon infonya.`;
    } else if (type === "WARNING") {
      message = `Halo Admin, saya scan produk ${productData?.name} (Code: ${scanResult}), tapi muncul WARNING limit scan. Apakah ini aman?`;
    } else {
      message = `Halo Admin, saya mau tanya soal produk ${productData?.name}.`;
    }
    
    // Buka WhatsApp
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, '_blank');
  }

  async function checkCode(code: string) {
    if (!code) return;
    setScanResult(code);
    setStatus("CHECKING");
    setShowScanner(false);

    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('code', code)
        .single();

      if (!product) {
        setStatus("FAKE");
        return;
      }

      const storageKey = `verified_${code}`;
      const isMyDevice = localStorage.getItem(storageKey);

      if (isMyDevice) {
        setProductData(product);
        setStatus("VALID");
      } else {
        if (product.scan_count >= 5) {
          setProductData(product);
          setStatus("WARNING");
        } else {
          const { error: updateError } = await supabase
            .from('products')
            .update({ scan_count: product.scan_count + 1 })
            .eq('code', code);

          if (!updateError) {
            localStorage.setItem(storageKey, "true");
            setProductData({ ...product, scan_count: product.scan_count + 1 });
            setStatus("VALID");
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("FAKE");
    }
  }

  useEffect(() => {
    if (codeFromUrl) checkCode(codeFromUrl);
    else setStatus("IDLE");
  }, [codeFromUrl]);

  useEffect(() => {
    if (showScanner && !scanResult) {
      const scanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false
      );
      scanner.render((decodedText) => {
        scanner.clear();
        checkCode(decodedText);
      }, (err) => console.warn(err));
      return () => { try { scanner.clear(); } catch (e) {} };
    }
  }, [showScanner, scanResult]);

  return (
    <div className="w-full max-w-md pb-24">
      
      {/* SCANNER TOMBOL */}
      {!scanResult && status === "IDLE" && (
        <div className="text-center mt-10 px-4">
           <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
              <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
              <h2 className="text-lg font-bold text-gray-700 mb-2">Scan Verification</h2>
              <p className="text-sm text-gray-400 mb-6">Point your camera at the QR Code</p>
              {!showScanner ? (
                <button 
                  onClick={() => setShowScanner(true)}
                  className="bg-orange-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-orange-600 transition w-full"
                >
                  ACTIVATE CAMERA
                </button>
              ) : (
                <div id="reader" className="rounded-xl overflow-hidden"></div>
              )}
           </div>
        </div>
      )}

      {/* LOADING */}
      {status === "CHECKING" && (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center animate-pulse mt-10 mx-4">
          <Search className="w-12 h-12 text-orange-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-gray-800">Verifying...</h2>
        </div>
      )}

      {/* === HASIL: VALID === */}
      {status === "VALID" && productData && (
        <div className="bg-white mx-4 rounded-3xl shadow-2xl overflow-hidden border border-green-100 animate-in slide-in-from-bottom-5 duration-500 mt-4">
          
          <div className="bg-green-500 p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            
            <div className="bg-white p-2 w-32 h-32 mx-auto mb-4 rounded-xl shadow-lg flex items-center justify-center relative z-10">
               <div style={{ height: "auto", margin: "0 auto", maxWidth: 100, width: "100%" }}>
                <QRCode
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={scanResult || ""}
                  viewBox={`0 0 256 256`}
                />
               </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white tracking-wide relative z-10">AUTHENTIC</h1>
            <p className="text-green-100 text-xs opacity-90 relative z-10">Verified by Ahmto System</p>
          </div>

          <div className="p-6 space-y-6">
             <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">{productData.name}</h2>
                {/* DISPLAY SERIAL NUMBER (Kalau kosong, pakai Code biasa) */}
                <div className="inline-block bg-gray-100 rounded-full px-4 py-1 mt-2">
                  <span className="font-mono text-gray-600 text-sm tracking-wider font-bold">
                    {productData.serial_number || scanResult}
                  </span>
                </div>
             </div>

             <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-500">
                   <FileText className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-wider">Description</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {productData.description || "No description available."}
                </p>
             </div>

             <div className="space-y-2">
                <div className="flex items-center gap-2 text-orange-500">
                   <Settings className="w-4 h-4" />
                   <span className="text-xs font-bold uppercase tracking-wider">Specifications</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {productData.specifications || "No specifications listed."}
                </p>
             </div>

             <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-100">
                <span className="text-gray-400 text-xs uppercase">Security Check</span>
                <span className="text-xs text-green-700 font-bold">PASSED ({productData.scan_count}/5)</span>
             </div>

             <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-gray-400">
                   <AlertCircle className="w-3 h-3" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Disclaimer</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight text-justify">
                    This verification result is based on the data available at the time of scanning. Ahmto ensures the authenticity of the code, but physical product condition is subject to user handling.
                </p>
             </div>

             {/* TOMBOL LAPOR (FUNCTIONAL) */}
             <button 
                onClick={() => handleReport("VALID")}
                className="w-full border border-red-100 text-red-400 text-xs py-3 rounded-xl hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center gap-2"
             >
                <Flag className="w-3 h-3" /> Report a Problem
             </button>

          </div>
        </div>
      )}

      {/* === HASIL: WARNING === */}
      {status === "WARNING" && productData && (
        <div className="bg-white mx-4 rounded-3xl shadow-2xl overflow-hidden border border-orange-200 mt-4">
          <div className="bg-orange-500 p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-white mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">SUSPICIOUS</h1>
            <p className="text-orange-100 text-sm">Scan limit reached</p>
          </div>
           <div className="p-6 text-center space-y-4">
              <p className="text-sm text-gray-600">
                  This code has been scanned <strong className="text-orange-600">{productData.scan_count} times</strong>. This is unusual for a new product.
              </p>
              
              {/* TOMBOL LAPOR (FUNCTIONAL) */}
              <button 
                onClick={() => handleReport("WARNING")}
                className="w-full bg-orange-100 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-200 transition"
              >
                REPORT COUNTERFEIT
              </button>
            </div>
        </div>
      )}

      {/* === HASIL: FAKE === */}
      {status === "FAKE" && (
        <div className="bg-white mx-4 rounded-3xl shadow-2xl overflow-hidden border border-red-200 mt-4">
          <div className="bg-red-600 p-6 text-center">
            <XCircle className="w-12 h-12 text-white mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-white">FAKE</h1>
            <p className="text-red-100 text-sm">Code not recognized</p>
          </div>
           <div className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-4">
                The code <strong className="font-mono text-red-500">{scanResult}</strong> does not exist in our database.
              </p>
              
              {/* TOMBOL LAPOR (FUNCTIONAL) */}
              <button 
                onClick={() => handleReport("FAKE")}
                className="w-full bg-red-100 text-red-700 font-bold py-3 rounded-xl hover:bg-red-200 transition"
              >
                REPORT THIS ITEM
              </button>
            </div>
        </div>
      )}

      {/* SCAN AGAIN (Floating Button) */}
      {scanResult && (
        <div className="fixed bottom-6 left-0 w-full px-4 z-50">
           <button 
            onClick={() => window.location.href = "/"}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-2xl hover:bg-gray-800 transition flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> SCAN NEXT ITEM
          </button>
        </div>
      )}

    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 font-sans flex flex-col items-center">
      <div className="w-full max-w-md bg-white p-4 shadow-sm flex justify-between items-center sticky top-0 z-40">
        <div className="text-xl font-bold tracking-tighter uppercase border-l-4 border-orange-500 pl-3">
          AHMTO<span className="text-gray-400">VERIFY</span>
        </div>
        <div className="text-[10px] text-gray-400 border px-2 py-1 rounded">
          OFFICIAL CHECK
        </div>
      </div>
      <Suspense fallback={<div className="mt-10">Loading...</div>}>
        <VerifyContent />
      </Suspense>
    </main>
  );
}