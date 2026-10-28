/**
 * Google Apps Script - PENDATAAN KTP WARGA PEMATANG TAHALO
 * 
 * Fitur:
 * 1. Simpan Data KTP & Foto ke Google Drive atas nama warga (di sheet 'Sheet1')
 * 2. Ambil Riwayat Data KTP untuk ditampilkan di aplikasi
 * 3. Verifikasi Kata Sandi Petugas dari sheet 'sandi' (Kolom A)
 * 
 * CARA SETUP:
 * 1. Pastikan di Spreadsheet ada 2 sheet:
 *    - 'Sheet1' : Untuk menampung rekapan data KTP warga
 *    - 'sandi'  : Untuk menampung daftar kata sandi petugas di Kolom A (misal baris 1, 2, dst)
 * 2. Pasang/timpa kode ini di menu Extensions (Ekstensi) > Apps Script
 * 3. Klik tombol Deploy (Terapkan) > New deployment (Penerapan baru) > Web app > Anyone (Siapa saja)
 */

var FOLDER_ID = ""; // Opsional: Masukkan Folder ID Google Drive Anda jika ada

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "";

    // ==========================================
    // 1. VERIFIKASI SANDI LOGIN DARI SHEET 'sandi' (KOLOM A)
    // ==========================================
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
          message: "Tabel otorisasi 'sandi' belum dibuat pada basis data!"
        })).setMimeType(ContentService.MimeType.JSON);
      }

      var lastRow = sandiSheet.getLastRow();
      if (lastRow === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          valid: false,
          message: "Tabel otorisasi 'sandi' masih kosong! Masukkan sandi di Kolom A."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Ambil seluruh baris di Kolom A
      var values = sandiSheet.getRange(1, 1, lastRow, 1).getValues();
      var isValid = false;

      for (var i = 0; i < values.length; i++) {
        var cell = values[i][0];
        if (cell !== null && cell !== undefined) {
          var passInSheet = cell.toString().trim();
          // Jika baris berisi sandi yang sama persis
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

    // ==========================================
    // 2. DEFAULT: AMBIL DATA RIWAYAT DARI SHEET 'Sheet1'
    // ==========================================
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

    // Buat baris header jika sheet masih kosong
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
    // Simpan foto KTP ke Google Drive dengan NAMA PEMILIK KTP
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
      
      // Simpan file atas nama pemilik KTP (NIK - NAMA)
      var fileName = (contents.nik ? contents.nik + " - " : "") + (contents.nama ? contents.nama.toUpperCase() : "KTP") + ".jpg";
      decodedBlob.setName(fileName);
      
      var file = folder.createFile(decodedBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    // Tambahkan baris baru ke Spreadsheet pada Sheet1
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
