import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { MobileMenu } from "@/components/MobileMenu";
import { Upload, FolderOpen, Share2, Shield } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Upload,
      title: "رفع الملفات",
      description: "ارفع ملفاتك بسهولة وأمان من أي جهاز"
    },
    {
      icon: FolderOpen,
      title: "تنظيم المجلدات",
      description: "نظم ملفاتك في مجلدات لسهولة الوصول"
    },
    {
      icon: Share2,
      title: "مشاركة سهلة",
      description: "شارك ملفاتك برابط مختصر مع امتداد الملف"
    },
    {
      icon: Shield,
      title: "خصوصية كاملة",
      description: "تحكم في خصوصية ملفاتك (عام أو خاص)"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-primary">MEDO STORAGE</h1>
            <div className="flex items-center gap-3">
              {user && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate("/dashboard")}
                  className="gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">ملفاتي</span>
                </Button>
              )}
              <MobileMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            MEDO STORAGE
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            منصة تخزين ملفاتك الشخصية بأمان مع إمكانية المشاركة السهلة
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="flex-1 flex flex-col items-center justify-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-2">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="min-h-[48px]">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Instructions */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">كيفية الاستخدام</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li>قم بإنشاء حساب جديد أو سجل الدخول إذا كان لديك حساب</li>
              <li>أنشئ مجلدات لتنظيم ملفاتك</li>
              <li>ارفع ملفاتك داخل المجلدات</li>
              <li>اختر خصوصية كل ملف (عام أو خاص)</li>
              <li>شارك الملفات العامة برابط مختصر مع امتداد الملف</li>
            </ol>
          </CardContent>
        </Card>

        {/* CTA */}
        {!user && (
          <div className="mt-8 flex gap-4">
            <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="gap-2">
              ابدأ الآن مجاناً
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Home;
