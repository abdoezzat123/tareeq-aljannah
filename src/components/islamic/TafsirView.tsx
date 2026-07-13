"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, BookOpen, ChevronLeft, Volume2, BookMarked, Moon, Sun, Heart } from "lucide-react";
import { surahs, qaris, tafsirSources, Surah } from "@/lib/quran-data";
import { fetchSurah, fetchTafsir, Ayah, SurahWithAyahs } from "@/lib/quran-api";
import { getSettings, saveSettings } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function TafsirView() {
  const [view, setView] = useState<"list" | "surah">("list");
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [surahData, setSurahData] = useState<SurahWithAyahs | null>(null);
  const [tafsirData, setTafsirData] = useState<Record<string, { ayahNumber: number; text: string }[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tafsir, setTafsir] = useState<"saadi" | "muyassar" | "ibnkathir">("saadi");
  const [qari, setQari] = useState("ar.alafasy");
  const [currentAyah, setCurrentAyah] = useState<number>(-1);
  const [globalAyahNumbers, setGlobalAyahNumbers] = useState<number[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [loadingTafsirAudio, setLoadingTafsirAudio] = useState(false);
  const tafsirAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStoppedRef = useRef(false);

  useEffect(() => {
    const settings = getSettings();
    setTafsir(settings.tafsir as "saadi" | "muyassar" | "ibnkathir");
    setQari(settings.qari);
  }, []);

  const loadSurah = async (surah: Surah) => {
    setLoading(true);
    setSelectedSurah(surah);
    setView("surah");
    setCurrentAyah(-1);
    setTafsirData({});
    try {
      const data = await fetchSurah(surah.number, qari);

      // محاولة جلب أرقام الآيات الموحدة من الـ text edition
      const textResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/quran-uthmani`);
      const textJson = await textResponse.json();
      const globalNums = textJson.data?.ayahs?.map((a: { number: number }) => a.number) || [];
      setGlobalAyahNumbers(globalNums);

      setSurahData(data);

      // جلب التفاسير الثلاثة بالتوازي
      const [saadi, muyassar, ibnkathir] = await Promise.all([
        fetchTafsir(surah.number, "saadi").catch(() => []),
        fetchTafsir(surah.number, "muyassar").catch(() => []),
        fetchTafsir(surah.number, "ibnkathir").catch(() => []),
      ]);

      setTafsirData({ saadi, muyassar, ibnkathir });
      saveSettings({ lastReadSurah: surah.number });
    } catch (e) {
      toast.error("فشل في جلب السورة. تحقق من الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const playAyahTafsir = async (ayahIndex: number) => {
    if (!surahData) return;
    isStoppedRef.current = false;

    // إيقاف أي تشغيل سابق
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (tafsirAudioRef.current) {
      tafsirAudioRef.current.pause();
      tafsirAudioRef.current = null;
    }

    // تشغيل تلاوة الآية أولاً
    if (globalAyahNumbers[ayahIndex]) {
      const audioUrl = `https://cdn.islamic.network/quran/audio/128/${qari}/${globalAyahNumbers[ayahIndex]}.mp3`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setCurrentAyah(ayahIndex);

      audio.onended = () => {
        // بعد انتهاء التلاوة، نقرأ التفسير بصوت طبيعي
        readTafsir(ayahIndex);
      };

      audio.onerror = () => {
        setCurrentAyah(-1);
        toast.error("تعذّر تشغيل الصوت");
      };

      try {
        await audio.play();
        const ayahElement = document.getElementById(`tafsir-ayah-${ayahIndex}`);
        if (ayahElement) ayahElement.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
    }
  };

  const readTafsir = async (ayahIndex: number) => {
    if (!surahData) return;
    if (isStoppedRef.current) return;

    const tafsirText = tafsirData[tafsir]?.find((t) => t.ayahNumber === ayahIndex + 1)?.text;
    if (!tafsirText) {
      // لا يوجد تفسير، انتقل للآية التالية
      moveToNextAyah(ayahIndex);
      return;
    }

    setLoadingTafsirAudio(true);

    try {
      // استدعاء API توليد الصوت الطبيعي
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tafsirText,
          voice: "tongtong", // صوت دافئ وطبيعي - مثل قارئ يحكي قصة
          speed: 0.85, // سرعة أبطأ قليلاً لإعطاء إحساس السرد
        }),
      });

      if (!response.ok) {
        throw new Error("فشل في توليد الصوت");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      tafsirAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        tafsirAudioRef.current = null;
        if (!isStoppedRef.current) {
          moveToNextAyah(ayahIndex);
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        tafsirAudioRef.current = null;
        setLoadingTafsirAudio(false);
        if (!isStoppedRef.current) {
          moveToNextAyah(ayahIndex);
        }
      };

      await audio.play();
      setLoadingTafsirAudio(false);
    } catch (err) {
      setLoadingTafsirAudio(false);
      console.error("TTS error:", err);
      // محاولة fallback إلى Web Speech API
      if ("speechSynthesis" in window) {
        toast.info("جارٍ استخدام صوت المتصفح كبديل", { duration: 2000 });
        const utterance = new SpeechSynthesisUtterance(tafsirText);
        utterance.lang = "ar-SA";
        utterance.rate = 0.85;
        utterance.onend = () => {
          if (!isStoppedRef.current) moveToNextAyah(ayahIndex);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error("تعذّر تشغيل التفسير الصوتي");
        moveToNextAyah(ayahIndex);
      }
    }
  };

  const moveToNextAyah = (currentIndex: number) => {
    if (!surahData) return;
    const next = currentIndex + 1;
    if (next < surahData.ayahs.length) {
      setTimeout(() => {
        if (!isStoppedRef.current) playAyahTafsir(next);
      }, 800);
    } else {
      setCurrentAyah(-1);
      toast.success("✅ انتهت السورة والتفسير");
    }
  };

  const stopPlayback = () => {
    isStoppedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (tafsirAudioRef.current) {
      tafsirAudioRef.current.pause();
      tafsirAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setLoadingTafsirAudio(false);
    setCurrentAyah(-1);
  };

  useEffect(() => {
    return () => {
      isStoppedRef.current = true;
      if (audioRef.current) audioRef.current.pause();
      if (tafsirAudioRef.current) tafsirAudioRef.current.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const filteredSurahs = surahs.filter(
    (s) =>
      s.name.includes(searchQuery) ||
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.number).includes(searchQuery)
  );

  // عرض قائمة السور
  if (view === "list") {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
            تفسير القرآن الكريم
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            تَدَبُّرُ الْقُرْآنِ وَفَهْمُ مَعَانِيهِ
          </p>
        </div>

        {/* اختيار التفسير */}
        <div className="glass-gold rounded-2xl p-4 flex items-center gap-3">
          <BookMarked className="w-5 h-5 text-gold shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">التفسير</label>
            <Select value={tafsir} onValueChange={(v) => { setTafsir(v as "saadi" | "muyassar" | "ibnkathir"); saveSettings({ tafsir: v }); }}>
              <SelectTrigger className="bg-transparent border-gold/20 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tafsirSources.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex flex-col">
                      <span className="font-bold">{t.name}</span>
                      <span className="text-xs text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass-gold rounded-2xl p-4 flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-gold shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">القارئ</label>
            <Select value={qari} onValueChange={(v) => { setQari(v); saveSettings({ qari: v }); }}>
              <SelectTrigger className="bg-transparent border-gold/20 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qaris.map((q) => (
                  <SelectItem key={q.id} value={q.identifier}>{q.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 text-sm text-muted-foreground text-center">
          💡 اختر السورة لقراءة الآيات مع التفسير. يمكنك الاستماع لتلاوة الآية ثم تفسيرها صوتياً بالضغط على زر "تشغيل".
        </div>

        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="ابحث عن سورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary/30 border-gold/20 pr-12 py-6 text-base"
          />
        </div>

        <div className="space-y-2">
          {filteredSurahs.map((surah) => (
            <button
              key={surah.number}
              onClick={() => loadSurah(surah)}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:glass-gold transition-all text-right group"
            >
              <div className="w-12 h-12 rounded-full glass-gold flex items-center justify-center shrink-0">
                <span className="font-bold text-gold text-sm">{surah.number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-xl text-foreground group-hover:text-gold transition-colors">
                  {surah.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {surah.englishName} • {surah.numberOfAyahs} آية • {surah.revelationType === "Meccan" ? "مكية" : "مدنية"}
                </div>
              </div>
              <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // عرض السورة مع التفسير
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      <div className="glass-gold rounded-2xl p-5">
        <button
          onClick={() => {
            setView("list");
            stopPlayback();
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
          العودة للسور
        </button>

        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">سورة رقم {selectedSurah?.number}</div>
          <h2 className="font-display text-4xl sm:text-5xl gold-gradient-text font-bold mb-2">
            {selectedSurah?.name}
          </h2>
          <div className="text-xs text-muted-foreground">
            {selectedSurah?.englishName} • {selectedSurah?.numberOfAyahs} آية • {selectedSurah?.revelationType === "Meccan" ? "مكية" : "مدنية"}
          </div>
        </div>
      </div>

      {/* تبويبات اختيار التفسير */}
      <div className="glass rounded-2xl p-2 sticky top-20 sm:top-24 z-30">
        <Tabs value={tafsir} onValueChange={(v) => setTafsir(v as "saadi" | "muyassar" | "ibnkathir")}>
          <TabsList className="grid grid-cols-3 w-full bg-secondary/30">
            <TabsTrigger value="saadi" className="text-xs sm:text-sm">السعدي</TabsTrigger>
            <TabsTrigger value="muyassar" className="text-xs sm:text-sm">الميسر</TabsTrigger>
            <TabsTrigger value="ibnkathir" className="text-xs sm:text-sm">ابن كثير</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-gold mx-auto mb-4" />
            <p className="text-muted-foreground">جارٍ تحميل السورة والتفسير...</p>
          </div>
        </div>
      ) : surahData ? (
        <div className="space-y-4">
          {/* البسملة */}
          {selectedSurah?.number !== 1 && selectedSurah?.number !== 9 && (
            <div className="glass rounded-2xl p-5 text-center">
              <p className="font-amiri text-3xl sm:text-4xl gold-gradient-text">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            </div>
          )}

          {/* الآيات مع التفسير */}
          {surahData.ayahs.map((ayah, idx) => {
            const tafsirText = tafsirData[tafsir]?.find((t) => t.ayahNumber === ayah.numberInSurah)?.text;
            const isPlaying = currentAyah === idx;
            return (
              <div
                key={ayah.numberInSurah}
                id={`tafsir-ayah-${idx}`}
                className={cn(
                  "glass rounded-2xl p-5 transition-all",
                  isPlaying && "glass-gold gold-glow border-gold/40"
                )}
              >
                {/* رقم الآية وأدوات التحكم */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full glass-gold flex items-center justify-center text-xs font-bold text-gold">
                      {ayah.numberInSurah}
                    </div>
                    <span className="text-xs text-muted-foreground">الآية {ayah.numberInSurah}</span>
                  </div>

                  <button
                    onClick={() => isPlaying ? stopPlayback() : playAyahTafsir(idx)}
                    disabled={loadingTafsirAudio && isPlaying}
                    className={cn(
                      "p-2 rounded-full transition-all",
                      isPlaying ? "bg-destructive/20 text-destructive" : "glass-gold text-gold hover:gold-glow",
                      loadingTafsirAudio && isPlaying && "opacity-70"
                    )}
                  >
                    {isPlaying ? (
                      loadingTafsirAudio ? (
                        <span className="text-xs font-bold px-2 flex items-center gap-1">
                          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          توليد الصوت...
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2">⏹ إيقاف</span>
                      )
                    ) : (
                      <span className="text-xs font-bold px-2 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        تشغيل
                      </span>
                    )}
                  </button>
                </div>

                {/* نص الآية */}
                <p className="font-amiri text-2xl sm:text-3xl leading-loose text-foreground text-right mb-4">
                  {ayah.text}
                </p>

                <div className="gold-divider" />

                {/* التفسير */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookMarked className="w-4 h-4 text-gold" />
                    <span className="text-xs font-bold text-gold">
                      {tafsirSources.find((t) => t.id === tafsir)?.name}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-foreground/90 text-right">
                    {tafsirText || "التفسير غير متوفر لهذه الآية"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          تعذّر تحميل السورة
        </div>
      )}
    </div>
  );
}
