import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CategoryCard } from "@/components/CategoryCard";
import { Footer } from "@/components/Footer";
import { User, Session } from "@supabase/supabase-js";
import logoMain from "@/assets/logo-main.png";
import { Home, Shield, LogOut, LogIn, UserCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { motion } from "framer-motion";

interface Category {
  id: string;
  name: string;
  description?: string;
  semester_id?: string | null;
}

interface FileCount {
  category_id: string;
  count: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { isAdmin } = useIsAdmin(user);

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
    fetchCategories();
    fetchFileCounts();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchFileCounts = async () => {
    const { data, error } = await supabase
      .from("files")
      .select("category_id");

    if (error) {
      console.error("Error fetching file counts:", error);
    } else {
      const counts: Record<string, number> = {};
      data?.forEach((file) => {
        counts[file.category_id] = (counts[file.category_id] || 0) + 1;
      });
      setFileCounts(counts);
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
            <div className="flex gap-3">
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

            <div className="flex items-center gap-3">
              <ThemeToggle />
              {user ? (
                <Button
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">تسجيل الخروج</span>
                </Button>
              ) : (
                <Button
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
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Logo */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <img 
            src={logoMain} 
            alt="SONS OF TAIBA" 
            className="h-32 sm:h-40 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Categories Grid */}
        {categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  ease: "easeOut" 
                }}
              >
                <CategoryCard
                  name={category.name}
                  description={category.description}
                  fileCount={fileCounts[category.id] || 0}
                  onClick={() => navigate(`/category/${category.id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
              <svg
                className="w-10 h-10 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لا توجد فئات متاحة حالياً
            </h3>
            <p className="text-muted-foreground">
              {user && isAdmin
                ? "ابدأ بإضافة فئة جديدة من لوحة التحكم"
                : "سيتم إضافة الفئات قريباً"}
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Index;
