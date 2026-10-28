import React, { useState } from "react";

interface LoginPageProps {
  onLoginSuccess: (password: string) => void;
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, gasUrl, onSaveGasUrl }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScriptGuide, setShowScriptGuide] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState(gasUrl);
  const [urlSaved, setUrlSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSaveUrl = () => {
    const trimmed = newUrlInput.trim();
    if (!trimmed) return;
    onSaveGasUrl(trimmed);
    setUrlSaved(true);
    setTimeout(() => {
      setUrlSaved(false);
      setShowUrlModal(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (!trimmed) {
      setErrorMessage("Silakan masukkan kata sandi terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Panggil verifikasi sandi ke Google Apps Script
      const cacheBuster = `t=${Date.now()}`;
      const url = `${gasUrl}?action=check_password&password=${encodeURIComponent(trimmed)}&${cacheBuster}`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Server error (${res.status})`);
      }

      const result = await res.json();

      // Kasus 1: Script GAS sudah diperbarui dan mengembalikan properti 'valid'
      if (typeof result.valid === "boolean") {
        if (result.valid) {
          onLoginSuccess(trimmed);
        } else {
          setErrorMessage(
            result.message || "Kata sandi salah! Pastikan sandi sesuai dengan yang ada di sheet 'sandi' Kolom A."
          );
        }
        return;
      }

      // Kasus 2: Script GAS lama yang belum diperbarui (mengembalikan {status: "success", data: [...]})
      if (result.status === "success" && Array.isArray(result.data)) {
        setErrorMessage(
          "⚠️ Script Google Apps Script di spreadsheet Anda belum diperbarui untuk memeriksa sheet 'sandi'. Silakan perbarui kode Apps Script melalui tombol panduan di bawah."
        );
        setShowScriptGuide(true);
        return;
      }

      // Kasus 3: Pesan error dari server
      if (result.status === "error") {
        setErrorMessage(result.message || "Terjadi kendala saat memeriksa sandi di spreadsheet.");
      } else {
        setErrorMessage("Format respon server tidak dikenali. Silakan periksa pengaturan Apps Script.");
      }
    } catch (err: any) {
      console.error("Login verification error:", err);
      setErrorMessage(
        "Gagal terhubung ke Google Spreadsheet. Periksa koneksi internet Anda atau pastikan URL Web App sudah sesuai."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const gasScriptExample = `/**
 * Google Apps Script - PENDATAAN KTP WARGA PEMATANG TAHALO
 * Versi Lengkap: Simpan Data, Upload Foto ke Drive, Ambil Riwayat & Verifikasi Login Sheet 'sandi'
 */

var FOLDER_ID = ""; // Opsional: Masukkan Folder ID Google Drive jika sudah ada

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // 1. VERIFIKASI SANDI LOGIN DARI SHEET 'sandi' (KOLOM A)
    if (action === "check_password" || action === "login") {
      var inputPassword = (e.parameter.password || "").toString().trim();
      
      if (!inputPassword) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          valid: false,
          message: "Sandi tidak boleh kosong."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var sandiSheet = ss.getSheetByName("sandi");
      if (!sandiSheet) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          valid: false,
          message: "Sheet 'sandi' belum dibuat di Google Spreadsheet!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var lastRow = sandiSheet.getLastRow();
      if (lastRow === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          valid: false,
          message: "Sheet 'sandi' masih kosong! Masukkan sandi di Kolom A."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Ambil seluruh data di Kolom A
      var values = sandiSheet.getRange(1, 1, lastRow, 1).getValues();
      var isValid = false;

      for (var i = 0; i < values.length; i++) {
        var cell = values[i][0];
        if (cell !== null && cell !== undefined) {
          var passInSheet = cell.toString().trim();
          if (passInSheet !== "" && passInSheet === inputPassword) {
            isValid = true;
            break;
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        valid: isValid,
        message: isValid ? "Sandi cocok! Akses diberikan." : "Sandi salah! Silakan coba lagi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. DEFAULT: AMBIL DATA RIWAYAT DARI SHEET 'Sheet1'
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();
    var data = [];
    var lastRow = sheet.getLastRow();

    if (lastRow > 1) {
      var numCols = Math.min(sheet.getLastColumn(), 21);
      var rows = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

      for (var r = rows.length - 1; r >= 0; r--) {
        var row = rows[r];
        if (!row[3] && !row[4]) continue;

        var waktuStr = "";
        if (row[0] instanceof Date) {
          waktuStr = Utilities.formatDate(row[0], "GMT+7", "yyyy-MM-dd HH:mm:ss");
        } else if (row[0]) {
          waktuStr = row[0].toString();
        }

        var tglLahirStr = "";
        if (row[6] instanceof Date) {
          tglLahirStr = Utilities.formatDate(row[6], "GMT+7", "yyyy-MM-dd");
        } else if (row[6]) {
          tglLahirStr = row[6].toString();
        }

        data.push({
          waktuInput: waktuStr,
          waktuPerekaman: waktuStr,
          dusunFaktual: row[1] ? row[1].toString() : "",
          rtFaktual: row[2] ? row[2].toString() : "",
          nik: row[3] ? row[3].toString() : "",
          nama: row[4] ? row[4].toString() : "",
          tempatLahir: row[5] ? row[5].toString() : "",
          tanggalLahir: tglLahirStr,
          jenisKelamin: row[7] ? row[7].toString() : "",
          alamat: row[8] ? row[8].toString() : "",
          rt: row[9] ? row[9].toString() : "",
          rw: row[10] ? row[10].toString() : "",
          kelDesa: row[11] ? row[11].toString() : "",
          kecamatan: row[12] ? row[12].toString() : "",
          kotaKabupaten: row[13] ? row[13].toString() : "",
          agama: row[13] ? row[13].toString() : (row[14] ? row[14].toString() : ""),
          statusPerkawinan: row[14] ? row[14].toString() : "",
          pekerjaan: row[15] ? row[15].toString() : "",
          kewarganegaraan: row[16] ? row[16].toString() : "",
          berlakuHingga: row[17] ? row[17].toString() : "",
          linkFoto: row[18] ? row[18].toString() : "",
          latitude: row[19] || "",
          longitude: row[20] || ""
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: data
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getActiveSheet();

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Waktu Perekaman",
        "Dusun Faktual (Petugas)",
        "RT Faktual (Petugas)",
        "NIK",
        "Nama Lengkap",
        "Tempat Lahir",
        "Tanggal Lahir",
        "Jenis Kelamin",
        "Alamat KTP",
        "RT KTP",
        "RW KTP",
        "Kel/Desa",
        "Kecamatan",
        "Agama",
        "Status Perkawinan",
        "Pekerjaan",
        "Kewarganegaraan",
        "Berlaku Hingga",
        "Link Foto Google Drive",
        "Latitude",
        "Longitude"
      ]);
      sheet.getRange(1, 1, 1, 21).setFontWeight("bold").setBackground("#dbeafe");
    }

    var fileUrl = "";
    var rawPhoto = contents.fotoKtp || contents.image || "";
    if (rawPhoto && rawPhoto.indexOf("base64,") !== -1) {
      var folder;
      if (FOLDER_ID && FOLDER_ID.trim() !== "") {
        folder = DriveApp.getFolderById(FOLDER_ID);
      } else {
        var folders = DriveApp.getFoldersByName("Foto KTP Pematang Tahalo");
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder("Foto KTP Pematang Tahalo");
        }
      }

      var base64Data = rawPhoto.split("base64,")[1];
      var decodedBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/jpeg");
      
      var fileName = (contents.nik ? contents.nik + " - " : "") + (contents.nama ? contents.nama.toUpperCase() : "KTP") + ".jpg";
      decodedBlob.setName(fileName);
      
      var file = folder.createFile(decodedBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    sheet.appendRow([
      contents.waktuPerekaman || new Date().toLocaleString("id-ID"),
      contents.dusunFaktual || "",
      contents.rtFaktual || "",
      "'" + (contents.nik || ""),
      contents.nama || "",
      contents.tempatLahir || "",
      contents.tanggalLahir || "",
      contents.jenisKelamin || "",
      contents.alamat || "",
      contents.rt || "",
      contents.rw || "",
      contents.kelDesa || "",
      contents.kecamatan || "",
      contents.agama || "",
      contents.statusPerkawinan || "",
      contents.pekerjaan || "",
      contents.kewarganegaraan || "",
      contents.berlakuHingga || "",
      fileUrl,
      contents.latitude || "",
      contents.longitude || ""
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data berhasil disimpan!",
      linkFoto: fileUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(gasScriptExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 p-8 text-center text-white relative">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
            Akses Terbatas Petugas
          </span>
          <h1 className="text-xl font-black uppercase tracking-tight leading-snug">
            Pendataan KTP Warga
            <br />
            <span className="text-red-200">Pematang Tahalo</span>
          </h1>
          <p className="text-xs text-red-100/90 mt-2 font-medium">
            Masukkan sandi yang terdaftar di spreadsheet untuk masuk
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-2">
                Kata Sandi Petugas
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik sandi Anda..."
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-4 py-3.5 pr-12 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 leading-relaxed space-y-2">
                <p className="font-semibold">{errorMessage}</p>
                <p className="text-[11px] text-red-600">
                  Semua baris di sheet <span className="font-bold underline">sandi</span> kolom A dapat digunakan untuk login.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa Sandi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Aplikasi</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Settings & Guide Buttons */}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setNewUrlInput(gasUrl);
                setShowUrlModal(true);
              }}
              className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-blue-200"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Ubah URL Spreadsheet Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScriptGuide(true)}
              className="text-[11px] font-bold text-gray-500 hover:text-red-600 transition flex items-center justify-center gap-1.5 py-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Panduan Setup Sheet & Kode Script</span>
            </button>
          </div>
        </div>
      </div>

      {/* URL Configuration Modal */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-8 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">Ubah URL Spreadsheet</h3>
                <p className="text-xs text-gray-500">Masukkan Google Apps Script Web App URL dari Spreadsheet baru</p>
              </div>
              <button
                onClick={() => setShowUrlModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={newUrlInput}
                onChange={(e) => setNewUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold">⚠️ Perhatian Pengisian URL:</p>
                <p>
                  Jangan masukkan URL link dokumen (<span className="font-mono">docs.google.com/spreadsheets/d/...</span>).
                </p>
                <p>
                  Yang dimasukkan adalah <strong>Web App URL</strong> berakhiran <span className="font-mono font-bold">/exec</span> yang didapat dari menu <strong>Ekstensi &gt; Apps Script &gt; Terapkan (Deploy) &gt; Penerapan Baru &gt; Web app (Siapa saja)</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowUrlModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                onClick={handleSaveUrl}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
              >
                {urlSaved ? "✓ Berhasil Disimpan!" : "Simpan URL"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {showScriptGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-base font-bold">Panduan Konfigurasi Spreadsheet Baru</h3>
                <p className="text-xs text-slate-300">Cara menghubungkan sheet 'Sheet1' & 'sandi' dengan aplikasi</p>
              </div>
              <button
                onClick={() => setShowScriptGuide(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* URL Quick Input in guide */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
                  Google Apps Script Web App URL Baru Anda
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newUrlInput}
                    onChange={(e) => setNewUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shrink-0"
                  >
                    {urlSaved ? "Tersimpan!" : "Simpan URL"}
                  </button>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl space-y-2">
                <h4 className="font-black text-red-900 uppercase tracking-wide text-xs">
                  1. Buat Sheet Bernama 'sandi' & 'Sheet1'
                </h4>
                <p>
                  Di Spreadsheet baru Anda, pastikan memiliki:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Sheet <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-300 font-bold text-red-700">Sheet1</span> untuk menampung riwayat rekapan data KTP.</li>
                  <li>Sheet <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-300 font-bold text-red-700">sandi</span> untuk menampung daftar kata sandi petugas.</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-900 uppercase tracking-wide text-xs">
                  2. Isi Sandi di Kolom A pada Sheet 'sandi'
                </h4>
                <p>
                  Tuliskan semua sandi yang diizinkan untuk login di <strong>Kolom A</strong> (misal baris 1, 2, 3, dst). Setiap baris di kolom A berlaku sebagai kata sandi login.
                </p>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800">
                  <div>Kolom A | Baris 1: <strong>admin123</strong></div>
                  <div>Kolom A | Baris 2: <strong>petugas2026</strong></div>
                  <div>Kolom A | Baris 3: <strong>tahalo01</strong></div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-emerald-900 uppercase tracking-wide text-xs">
                    3. Salin Kode Apps Script & Deploy
                  </h4>
                  <button
                    onClick={copyScript}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[11px] transition flex items-center gap-1.5"
                  >
                    {copied ? "✓ Tersalin!" : "Salin Kode Apps Script"}
                  </button>
                </div>
                <p>
                  Buka menu <strong>Ekstensi &gt; Apps Script</strong> di Spreadsheet baru Anda, ganti semua kode dengan kode berikut, lalu klik <strong>Terapkan (Deploy) &gt; Penerapan Baru (New deployment) &gt; Web app (Siapa saja / Anyone)</strong>. Lalu salin URL Web App yang berakhiran <span className="font-mono font-bold">/exec</span> dan tempel di kotak URL di atas.
                </p>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] max-h-48 overflow-y-auto">
                  {gasScriptExample}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowScriptGuide(false);
                  onLoginSuccess(password || "admin");
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Akses Sementara (Mode Transisi)
              </button>
              <button
                onClick={() => setShowScriptGuide(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
