"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Play, Pause, SkipBack, SkipForward, BookOpen, ChevronLeft, Volume2, Bookmark, MapPin, X } from "lucide-react";
import { surahs, qaris, Surah } from "@/lib/quran-data";
import { fetchSurah, fetchAyahGlobalNumbers, Ayah, SurahWithAyahs } from "@/lib/quran-api";
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

// واجهة موضع القراءة المحفوظ
interface ReadingPosition {
  surahNumber: number;
  surahName: string;
  ayahNumber: number; // رقم الآية في السورة (1-based)
  ayahIndex: number; // الـ index في الـ array (0-based)
  timestamp: number;
}

// قراءة الموضع المحفوظ من localStorage
const getSavedPosition = (): ReadingPosition | null => {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem("tareeq-islam_reading-position");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// حفظ الموضع
const saveReadingPosition = (pos: ReadingPosition) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("tareeq-islam_reading-position", JSON.stringify(pos));
  } catch {}
};

// حذف الموضع المحفوظ
const clearReadingPosition = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tareeq-islam_reading-position");
};

export function QuranReader() {
  const [view, setView] = useState<"list" | "surah">("list");
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [surahData, setSurahData] = useState<SurahWithAyahs | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [qari, setQari] = useState("ar.alafasy");
  const [globalAyahNumbers, setGlobalAyahNumbers] = useState<number[]>([]);
  const [currentAyah, setCurrentAyah] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [savedPosition, setSavedPosition] = useState<ReadingPosition | null>(null);
  const [resumeTarget, setResumeTarget] = useState<number>(-1); // الـ index اللي نكمل منه
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const settings = getSettings();
     
    setQari(settings.qari);
     
    setSavedPosition(getSavedPosition());
  }, []);

  // حفظ الموضع عند تغيير الآية الحالية أو تشغيلها
  const savePosition = useCallback((surah: Surah, ayahIndex: number) => {
    if (!surahData || ayahIndex < 0) return;
    const ayahNumber = surahData.ayahs[ayahIndex]?.numberInSurah;
    if (!ayahNumber) return;
    const pos: ReadingPosition = {
      surahNumber: surah.number,
      surahName: surah.name,
      ayahNumber,
      ayahIndex,
      timestamp: Date.now(),
    };
    saveReadingPosition(pos);
    setSavedPosition(pos);
  }, [surahData]);

  const loadSurah = async (surah: Surah, resumeFromIndex = -1) => {
    setLoading(true);
    setSelectedSurah(surah);
    setView("surah");
    const startIndex = resumeFromIndex >= 0 ? resumeFromIndex : 0;
    setCurrentAyah(startIndex);
    setResumeTarget(resumeFromIndex);
    setIsPlaying(false);
    try {
      const [data, globalNums] = await Promise.all([
        fetchSurah(surah.number, qari),
        fetchAyahGlobalNumbers(surah.number),
      ]);
      setSurahData(data);
      setGlobalAyahNumbers(globalNums);
      saveSettings({ lastReadSurah: surah.number });

      // لو في resume، نمرّر للآية
      if (resumeFromIndex >= 0) {
        setTimeout(() => {
          const ayahElement = document.getElementById(`ayah-${resumeFromIndex}`);
          if (ayahElement) {
            ayahElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          toast.success(`متابعة من: ${surah.name} - آية ${data.ayahs[resumeFromIndex]?.numberInSurah}`);
        }, 500);
      }
    } catch {
      toast.error("فشل في جلب السورة. تحقق من الاتصال بالإنترنت");
    } finally {
      setLoading(false);
    }
  };

  // متابعة من آخر موضع
  const resumeReading = async () => {
    if (!savedPosition) return;
    const surah = surahs.find((s) => s.number === savedPosition.surahNumber);
    if (!surah) {
      toast.error("تعذّر العثور على السورة");
      return;
    }
    await loadSurah(surah, savedPosition.ayahIndex);
  };

  // مسح الموضع المحفوظ
  const clearPosition = () => {
    clearReadingPosition();
    setSavedPosition(null);
    toast.info("تم مسح الموضع المحفوظ");
  };

  const playAyah = useCallback(async (ayahIndex: number) => {
    if (!surahData || !globalAyahNumbers[ayahIndex]) return;

    const audioUrl = `https://cdn.islamic.network/quran/audio/128/${qari}/${globalAyahNumbers[ayahIndex]}.mp3`;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onplay = () => {
      setIsPlaying(true);
      setCurrentAyah(ayahIndex);
      // حفظ الموضع عند كل آية بتشتغل
      if (selectedSurah) {
        savePosition(selectedSurah, ayahIndex);
      }
    };

    audio.onended = () => {
      const nextIndex = ayahIndex + 1;
      if (nextIndex < (surahData.ayahs.length)) {
        playAyah(nextIndex);
      } else {
        setIsPlaying(false);
        setCurrentAyah(-1);
        toast.success("✅ انتهت السورة");
      }
    };

    audio.onerror = () => {
      toast.error("تعذّر تشغيل الصوت");
      setIsPlaying(false);
    };

    try {
      await audio.play();
      // تمرير للآية الحالية
      const ayahElement = document.getElementById(`ayah-${ayahIndex}`);
      if (ayahElement) {
        ayahElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } catch {}
  }, [surahData, globalAyahNumbers, qari, selectedSurah, savePosition]);

  const togglePlay = () => {
    if (!surahData) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const idx = currentAyah >= 0 ? currentAyah : 0;
      playAyah(idx);
    }
  };

  const playNext = () => {
    if (!surahData) return;
    const next = currentAyah + 1;
    if (next < surahData.ayahs.length) {
      playAyah(next);
    }
  };

  const playPrevious = () => {
    if (!surahData) return;
    const prev = Math.max(0, currentAyah - 1);
    playAyah(prev);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
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
            القرآن الكريم
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِيَدَّبَّرُوا آيَاتِهِ
          </p>
        </div>

        {/* اختيار القارئ */}
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

        {/* بطاقة متابعة القراءة - تظهر لو في موضع محفوظ */}
        {savedPosition && (
          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-900/30 to-emerald-950/20 border-2 border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-400 text-sm">متابعة القراءة</h3>
                  <p className="text-xs text-muted-foreground">آخر موضع وصلت له</p>
                </div>
              </div>
              <button
                onClick={clearPosition}
                className="p-2 rounded-lg hover:bg-emerald-500/10 transition-all text-muted-foreground hover:text-emerald-400"
                title="مسح الموضع"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg text-emerald-100 mb-0.5">
                  {savedPosition.surahName}
                </div>
                <div className="text-xs text-emerald-400/70 flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  آية {savedPosition.ayahNumber}
                  <span className="text-muted-foreground">
                    • {new Date(savedPosition.timestamp).toLocaleDateString("ar-EG", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <button
                onClick={resumeReading}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-400 transition-all flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                <Play className="w-4 h-4" />
                متابعة
              </button>
            </div>
          </div>
        )}

        {/* البحث */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="ابحث عن سورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-secondary/30 border-gold/20 pr-12 py-6 text-base"
          />
        </div>

        {/* قائمة السور */}
        <div className="space-y-2">
          {filteredSurahs.map((surah) => (
            <button
              key={surah.number}
              onClick={() => loadSurah(surah)}
              className="w-full glass rounded-2xl p-4 flex items-center gap-4 hover:glass-gold transition-all text-right group"
            >
              <div className="w-12 h-12 rounded-full glass-gold flex items-center justify-center shrink-0 relative">
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
          {filteredSurahs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد نتائج
            </div>
          )}
        </div>
      </div>
    );
  }

  // عرض السورة
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      {/* رأس السورة */}
      <div className="glass-gold rounded-2xl p-5">
        <button
          onClick={() => {
            setView("list");
            if (audioRef.current) audioRef.current.pause();
            setIsPlaying(false);
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

      {/* أدوات التحكم بالتشغيل */}
      <div className="glass rounded-2xl p-4 sticky top-20 sm:top-24 z-30">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={playPrevious}
            disabled={!surahData || currentAyah <= 0}
            className="p-3 rounded-full glass hover:glass-gold disabled:opacity-30 transition-all"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!surahData}
            className="p-5 rounded-full glass-gold text-gold gold-glow hover:scale-105 disabled:opacity-30 transition-all"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 mr-0.5" />}
          </button>

          <button
            onClick={playNext}
            disabled={!surahData || currentAyah >= (surahData?.ayahs.length || 0) - 1}
            className="p-3 rounded-full glass hover:glass-gold disabled:opacity-30 transition-all"
          >
            <SkipBack className="w-5 h-5" />
          </button>
        </div>

        {/* زر حفظ الموضع الحالي */}
        {surahData && currentAyah >= 0 && selectedSurah && (
          <div className="mt-3 flex items-center justify-center">
            <button
              onClick={() => {
                savePosition(selectedSurah, currentAyah);
                toast.success(`تم حفظ الموضع: ${selectedSurah.name} - آية ${surahData.ayahs[currentAyah]?.numberInSurah}`, {
                  description: "تقدر تكمل من هنا في أي وقت",
                });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg glass-gold text-gold hover:gold-glow transition-all text-xs font-bold"
            >
              <Bookmark className="w-4 h-4" />
              حفظ الموضع الحالي (آية {surahData.ayahs[currentAyah]?.numberInSurah})
            </button>
          </div>
        )}

        {isPlaying && surahData && (
          <div className="text-center mt-3 text-xs text-muted-foreground">
            قيد التشغيل الآن: الآية {currentAyah + 1} من {surahData.ayahs.length}
          </div>
        )}
      </div>

      {/* محتوى السورة */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-gold mx-auto mb-4" />
            <p className="text-muted-foreground">جارٍ تحميل السورة...</p>
          </div>
        </div>
      ) : surahData ? (
        <div className="mushaf-page p-6 sm:p-10 relative">
          {/* زخارف الزوايا */}
          <span className="corner-tl" />
          <span className="corner-br" />

          {/* رأس السورة */}
          <div className="surah-header">
            <div className="text-xs text-amber-800/70 mb-2">سورة رقم {selectedSurah?.number}</div>
            <h2 className="surah-name-mushaf">
              {selectedSurah?.name}
            </h2>
            <div className="text-xs text-amber-900/60 mt-2">
              {selectedSurah?.englishName} • {selectedSurah?.numberOfAyahs} آية • {selectedSurah?.revelationType === "Meccan" ? "مكية" : "مدنية"}
            </div>
          </div>

          {/* البسملة */}
          {selectedSurah?.number !== 1 && selectedSurah?.number !== 9 && (
            <p className="basmala">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
          )}

          {/* الآيات */}
          <p className="mushaf-text">
            {surahData.ayahs.map((ayah, idx) => {
              const bookmarkKey = `${selectedSurah?.number}-${ayah.numberInSurah}`;
              const isBookmarked = bookmarkedAyahs.has(bookmarkKey);
              const isCurrent = currentAyah === idx;
              return (
                <span
                  key={ayah.numberInSurah}
                  id={`ayah-${idx}`}
                  onClick={() => playAyah(idx)}
                  className={cn(
                    "cursor-pointer transition-all",
                    isCurrent && "ayah-active",
                    isBookmarked && !isCurrent && "ayah-bookmarked"
                  )}
                >
                  {ayah.text}
                  <span
                    className={cn(
                      "ayah-number",
                      isBookmarked && "ring-2 ring-emerald-500/50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSet = new Set(bookmarkedAyahs);
                      if (isBookmarked) {
                        newSet.delete(bookmarkKey);
                        toast.info("تم إزالة العلامة");
                      } else {
                        newSet.add(bookmarkKey);
                        toast.success(`علامة على الآية ${ayah.numberInSurah}`, {
                          description: "تقدر ترجعلها من قسم العلامات",
                        });
                      }
                      setBookmarkedAyahs(newSet);
                      localStorage.setItem("tareeq-islam_ayah-bookmarks", JSON.stringify([...newSet]));
                      fetchCurrentUser().then((u) => {
                        if (u) {
                          toggleBookmarkAPI(selectedSurah?.number || 0, ayah.numberInSurah, selectedSurah?.name || "", !isBookmarked);
                        }
                      });
                    }}
                    title={isBookmarked ? "إزالة العلامة" : "وضع علامة"}
                  >
                    {ayah.numberInSurah}
                  </span>
                </span>
              );
            })}
          </p>

          {/* فاصل نهاية السورة */}
          <div className="mushaf-divider">
            ۞ ۞ ۞
          </div>
          <div className="text-center text-sm text-amber-900/70 mt-4">
            صدق الله العظيم
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          تعذّر تحميل السورة
        </div>
      )}
    </div>
  );
}
