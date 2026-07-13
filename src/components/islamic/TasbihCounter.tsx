"use client";

import { useState, useEffect, useRef } from "react";
import { RotateCcw, Target, TrendingUp, Vibrate, Volume2, VolumeX } from "lucide-react";
import { tasbeehat, TasbihItem } from "@/lib/adhkar-data";
import { saveTasbihCount, getTodayTasbih, getTasbihHistory, getTodayKey } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// Initial count from storage
const getInitialCount = (tasbihId: string): number => {
  if (typeof window === "undefined") return 0;
  const today = getTodayTasbih();
  return today?.counts?.[tasbihId] || 0;
};

const getInitialDailyGoal = (): number => {
  if (typeof window === "undefined") return 1000;
  try {
    const settings = JSON.parse(localStorage.getItem("tareeq-islam_settings") || "{}");
    return settings.dailyGoal || 1000;
  } catch {
    return 1000;
  }
};

export function TasbihCounter() {
  const [selectedTasbih, setSelectedTasbih] = useState<TasbihItem>(tasbeehat[0]);
  const [count, setCount] = useState(() => getInitialCount(tasbeehat[0].id));
  const [round, setRound] = useState(() => Math.floor(getInitialCount(tasbeehat[0].id) / tasbeehat[0].target));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isPressed, setIsPressed] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(getInitialDailyGoal);

  const audioContextRef = useRef<AudioContext | null>(null);

  // عند تغيير التسبيح، تحديث العدّاد من التخزين
  const changeTasbih = (tasbih: TasbihItem) => {
    const saved = getInitialCount(tasbih.id);
    setCount(saved);
    setRound(Math.floor(saved / tasbih.target));
    setSelectedTasbih(tasbih);
  };

  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);
    } catch {}
  };

  const playRoundCompleteSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(freq, now + i * 0.15);
        gainNode.gain.setValueAtTime(0, now + i * 0.15);
        gainNode.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
        oscillator.start(now + i * 0.15);
        oscillator.stop(now + i * 0.15 + 0.4);
      });
    } catch {}
  };

  const handleTasbih = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);

    const newCount = count + 1;
    setCount(newCount);
    saveTasbihCount(selectedTasbih.id, newCount);

    if (vibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate(30);
    }

    // إكمال دورة
    if (newCount % selectedTasbih.target === 0) {
      const newRound = Math.floor(newCount / selectedTasbih.target);
      setRound(newRound);
      playRoundCompleteSound();
      if (vibrationEnabled && "vibrate" in navigator) {
        navigator.vibrate([60, 50, 60]);
      }
      toast.success(`🎯 دورة مكتملة! (${newRound})`, {
        description: `${selectedTasbih.text} × ${selectedTasbih.target}`,
      });
    } else {
      playClickSound();
    }

    // الهدف اليومي
    const today = getTodayTasbih();
    const totalToday = today?.total || 0;
    if (totalToday > 0 && totalToday === dailyGoal) {
      toast.success("🎉 مبروك! حققت هدفك اليومي", {
        description: `أكملت ${dailyGoal} تسبيحة اليوم`,
      });
    }
  };

  const reset = () => {
    setCount(0);
    setRound(0);
    saveTasbihCount(selectedTasbih.id, 0);
    toast.info("تم إعادة العدّاد");
  };

  const today = getTodayTasbih();
  const totalToday = today?.total || 0;
  const goalProgress = Math.min((totalToday / dailyGoal) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      {/* رأس الصفحة */}
      <div className="text-center">
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
          السبحة الإلكترونية
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ
        </p>
      </div>

      {/* إحصائيات اليوم */}
      <div className="glass-gold rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-gold mb-1">إحصائيات اليوم</h3>
            <p className="text-xs text-muted-foreground">{getTodayKey()}</p>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs text-muted-foreground hover:text-gold transition-colors flex items-center gap-1"
          >
            <TrendingUp className="w-4 h-4" />
            التفاصيل
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold gold-gradient-text tabular-nums">{totalToday}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">إجمالي اليوم</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{count}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">العدد الحالي</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{round}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">الدورات</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="w-3 h-3" />
              الهدف اليومي: {dailyGoal}
            </span>
            <span className="text-xs font-bold text-gold">{Math.round(goalProgress)}%</span>
          </div>
          <Progress value={goalProgress} className="h-2 bg-secondary" />
        </div>

        {showStats && (
          <div className="mt-4 pt-4 border-t border-gold/15 space-y-2 animate-fade-in-up">
            <p className="text-xs text-muted-foreground mb-2">تفصيل التسبيحات اليوم:</p>
            {tasbeehat.map((t) => {
              const c = today?.counts?.[t.id] || 0;
              return (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <span className="text-foreground/80">{t.text}</span>
                  <span className="font-bold text-gold tabular-nums">{c}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* اختيار التسبيح */}
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-bold text-gold mb-3">اختر التسبيح:</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scroll">
          {tasbeehat.map((t) => (
            <button
              key={t.id}
              onClick={() => changeTasbih(t)}
              className={cn(
                "px-4 py-2 rounded-xl whitespace-nowrap text-sm font-medium transition-all shrink-0",
                selectedTasbih.id === t.id
                  ? "glass-gold text-gold gold-glow"
                  : "bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {t.text}
            </button>
          ))}
        </div>

        {/* معلومات التسبيح */}
        <div className="mt-4 p-3 rounded-xl bg-secondary/30 border border-gold/10">
          <p className="font-amiri text-xl text-foreground mb-2 leading-relaxed">
            {selectedTasbih.text}
          </p>
          {selectedTasbih.translation && (
            <p className="text-xs text-muted-foreground mb-1">{selectedTasbih.translation}</p>
          )}
          {selectedTasbih.virtue && (
            <p className="text-xs text-gold/80 italic">﴿ {selectedTasbih.virtue} ﴾</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">الهدف لكل دورة: {selectedTasbih.target}</p>
        </div>
      </div>

      {/* منطقة التسبيح الكبيرة */}
      <div className="glass-gold rounded-3xl p-6 sm:p-10 text-center gold-glow">
        <div className="mb-4">
          <div className="text-xs text-muted-foreground mb-1">التسبيح الحالي</div>
          <div className="font-amiri text-2xl sm:text-3xl gold-gradient-text font-bold mb-2">
            {selectedTasbih.text}
          </div>
        </div>

        {/* الزر الكبير */}
        <button
          onClick={handleTasbih}
          className={cn(
            "relative w-48 h-48 sm:w-64 sm:h-64 mx-auto rounded-full transition-all duration-200 select-none touch-none",
            "bg-gradient-to-br from-gold/20 via-gold/10 to-transparent",
            "border-2 border-gold/40 hover:border-gold/70",
            "flex items-center justify-center group",
            isPressed && "animate-tasbih-press scale-95"
          )}
          style={{
            boxShadow: "0 0 60px rgba(180, 140, 60, 0.2), inset 0 0 60px rgba(180, 140, 60, 0.1)",
          }}
        >
          <div className="absolute inset-4 rounded-full border border-gold/20" />
          <div className="absolute inset-8 rounded-full border border-gold/10" />
          <div className="relative z-10">
            <div className="text-6xl sm:text-7xl font-bold gold-gradient-text tabular-nums">
              {count}
            </div>
            <div className="text-xs text-muted-foreground mt-2">اضغط للتسبيح</div>
          </div>
        </button>

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <div className="glass rounded-full px-4 py-2">
            <span className="text-muted-foreground">الدورات: </span>
            <span className="font-bold text-gold tabular-nums">{round}</span>
          </div>
          <div className="glass rounded-full px-4 py-2">
            <span className="text-muted-foreground">الهدف: </span>
            <span className="font-bold text-gold tabular-nums">{selectedTasbih.target}</span>
          </div>
        </div>
      </div>

      {/* أدوات التحكم */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:glass-gold transition-all text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          إعادة العدّاد
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium",
            soundEnabled ? "glass-gold text-gold" : "glass text-muted-foreground"
          )}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          الصوت
        </button>

        <button
          onClick={() => setVibrationEnabled(!vibrationEnabled)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium",
            vibrationEnabled ? "glass-gold text-gold" : "glass text-muted-foreground"
          )}
        >
          <Vibrate className="w-4 h-4" />
          الاهتزاز
        </button>

        <button
          onClick={() => {
            const newGoal = prompt("أدخل هدفك اليومي للتسبيح:", String(dailyGoal));
            if (newGoal) {
              const n = parseInt(newGoal);
              if (!isNaN(n) && n > 0) {
                setDailyGoal(n);
                const settings = JSON.parse(localStorage.getItem("tareeq-islam_settings") || "{}");
                localStorage.setItem("tareeq-islam_settings", JSON.stringify({ ...settings, dailyGoal: n }));
                toast.success(`تم تحديد الهدف: ${n}`);
              }
            }
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass hover:glass-gold transition-all text-sm font-medium"
        >
          <Target className="w-4 h-4" />
          تحديد الهدف
        </button>
      </div>

      {/* التاريخ */}
      <TasbihHistory />
    </div>
  );
}

function TasbihHistory() {
  const [history, setHistory] = useState(getTasbihHistory());

  useEffect(() => {
    const interval = setInterval(() => setHistory(getTasbihHistory()), 5000);
    return () => clearInterval(interval);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="font-bold text-gold mb-3 text-sm">آخر الأيام (30 يوم)</h3>
      <div className="max-h-48 overflow-y-auto custom-scroll space-y-2">
        {[...history].reverse().map((r) => (
          <div key={r.date} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30">
            <span className="text-xs text-muted-foreground">{r.date}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gold tabular-nums">{r.total}</span>
              <span className="text-[10px] text-muted-foreground">تسبيحة</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
