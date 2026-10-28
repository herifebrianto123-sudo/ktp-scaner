import { GoogleGenAI, Type } from "@google/genai";
import type { Request, Response } from "express";

export function normalizeDateToYYYYMMDD(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // DD-MM-YY
  const dmyShortMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, "0");
    const month = dmyShortMatch[2].padStart(2, "0");
    let year = parseInt(dmyShortMatch[3], 10);
    const currentYear = new Date().getFullYear() % 100;
    year = year > currentYear ? 1900 + year : 2000 + year;
    return `${year}-${month}-${day}`;
  }

  // Indonesian month names e.g. "17 Agustus 1945"
  const monthNames: Record<string, string> = {
    jan: "01", januari: "01", january: "01",
    feb: "02", februari: "02", february: "02",
    mar: "03", maret: "03", march: "03",
    apr: "04", april: "04",
    mei: "05", may: "05",
    jun: "06", juni: "06", june: "06",
    jul: "07", juli: "07", july: "07",
    agu: "08", agust: "08", agustus: "08", august: "08",
    sep: "09", sept: "09", september: "09",
    okt: "10", oktober: "10", october: "10",
    nov: "11", november: "11",
    des: "12", desember: "12", december: "12"
  };

  const textMatch = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, "0");
    const mStr = textMatch[2].toLowerCase();
    const month = monthNames[mStr] || Object.entries(monthNames).find(([k]) => mStr.startsWith(k))?.[1];
    if (month) {
      return `${textMatch[3]}-${month}-${day}`;
    }
  }

  return s;
}

export function inferBirthDateFromNik(nik: string): string {
  if (!nik) return "";
  const digits = nik.replace(/\D/g, "");
  if (digits.length < 12) return "";

  let day = parseInt(digits.substring(6, 8), 10);
  const month = parseInt(digits.substring(8, 10), 10);
  const year2 = parseInt(digits.substring(10, 12), 10);

  if (isNaN(day) || isNaN(month) || isNaN(year2)) return "";
  // For female NIK, day is added with 40
  if (day > 40) day -= 40;
  if (day < 1 || day > 31 || month < 1 || month > 12) return "";

  const currentYear2 = new Date().getFullYear() % 100;
  const fullYear = year2 > currentYear2 ? 1900 + year2 : 2000 + year2;
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function processKtpExtraction(base64Image: string) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error(
      "Kunci API Gemini belum diatur di server (GEMINI_API_KEY). Silakan atur di Environment Variables."
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      },
      timeout: 25000
    }
  });

  let mimeType = "image/jpeg";
  if (base64Image.startsWith("data:")) {
    const match = base64Image.match(/^data:([^;]+);base64,/);
    if (match && match[1]) {
      mimeType = match[1];
    }
  }
  const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

  const promptText = `Extract data from this Indonesian KTP (Kartu Tanda Penduduk) image accurately.
STRICT RULES:
1. SPLIT "Tempat/Tgl Lahir" into "tempatLahir" (city/place name only) and "tanggalLahir" (date).
2. "tanggalLahir" MUST be formatted as ISO "YYYY-MM-DD" (e.g. if KTP says "15-08-1990" or "15/08/1990", return "1990-08-15").
3. If "tanggalLahir" text is partially obscured, extract it using digits 7 to 12 of NIK (format DDMMYY, if day > 40 it indicates female so subtract 40).
4. SPLIT "RT/RW" into "rt" (e.g. "003") and "rw" (e.g. "005").
5. For "Alamat", take ONLY the street name, gang, or block.
6. Extract "kelDesa", "kecamatan", and "kotaKabupaten" separately.
7. "kotaKabupaten" is usually the regency/city name at the top or below kecamatan.
8. If any field is unreadable, use an empty string.
9. Output MUST be valid JSON matching the schema.`;

  // gemini-3.1-flash-lite is the fastest and most stable model under high-demand periods
  const modelsToTry = [
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-flash-latest"
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { mimeType, data: imageData } },
            { text: promptText }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nik: { type: Type.STRING },
              nama: { type: Type.STRING },
              tempatLahir: { type: Type.STRING },
              tanggalLahir: {
                type: Type.STRING,
                description: "Birth date strictly in YYYY-MM-DD format"
              },
              jenisKelamin: { type: Type.STRING },
              alamat: { type: Type.STRING },
              rt: { type: Type.STRING },
              rw: { type: Type.STRING },
              kelDesa: { type: Type.STRING },
              kecamatan: { type: Type.STRING },
              kotaKabupaten: { type: Type.STRING },
              agama: { type: Type.STRING },
              statusPerkawinan: { type: Type.STRING },
              pekerjaan: { type: Type.STRING },
              kewarganegaraan: { type: Type.STRING },
              berlakuHingga: { type: Type.STRING }
            },
            required: ["nik", "nama"]
          }
        }
      });

      const jsonStr = (response.text || "").trim();
      const parsed = JSON.parse(jsonStr);

      let normalizedDate = normalizeDateToYYYYMMDD(parsed.tanggalLahir);
      if (!normalizedDate && parsed.nik) {
        normalizedDate = inferBirthDateFromNik(parsed.nik);
      }
      parsed.tanggalLahir = normalizedDate || "";

      return parsed;
    } catch (err: any) {
      lastError = err;
      // Continue to next available model in modelsToTry
    }
  }

  throw lastError || new Error("Gagal mengekstrak data KTP");
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { image } = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!image) {
      return res.status(400).json({ error: "Gambar KTP wajib disertakan." });
    }

    const data = await processKtpExtraction(image);
    return res.status(200).json({ status: "success", data });
  } catch (err: any) {
    console.error("API Error in /api/extract-ktp:", err);
    let msg = err?.message || String(err);
    try {
      const parsedJson = JSON.parse(msg);
      if (parsedJson?.error?.message) {
        msg = parsedJson.error.message;
      }
    } catch {}

    if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
      return res.status(403).json({
        error:
          "Akses Ditolak (Error 403: Permission Denied). Kunci API Anda tidak memiliki izin atau dibatasi. Silakan buat kunci baru di Google AI Studio dengan opsi 'Create API key in new project'."
      });
    }

    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
      return res.status(429).json({
        error:
          "Batas Kuota Gemini API Tercapai (Error 429: Quota Exceeded). Mohon tunggu sejenak atau periksa kuota API Key Anda di Google AI Studio."
      });
    }

    if (msg.includes("503") || msg.includes("high demand")) {
      return res.status(503).json({
        error:
          "Server AI Google sedang mengalami lonjakan trafik sementara (Error 503). Mohon coba lagi dalam beberapa detik."
      });
    }

    return res.status(500).json({
      error: msg || "Terjadi kesalahan pada server saat memproses data KTP."
    });
  }
}
