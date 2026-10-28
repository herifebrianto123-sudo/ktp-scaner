import { KtpData } from "../src/types";

export async function extractKtpData(base64Image: string): Promise<KtpData> {
  const response = await fetch("/api/extract-ktp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ image: base64Image })
  });

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMessage);
  }

  const result = await response.json();
  if (result.status !== "success" || !result.data) {
    throw new Error(result.error || "Gagal mengekstrak data dari respons server");
  }

  return result.data as KtpData;
}
