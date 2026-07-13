import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// تقسيم النص الطويل إلى أجزاء صغيرة
function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  // تنظيف النص
  text = text.replace(/\s+/g, " ").trim();

  // تقسيم حسب الجمل والعلامات
  const sentences = text.match(/[^.!?؟،؛\n]+[.!?؟،؛\n]+/g) || [text];

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if ((currentChunk + " " + trimmedSentence).trim().length <= maxLength) {
      currentChunk = (currentChunk + " " + trimmedSentence).trim();
    } else {
      if (currentChunk) chunks.push(currentChunk);
      // إذا كانت الجملة نفسها أطول من maxLength، نقسمها حسب الكلمات
      if (trimmedSentence.length > maxLength) {
        const words = trimmedSentence.split(" ");
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
        currentChunk = trimmedSentence;
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

// فحص إذا كان النص عربي
function isArabicText(text: string): boolean {
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  return arabicChars !== null && arabicChars.length > text.length * 0.3;
}

// جلب الصوت من Google Translate TTS (يدعم العربية بصوت طبيعي)
async function fetchGoogleTTS(text: string, lang = "ar"): Promise<Buffer> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "audio/mpeg, audio/*; q=0.9, */*; q=0.5",
      "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
      "Referer": "https://translate.google.com/",
    },
  });

  if (!response.ok) {
    throw new Error(`Google TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}

// دمج ملفات MP3 متعددة (ببساطة دمج البايتات - يعمل لمعظم حالات MP3)
function concatMp3Files(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  // دمج بسيط - لإزالة ID3 tags من الملفات الثانية فما بعد
  const result: Buffer[] = [];
  for (let i = 0; i < buffers.length; i++) {
    if (i === 0) {
      result.push(buffers[i]);
    } else {
      // تخطي ID3v2 tag إن وجد
      const buf = buffers[i];
      if (buf.length > 10 && buf.slice(0, 3).toString() === "ID3") {
        const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
        const headerSize = 10 + size;
        if (headerSize < buf.length) {
          result.push(buf.slice(headerSize));
        } else {
          result.push(buf);
        }
      } else {
        result.push(buf);
      }
    }
  }

  return Buffer.concat(result);
}

export async function POST(req: NextRequest) {
  try {
    const { text, voice = "tongtong", speed = 0.9 } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "النص مطلوب" }, { status: 400 });
    }

    // تنظيف النص من الرموز الخاصة
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
    const cacheFile = path.join(cacheDir, `${cacheKey}.mp3`);

    if (fs.existsSync(cacheFile)) {
      const cachedBuffer = fs.readFileSync(cacheFile);
      return new NextResponse(cachedBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": cachedBuffer.length.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "HIT",
        },
      });
    }

    let finalBuffer: Buffer;

    // اختيار خدمة TTS حسب لغة النص
    if (isArabicText(cleanText)) {
      // للنصوص العربية: استخدم Google Translate TTS (صوت عربي طبيعي)
      try {
        const chunks = splitTextIntoChunks(cleanText, 180);
        const audioBuffers: Buffer[] = [];

        for (const chunk of chunks) {
          try {
            const buffer = await fetchGoogleTTS(chunk, "ar");
            audioBuffers.push(buffer);
            // تأخير بسيط لتجنب الحظر
            await new Promise((r) => setTimeout(r, 100));
          } catch (err) {
            console.error("Google TTS chunk error:", err);
          }
        }

        if (audioBuffers.length === 0) {
          throw new Error("فشل في توليد الصوت من Google TTS");
        }

        finalBuffer = audioBuffers.length > 1 ? concatMp3Files(audioBuffers) : audioBuffers[0];
      } catch (err) {
        console.error("Arabic TTS error, falling back:", err);
        // محاولة بديلة: استخدام z-ai-web-dev-sdk بصوت jam (إنجليزي)
        const ZAI = (await import("z-ai-web-dev-sdk")).default;
        const zai = await ZAI.create();
        const chunks = splitTextIntoChunks(cleanText, 900);
        const audioBuffers: Buffer[] = [];
        for (const chunk of chunks) {
          try {
            const response = await zai.audio.tts.create({
              input: chunk,
              voice: "jam",
              speed: speed,
              response_format: "wav",
              stream: false,
            });
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers.push(Buffer.from(new Uint8Array(arrayBuffer)));
          } catch {}
        }
        if (audioBuffers.length === 0) {
          return NextResponse.json({ error: "فشل في توليد الصوت" }, { status: 500 });
        }
        finalBuffer = audioBuffers[0];
      }
    } else {
      // للنصوص غير العربية: استخدام z-ai-web-dev-sdk
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      const zai = await ZAI.create();
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
          audioBuffers.push(Buffer.from(new Uint8Array(arrayBuffer)));
        } catch {}
      }
      if (audioBuffers.length === 0) {
        return NextResponse.json({ error: "فشل في توليد الصوت" }, { status: 500 });
      }
      finalBuffer = audioBuffers[0];
    }

    // حفظ في الكاش
    try {
      fs.writeFileSync(cacheFile, finalBuffer);
    } catch (e) {
      console.error("Cache write error:", e);
    }

    // تحديد نوع المحتوى حسب الخدمة المستخدمة
    const isArabic = isArabicText(cleanText);
    const contentType = isArabic ? "audio/mpeg" : "audio/wav";

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
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

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "TTS API - طريقك للجنة",
    languages: {
      arabic: "Google Translate TTS (صوت عربي طبيعي)",
      other: "z-ai-web-dev-sdk",
    },
  });
}
