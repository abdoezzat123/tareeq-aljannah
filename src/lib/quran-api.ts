// دوال مساعدة للقرآن الكريم من alquran.cloud API

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
  audio?: string;
}

export interface SurahWithAyahs {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
}

// جلب سورة كاملة من API
export async function fetchSurah(surahNumber: number, qariId: string = "ar.alafasy"): Promise<SurahWithAyahs> {
  const edition = qariId; // مثال: ar.alafasy
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("فشل في جلب السورة");
  }
  const data = await response.json();
  return data.data;
}

// جلب نص السورة (بدون صوت)
export async function fetchSurahText(surahNumber: number): Promise<SurahWithAyahs> {
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("فشل في جلب نص السورة");
  }
  const data = await response.json();
  return data.data;
}

// جلب التفسير
export async function fetchTafsir(
  surahNumber: number,
  tafsirId: "saadi" | "muyassar" | "ibnkathir" = "saadi"
): Promise<{ ayahNumber: number; text: string }[]> {
  // saadi -> ar.saadi
  // muyassar -> ar.muyassar
  // ibnkathir -> ar.ibnkathir
  const editionMap: Record<string, string> = {
    saadi: "ar.saadi",
    muyassar: "ar.muyassar",
    ibnkathir: "ar.ibnkathir",
  };

  const edition = editionMap[tafsirId];
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/${edition}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("فشل في جلب التفسير");
  }
  const data = await response.json();
  if (data.data && data.data.ayahs) {
    return data.data.ayahs.map((a: { numberInSurah: number; text: string }) => ({
      ayahNumber: a.numberInSurah,
      text: a.text,
    }));
  }
  return [];
}

// جلب رابط الصوت لآية محددة من القراء المتاحين
export function getAyahAudioUrl(ayahNumber: number, qariId: string): string {
  // كل آية لها رقم موحد في المصحف (1-6236)
  // ar.alafasy و ar.husary يدعمون رابط الصوت المباشر من cdn
  return `https://cdn.islamic.network/quran/audio/128/${qariId}/${ayahNumber}.mp3`;
}

// جلب رقم الآية الموحد (في المصحف كله، ليس في السورة)
export async function fetchAyahGlobalNumbers(surahNumber: number): Promise<number[]> {
  // هذه الدالة تجلب أرقام الآيات الموحدة في المصحف
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/quran-uthmani`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  if (data.data && data.data.ayahs) {
    return data.data.ayahs.map((a: { number: number }) => a.number);
  }
  return [];
}
