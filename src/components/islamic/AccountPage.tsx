"use client";

import { useState, useEffect } from "react";
import { User, LogIn, LogOut, Mail, Lock, UserCircle, Cloud, Check, Loader2, Sparkles } from "lucide-react";
import { fetchCurrentUser, logout, fullSyncDown, fullSyncUp } from "@/lib/sync";
import { toast } from "sonner";

interface AccountPageProps {
  onNavigate: (tab: "home") => void;
}

interface UserData {
  userId: string;
  email: string;
  name?: string | null;
}

export function AccountPage({ onNavigate }: AccountPageProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("من فضلك املأ كل الحقول");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حدث خطأ");
        return;
      }
      toast.success(mode === "login" ? "مرحباً بعودتك! 🌟" : "تم إنشاء الحساب بنجاح ✨");
      setSyncing(true);
      if (mode === "login") {
        await fullSyncDown();
      } else {
        await fullSyncUp();
      }
      setSyncing(false);
      setUser(data.user);
      setEmail("");
      setPassword("");
      setName("");
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    toast.info("تم تسجيل الخروج");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-gold" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-gold gold-glow mb-4">
            <UserCircle className="w-12 h-12 text-gold" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">حسابي</h2>
          <p className="text-muted-foreground text-sm">{user.name || "مستخدم"}</p>
          <p className="text-xs text-muted-foreground mt-1">{user.email}</p>
        </div>

        <div className="glass-gold rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="w-6 h-6 text-gold" />
            <div>
              <h3 className="font-bold text-gold text-sm">المزامنة نشطة</h3>
              <p className="text-xs text-muted-foreground">كل بياناتك محفوظة على حسابك</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-muted-foreground">العلامات</div>
                <div className="text-sm font-bold text-foreground">متزامنة</div>
              </div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-muted-foreground">التسبيح</div>
                <div className="text-sm font-bold text-foreground">متزامن</div>
              </div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-muted-foreground">الصلوات</div>
                <div className="text-sm font-bold text-foreground">متزامنة</div>
              </div>
            </div>
            <div className="glass rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-muted-foreground">القراءة</div>
                <div className="text-sm font-bold text-foreground">متزامنة</div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-bold text-gold text-sm mb-3">مميزات الحساب</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gold/5">
              <Cloud className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-foreground">حفظ سحابي</div>
                <div className="text-xs text-muted-foreground">بياناتك محفوظة على السيرفر ومرتبطة بحسابك</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gold/5">
              <User className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-foreground">وصول من أي جهاز</div>
                <div className="text-xs text-muted-foreground">سجل دخول من أي جهاز وهتلاقي كل بياناتك</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-gold/5">
              <Sparkles className="w-5 h-5 text-gold shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-foreground">مزامنة تلقائية</div>
                <div className="text-xs text-muted-foreground">كل تغيير بيتم حفظه فوراً في حسابك</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl glass hover:bg-destructive/20 hover:text-destructive text-muted-foreground transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>

        <button
          onClick={() => onNavigate("home")}
          className="w-full py-3 rounded-xl glass-gold text-gold hover:gold-glow transition-all text-sm font-medium"
        >
          العودة للرئيسية
        </button>

        <p className="text-center text-xs text-muted-foreground">كل بياناتك مشفّرة وآمنة 🛡️</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full glass-gold gold-glow mb-4">
          <UserCircle className="w-12 h-12 text-gold" />
        </div>
        <h2 className="font-display text-3xl sm:text-4xl gold-gradient-text font-bold mb-2">
          {mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}
        </h2>
        <p className="text-muted-foreground text-sm">سجّل دخولك عشان تحفظ بياناتك وتوصلها من أي جهاز</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-gold rounded-2xl p-5 space-y-4">
        {mode === "register" && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">الاسم (اختياري)</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسمك الكريم"
                className="w-full bg-secondary/30 border border-gold/20 rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-gold/50"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground block mb-1">البريد الإلكتروني</label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              dir="ltr"
              className="w-full bg-secondary/30 border border-gold/20 rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-gold/50 text-right"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              dir="ltr"
              className="w-full bg-secondary/30 border border-gold/20 rounded-xl pr-10 pl-3 py-3 text-sm focus:outline-none focus:border-gold/50 text-right"
            />
          </div>
          {mode === "register" && <p className="text-[10px] text-muted-foreground mt-1">6 أحرف على الأقل</p>}
        </div>

        <button
          type="submit"
          disabled={submitting || syncing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-gold-dark to-gold text-background font-bold text-sm hover:gold-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting || syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {syncing ? "جارٍ المزامنة..." : "جارٍ المعالجة..."}
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              {mode === "login" ? "دخول" : "إنشاء حساب"}
            </>
          )}
        </button>
      </form>

      <div className="text-center text-sm">
        {mode === "login" ? (
          <p className="text-muted-foreground">
            مش عندك حساب؟{" "}
            <button onClick={() => setMode("register")} className="text-gold font-bold hover:underline">أنشئ حساب جديد</button>
          </p>
        ) : (
          <p className="text-muted-foreground">
            عندك حساب بالفعل؟{" "}
            <button onClick={() => setMode("login")} className="text-gold font-bold hover:underline">سجّل دخول</button>
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-bold text-gold text-sm mb-3 text-center">ليه أنشئ حساب؟</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Cloud className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-muted-foreground">حفظ كل بياناتك في السحابة (سبحة، صلوات، علامات، قراءة)</p>
          </div>
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-muted-foreground">وصول لبياناتك من أي جهاز (موبايل، كمبيوتر، تابلت)</p>
          </div>
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="text-muted-foreground">مزامنة تلقائية فورية لكل تغيير</p>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">بياناتك مشفّرة وآمنة، ومش بنشاركها مع حد 🛡️</p>
    </div>
  );
}
