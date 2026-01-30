import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { Lock, Eye, EyeOff, Home } from "lucide-react";
import { signUpSchema, signInSchema } from "@/lib/authValidation";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true');
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          navigate("/dashboard");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate signup data
        const validationResult = signUpSchema.safeParse({ email, password, username });
        if (!validationResult.success) {
          toast.error(validationResult.error.errors[0].message);
          setLoading(false);
          return;
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              username: username
            }
          }
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب بنجاح! يمكنك تسجيل الدخول الآن");
        setIsSignUp(false);
      } else {
        // Validate signin data
        const validationResult = signInSchema.safeParse({ email, password });
        if (!validationResult.success) {
          toast.error(validationResult.error.errors[0].message);
          setLoading(false);
          return;
        }
        
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("تم تسجيل الدخول بنجاح");
      }
    } catch (error: any) {
      if (error.message === "User already registered") {
        toast.error("هذا البريد مسجل بالفعل، جرب تسجيل الدخول");
      } else if (error.message === "Invalid login credentials") {
        toast.error("البريد أو كلمة المرور غير صحيحة");
      } else {
        toast.error(error.message || "حدث خطأ");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Button>

            <h1 className="text-lg font-bold text-primary">MEDO STORAGE</h1>

            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{isSignUp ? "إنشاء حساب" : "تسجيل الدخول"}</CardTitle>
            <CardDescription>{isSignUp ? "أدخل بياناتك لإنشاء حساب جديد" : "أدخل بياناتك للوصول إلى ملفاتك"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="example@email.com"
                />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="username">اسم المستخدم</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "جاري التحميل..." : isSignUp ? "إنشاء حساب" : "تسجيل الدخول"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-primary hover:underline"
              >
                {isSignUp ? "لديك حساب بالفعل؟ سجل الدخول" : "ليس لديك حساب؟ أنشئ واحداً"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
