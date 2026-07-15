"use client";

import { useState, useEffect } from "react";
import { Bookmark, BookOpen, Trash2, ChevronLeft } from "lucide-react";
import { surahs } from "@/lib/quran-data";
import { fetchSurah, SurahWithAyahs } from "@/lib/quran-api";
import { toast } from "sonner";

interface BookmarksPageProps {
  onNavigate: (tab: "quran" | "tafsir" | "home") => void;
}

interface BookmarkItem {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  ayahText?: string;
}

export function BookmarksPage({ onNavigate }: BookmarksPageProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("tareeq-islam_ayah-bookmarks") || "[]");
      const items: BookmarkItem[] = saved.map((key) => {
        const [surahNum, ayahNum] = key.split("-").map(Number);
        const surah = surahs.find((s) => s.number === surahNum);
        return {
          surahNumber: surahNum,
          ayahNumber: ayahNum,
          surahName: surah?.name || `سورة ${surahNum}`,
        };
      });

      const surahNumbers = [...new Set(items.map((i) => i.surahNumber))];
      for (const surahNum of surahNumbers) {
        try {
          const data = await fetchSurah(surahNum, "quran-uthmani");
          items.forEach((item) => {
            if (item.surahNumber === surahNum) {
              const ayah = data.ayahs.find((a) => a.numberInSurah === item.ayahNumber);
              if (ayah) item.ayahText = ayah.text;
            }
          });
        } catch {}
      }
      setBookmarks(items.sort((a, b) => a.surahNumber - b.surahNumber));
    } catch {
      toast.error("فشل تحميل العلامات");
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = (surahNumber: number, ayahNumber: number) => {
    const key = `${surahNumber}-${ayahNumber}`;
    const saved: string[] = JSON.parse(localStorage.getItem("tareeq-islam_ayah-bookmarks") || "[]");
    const newSaved = saved.filter((k) => k !== key);
    localStorage.setItem("tareeq-islam_ayah-bookmarks", JSON.stringify(newSaved));
    setBookmarks(bookmarks.filter((b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)));
    toast.info("تم إزالة العلامة");
  };

  const clearAll = () => {
    if (confirm("هل تريد حذف كل العلامات؟")) {
      localStorage.setItem("tareeq-islam_ayah-bookmarks", "[]");
      setBookmarks([]);
      toast.info("تم حذف كل العلامات");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-gold gold-glow mb-3">
          <Bookmark className="w-8 h-8 text-gold" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">العلامات</h2>
        <p className="text-muted-foreground text-sm sm:text-base">الآيات التي وضعت عليها علامة</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">لا توجد علامات بعد</p>
          <p className="text-xs text-muted-foreground mb-4">افتح أي سورة واضغط على رقم الآية لوضع علامة عليها</p>
          <button
            onClick={() => onNavigate("quran")}
            className="px-6 py-2.5 rounded-xl glass-gold text-gold hover:gold-glow transition-all text-sm font-bold inline-flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            تصفح القرآن
          </button>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              عدد العلامات: <span className="font-bold text-gold">{bookmarks.length}</span>
            </span>
            <button onClick={clearAll} className="text-xs text-destructive hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" />
              حذف الكل
            </button>
          </div>

          <div className="space-y-3">
            {bookmarks.map((b, idx) => (
              <div key={`${b.surahNumber}-${b.ayahNumber}-${idx}`} className="glass rounded-2xl p-4 hover:glass-gold transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <Bookmark className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">{b.surahName}</div>
                      <div className="text-xs text-muted-foreground">الآية {b.ayahNumber}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNavigate("quran")}
                      className="p-2 rounded-lg glass hover:glass-gold text-gold transition-all"
                      title="فتح في القرآن"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeBookmark(b.surahNumber, b.ayahNumber)}
                      className="p-2 rounded-lg glass hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all"
                      title="إزالة العلامة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {b.ayahText && (
                  <p className="font-amiri text-lg sm:text-xl leading-loose text-foreground text-right">{b.ayahText}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={() => onNavigate("home")}
        className="w-full py-3 rounded-xl glass hover:glass-gold transition-all text-sm font-medium flex items-center justify-center gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        العودة للرئيسية
      </button>
    </div>
  );
}
