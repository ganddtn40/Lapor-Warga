import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, description } = body;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is missing" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Ensure the image base64 is in the right format
    // Expected format: data:image/jpeg;base64,...
    const mimeType = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || "image/jpeg";
    const base64Data = image.split(",")[1];

    if (!base64Data) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    const prompt = `
      Anda adalah AI asisten untuk platform pelaporan warga (Smart City).
      Tugas Anda adalah mengklasifikasikan laporan berdasarkan gambar dan deskripsi yang diberikan.
      
      Deskripsi laporan dari warga:
      "${description || 'Tidak ada deskripsi'}"
      
      Pilih SATU dari kategori berikut yang paling relevan:
      - Infrastruktur (jalan rusak, jembatan, gedung)
      - Kebersihan (sampah, got mampet)
      - Lalu Lintas (macet, lampu merah rusak, parkir liar)
      - Fasilitas Umum (taman, toilet umum, halte)
      - Lingkungan Hidup (pohon tumbang, polusi, banjir)
      - Keamanan (kriminalitas, premanisme)
      - Pelayanan Publik (pelayanan lambat, pungli)
      - Bencana Alam (gempa, longsor)
      - Lainnya

      Jawab HANYA dengan nama kategori utama yang paling tepat (misal: "Infrastruktur", "Kebersihan", "Lalu Lintas"). Jangan beri penjelasan apapun.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const responseText = result.response.text().trim();
    
    // Clean up the response to just the category
    let category = "Lainnya";
    const categories = [
      "Infrastruktur",
      "Kebersihan",
      "Lalu Lintas",
      "Fasilitas Umum",
      "Lingkungan Hidup",
      "Keamanan",
      "Pelayanan Publik",
      "Bencana Alam",
      "Lainnya"
    ];
    
    for (const cat of categories) {
      if (responseText.toLowerCase().includes(cat.toLowerCase())) {
        category = cat;
        break;
      }
    }

    return NextResponse.json({ category, rawResponse: responseText });
  } catch (error: any) {
    console.error("AI Classification Error:", error);
    return NextResponse.json(
      { error: "Failed to classify image", details: error.message },
      { status: 500 }
    );
  }
}
