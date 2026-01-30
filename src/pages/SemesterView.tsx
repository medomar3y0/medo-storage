import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { toast } from "sonner";
import { User, Session } from "@supabase/supabase-js";
import { Home, Shield, LogOut, LogIn, UserCircle, ArrowRight, Calendar, Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import logoMain from "@/assets/logo-main.png";
import { motion } from "framer-motion";

interface Semester {
  id: string;
  name: string;
  slug: string;
  semester_number: number;
}

interface AcademicLevel {
  id: string;
  name: string;
  slug: string;
  level_number: number;
}

const getLevelName = (levelNumber: number) => {
  const arabicNumbers: { [key: number]: string } = {
    1: "الأول",
    2: "الثاني",
    3: "الثالث",
    4: "الرابع",
    5: "الخامس",
    6: "السادس",
    7: "السابع",
    8: "الثامن",
  };
  return `المستوى ${arabicNumbers[levelNumber] || levelNumber}`;
};

const SemesterView = () => {
  const navigate = useNavigate();
  const { levelId: levelSlug } = useParams();
  const [level, setLevel] = useState<AcademicLevel | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { isAdmin } = useIsAdmin(user);
  const [departmentName, setDepartmentName] = useState<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (levelSlug) {
      fetchLevel();
    }
  }, [levelSlug]);

  useEffect(() => {
    if (level) {
      fetchSemesters();
      fetchDepartmentName();
    }
  }, [level]);

  const fetchDepartmentName = async () => {
    if (!level) return;
    
    const { data, error } = await supabase
      .from("academic_levels")
      .select("departments(name)")
      .eq("id", level.id)
      .single();

    if (!error && data) {
      setDepartmentName(data.departments?.name || "");
    }
  };

  const fetchLevel = async () => {
    const { data, error } = await supabase
      .from("academic_levels")
      .select("*")
      .eq("slug", levelSlug)
      .maybeSingle();

    if (error) {
      console.error("Error fetching level:", error);
    } else {
      setLevel(data);
    }
  };

  const fetchSemesters = async () => {
    if (!level?.id) return;
    
    const { data, error } = await supabase
      .from("semesters")
      .select("*")
      .eq("academic_level_id", level.id)
      .order("semester_number");

    if (error) {
      console.error("Error fetching semesters:", error);
    } else {
      setSemesters(data || []);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2 hover:bg-accent/10"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2 hover:bg-accent/10"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </Button>
              )}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/profile")}
                  className="gap-2 hover:bg-accent/10"
                >
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">الملف الشخصي</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Logo */}
        <div className="flex justify-center mb-10 sm:mb-14">
          <img 
            src={logoMain} 
            alt="SONS OF TAIBA" 
            className="h-32 sm:h-40 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Breadcrumbs */}
        {level && departmentName && (
          <Breadcrumbs 
            items={[
              { label: "الرئيسية", href: "/" },
              { label: departmentName },
              { label: getLevelName(level.level_number) }
            ]}
          />
        )}

        <div className="mb-10 flex justify-between items-center gap-4 flex-wrap">
          <Button
            onClick={() => window.history.back()}
            className="gap-2 shrink-0"
          >
            <ArrowRight className="h-4 w-4" />
            رجوع
          </Button>
          
          <Button 
            variant="default"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              toast.success('تم نسخ رابط الترمات');
            }}
            className="gap-2 shrink-0"
          >
            <Share2 className="h-4 w-4" />
            مشاركة
          </Button>
        </div>

        {level && (
          <h1 className="text-3xl font-bold text-center mb-8">{getLevelName(level.level_number)}</h1>
        )}

        {/* Semesters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {semesters.map((semester, index) => (
            <motion.div
              key={semester.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.4, 
                delay: index * 0.1,
                ease: "easeOut" 
              }}
            >
              <Card
                onClick={() => navigate(`/${semester.slug}/categories`)}
                className="group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/50 hover:scale-[1.02] hover:ring-2 hover:ring-primary/20 bg-card/80 backdrop-blur-sm relative h-full"
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-500 flex items-center justify-center shrink-0">
                      <span className="text-2xl font-bold text-primary group-hover:scale-110 transition-all duration-500 drop-shadow-sm">{semester.semester_number}</span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
                      {semester.name}
                    </CardTitle>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SemesterView;
