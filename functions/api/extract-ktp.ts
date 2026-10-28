// Cloudflare Pages Function for /api/extract-ktp
interface Env {
  GEMINI_API_KEY?: string;
  API_KEY?: string;
}

function normalizeDateToYYYYMMDD(raw: string): string {
  if (!raw) return "";
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const dmyShortMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
  if (dmyShortMatch) {
    const day = dmyShortMatch[1].padStart(2, "0");
    const month = dmyShortMatch[2].padStart(2, "0");
    let year = parseInt(dmyShortMatch[3], 10);
    const currentYear = new Date().getFullYear() % 100;
    year = year > currentYear ? 1900 + year : 2000 + year;
    return `${year}-${month}-${day}`;
  }

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

function inferBirthDateFromNik(nik: string): string {
  if (!nik) return "";
  const digits = nik.replace(/\D/g, "");
  if (digits.length < 12) return "";

  let day = parseInt(digits.substring(6, 8), 10);
  const month = parseInt(digits.substring(8, 10), 10);
  const year2 = parseInt(digits.substring(10, 12), 10);

  if (isNaN(day) || isNaN(month) || isNaN(year2)) return "";
  if (day > 40) day -= 40;
  if (day < 1 || day > 31 || month < 1 || month > 12) return "";

  const currentYear2 = new Date().getFullYear() % 100;
  const fullYear = year2 > currentYear2 ? 1900 + year2 : 2000 + year2;
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const apiKey = context.env.GEMINI_API_KEY || context.env.API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Kunci API Gemini belum diatur di Cloudflare Pages (Environment Variable: GEMINI_API_KEY). Silakan tambahkan di Settings > Environment variables di Cloudflare dashboard."
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body: any = await context.request.json();
    const base64Image: string = body?.image;
    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: "Gambar KTP wajib disertakan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let mimeType = "image/jpeg";
    if (base64Image.startsWith("data:")) {
      const match = base64Image.match(/^data:([^;]+);base64,/);
      if (match && match[1]) {
        mimeType = match[1];
      }
    }
    const imageData = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;

    const promptText = `Extract data from this Indonesian KTP (Kartu Tanda Penduduk) image accurately into JSON format.
STRICT RULES:
1. SPLIT "Tempat/Tgl Lahir" into "tempatLahir" (city/place name only) and "tanggalLahir" (date).
2. "tanggalLahir" MUST be formatted as ISO "YYYY-MM-DD" (e.g. if KTP says "15-08-1990", return "1990-08-15").
3. If "tanggalLahir" text is partially obscured, extract it using digits 7 to 12 of NIK (format DDMMYY, if day > 40 it indicates female so subtract 40).
4. SPLIT "RT/RW" into "rt" (e.g. "003") and "rw" (e.g. "005").
5. For "Alamat", take ONLY the street name, gang, or block.
6. Extract "kelDesa", "kecamatan", and "kotaKabupaten" separately.
7. If any field is unreadable, use an empty string.
8. Output MUST be ONLY valid JSON with keys: nik, nama, tempatLahir, tanggalLahir, jenisKelamin, alamat, rt, rw, kelDesa, kecamatan, kotaKabupaten, agama, statusPerkawinan, pekerjaan, kewarganegaraan, berlakuHingga.`;

    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash"
    ];

    let lastError = "";
    for (const model of modelsToTry) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { inline_data: { mime_type: mimeType, data: imageData } },
                    { text: promptText }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          lastError = errText;
          continue;
        }

        const geminiJson: any = await geminiRes.json();
        const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          continue;
        }

        const parsed = JSON.parse(text);
        let normalizedDate = normalizeDateToYYYYMMDD(parsed.tanggalLahir);
        if (!normalizedDate && parsed.nik) {
          normalizedDate = inferBirthDateFromNik(parsed.nik);
        }
        parsed.tanggalLahir = normalizedDate || "";

        return new Response(
          JSON.stringify({ status: "success", data: parsed }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } catch (err: any) {
        lastError = err.message || String(err);
      }
    }

    return new Response(
      JSON.stringify({
        error: lastError || "Gagal memproses ekstraksi KTP melalui AI."
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } catch (globalErr: any) {
    return new Response(
      JSON.stringify({ error: globalErr.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
