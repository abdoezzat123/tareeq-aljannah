import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// تقسيم النص الطويل إلى أجزاء (كل جزء أقل من 1024 حرف)
function splitTextIntoChunks(text: string, maxLength = 900): string[] {
  // تنظيف النص
  text = text.replace(/\s+/g, " ").trim();

  // تقسيم حسب الجمل
  const sentences = text.match(/[^.!?؟。]+[.!?؟。]+/g) || [text];

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length <= maxLength) {
      currentChunk = (currentChunk + " " + sentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      // إذا كانت الجملة نفسها أطول من maxLength، نقسمها حسب الكلمات
      if (sentence.length > maxLength) {
        const words = sentence.split(" ");
        let wordChunk = "";
        for (const word of words) {
          if ((wordChunk + " " + word).trim().length <= maxLength) {
            wordChunk = (wordChunk + " " + word).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = word;
          }
        }
        if (wordChunk) currentChunk = wordChunk;
        else currentChunk = "";
      } else {
        currentChunk = sentence;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks.length > 0 ? chunks : [text];
}

// توليد hash للنص ليكون مفتاح الكاش
function getTextHash(text: string, voice: string, speed: number): string {
  return crypto
    .createHash("md5")
    .update(`${text}|${voice}|${speed}`)
    .digest("hex");
}

// دمج ملفات WAV متعددة في ملف واحد
function concatWavFiles(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  // قراءة معلومات WAV من أول ملف
  const firstHeader = buffers[0].slice(0, 44);
  const sampleRate = firstHeader.readUInt32LE(24);
  const channels = firstHeader.readUInt16LE(22);
  const bitsPerSample = firstHeader.readUInt16LE(34);

  // حساب إجمالي حجم البيانات الصوتية (بدون الهيدر 44 بايت)
  let totalDataSize = 0;
  for (const buf of buffers) {
    if (buf.length > 44) {
      totalDataSize += buf.length - 44;
    }
  }

  // إنشاء هيدر جديد
  const newHeader = Buffer.alloc(44);
  // "RIFF"
  newHeader.write("RIFF", 0);
  newHeader.writeUInt32LE(36 + totalDataSize, 4);
  newHeader.write("WAVE", 8);
  newHeader.write("fmt ", 12);
  newHeader.writeUInt32LE(16, 16);
  newHeader.writeUInt16LE(1, 20); // PCM
  newHeader.writeUInt16LE(channels, 22);
  newHeader.writeUInt32LE(sampleRate, 24);
  newHeader.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  newHeader.writeUInt16LE(channels * bitsPerSample / 8, 32);
  newHeader.writeUInt16LE(bitsPerSample, 34);
  newHeader.write("data", 36);
  newHeader.writeUInt32LE(totalDataSize, 40);

  // دمج البيانات الصوتية
  const result = Buffer.alloc(44 + totalDataSize);
  newHeader.copy(result, 0);
  let offset = 44;
  for (const buf of buffers) {
    if (buf.length > 44) {
      buf.slice(44).copy(result, offset);
      offset += buf.length - 44;
    }
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "tongtong", speed = 0.9 } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "النص مطلوب" }, { status: 400 });
    }

    // تنظيف النص من الرموز الخاصة التي قد تؤثر على النطق
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText.length === 0) {
      return NextResponse.json({ error: "النص فارغ بعد التنظيف" }, { status: 400 });
    }

    // التحقق من الكاش
    const cacheKey = getTextHash(cleanText, voice, speed);
    const cacheDir = path.join(process.cwd(), "public", "audio-cache");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    const cacheFile = path.join(cacheDir, `${cacheKey}.wav`);

    if (fs.existsSync(cacheFile)) {
      // إرجاع الصوت من الكاش
      const cachedBuffer = fs.readFileSync(cacheFile);
      return new NextResponse(cachedBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": cachedBuffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "HIT",
        },
      });
    }

    // استيراد SDK
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    // تقسيم النص لأجزاء
    const chunks = splitTextIntoChunks(cleanText, 900);

    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      try {
        const response = await zai.audio.tts.create({
          input: chunk,
          voice: voice,
          speed: speed,
          response_format: "wav",
          stream: false,
        });

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        audioBuffers.push(buffer);
      } catch (err) {
        console.error("TTS chunk error:", err);
        // نكمل باقي الأجزاء حتى لو فشل واحد
      }
    }

    if (audioBuffers.length === 0) {
      return NextResponse.json({ error: "فشل في توليد الصوت" }, { status: 500 });
    }

    // دمج الأجزاء
    const finalBuffer = audioBuffers.length > 1 ? concatWavFiles(audioBuffers) : audioBuffers[0];

    // حفظ في الكاش
    try {
      fs.writeFileSync(cacheFile, finalBuffer);
    } catch (e) {
      console.error("Cache write error:", e);
    }

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": finalBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("TTS API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "فشل في توليد الصوت" },
      { status: 500 }
    );
  }
}

// GET endpoint للتحقق من حالة الـ API
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "TTS API - طريقك للجنة",
    voices: ["tongtong", "chuichui", "xiaochen", "jam", "kazi", "douji", "luodo"],
  });
}
