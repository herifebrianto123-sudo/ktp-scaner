import React, { useState } from "react";
import { XIcon, CheckCircleIcon } from "./Icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  gasUrl: string;
  onSaveGasUrl: (url: string) => void;
}

export const GAS_SCRIPT_CODE = `/**
 * Google Apps Script - PENDATAAN KTP WARGA PEMATANG TAHALO
 * Simpan data KTP ke Google Spreadsheet, Upload Foto ke Drive,
 * Ambil data riwayat dan Verifikasi Login Petugas dari sheet 'sandi'.
 * 
 * CARA SETUP:
 * 1. Di Spreadsheet Anda, pastikan memiliki:
 *    - Sheet bernama 'Sheet1' (untuk rekapan data KTP)
 *    - Sheet bernama 'sandi' (untuk daftar sandi login di Kolom A)
 * 2. Klik menu 'Extensions' (Ekstensi) > 'Apps Script'.
 * 3. Hapus semua kode default dan tempel kode di bawah ini.
 * 4. Klik tombol 'Deploy' (Terapkan) > 'New deployment' (Penerapan baru).
 * 5. Pilih tipe 'Web app' (Aplikasi web).
 * 6. Konfigurasi:
 *    - Execute as: 'Me' (Saya)
 *    - Who has access: 'Anyone' (Siapa saja)
 * 7. Klik 'Deploy', beri izin akses Google, lalu salin 'Web App URL' dan tempel ke pengaturan aplikasi ini.
 */

var FOLDER_ID = ""; // Opsional: Masukkan Folder ID Google Drive Anda jika ada

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

      // Ambil seluruh baris di Kolom A
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
}
`;

export const GoogleAppsScriptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  gasUrl,
  onSaveGasUrl
}) => {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveGasUrl(urlInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h2 className="text-lg font-bold">Integrasi Google Spreadsheet & Drive</h2>
            <p className="text-xs text-slate-300">
              Menyimpan data di 'Sheet1', verifikasi sandi di 'sandi' (Kolom A), dan simpan foto ke Google Drive
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* URL Input */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-900">
              Google Apps Script Web App URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition"
              >
                {saved ? "Tersimpan!" : "Simpan URL"}
              </button>
            </div>
            <p className="text-[11px] text-blue-700">
              URL ini digunakan untuk mengirim data KTP, memuat data riwayat, dan memverifikasi kata sandi petugas.
            </p>
          </div>

          {/* Setup sandi instruction */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold text-amber-950 flex items-center gap-1.5">
              <span>🔐</span> Pengaturan Halaman Login & Sheet 'sandi':
            </p>
            <p>
              • Buat sheet baru di spreadsheet bernama <span className="font-bold underline">sandi</span>.
            </p>
            <p>
              • Masukkan semua sandi yang diizinkan di <strong>Kolom A</strong> (baris 1, 2, 3, dst). Setiap baris di kolom A berlaku sebagai sandi login yang valid.
            </p>
            <p>
              • Data warga tetap tersimpan rapi di sheet <span className="font-bold underline">Sheet1</span>.
            </p>
          </div>

          {/* Script instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm">
                Kode Google Apps Script (Lengkap dengan Verifikasi Sandi)
              </h3>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition"
              >
                {copied ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                    Tersalin!
                  </>
                ) : (
                  "Salin Kode GAS"
                )}
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono max-h-56 overflow-y-auto leading-relaxed">
              {GAS_SCRIPT_CODE}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
