import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkeletonCard } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Footer } from "@/components/Footer";
import { User, Session } from "@supabase/supabase-js";
import { Home, Shield, LogOut, LogIn, UserCircle, ArrowRight, Folder, Plus, Share2, RefreshCw } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { CategoryCard } from "@/components/CategoryCard";
import logoMain from "@/assets/logo-main.png";
import { motion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

interface Semester {
  id: string;
  name: string;
  slug: string;
  semester_number: number;
}

const SemesterCategories = () => {
  const navigate = useNavigate();
  const { semesterId: semesterSlug } = useParams();
  const [semester, setSemester] = useState<Semester | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const { isAdmin } = useIsAdmin(user);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [fileCounts, setFileCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [levelName, setLevelName] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>("");

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSemester(), 
      semester ? fetchCategories() : Promise.resolve(),
      semester ? fetchFileCounts() : Promise.resolve()
    ]);
    setIsLoading(false);
    toast.success("تم تحديث البيانات");
  };

  const { isPulling, isRefreshing, pullDistance, shouldShowIndicator } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

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
    if (semesterSlug) {
      setIsLoading(true);
      fetchSemester();
    }
  }, [semesterSlug]);

  useEffect(() => {
    if (semester) {
      Promise.all([fetchCategories(), fetchFileCounts(), fetchLevelAndDepartmentNames()]).finally(() => 
        setIsLoading(false)
      );
    }
  }, [semester]);

  const fetchLevelAndDepartmentNames = async () => {
    if (!semester) return;
    
    const { data, error } = await supabase
      .from("semesters")
      .select("academic_levels(name, departments(name))")
      .eq("id", semester.id)
      .single();

    if (!error && data) {
      setLevelName(data.academic_levels?.name || "");
      setDepartmentName(data.academic_levels?.departments?.name || "");
    }
  };

  const fetchSemester = async () => {
    const { data, error } = await supabase
      .from("semesters")
      .select("*")
      .eq("slug", semesterSlug)
      .maybeSingle();

    if (error) {
      console.error("Error fetching semester:", error);
      toast.error("حدث خطأ في جلب بيانات الترم");
    } else {
      setSemester(data);
    }
  };

  const fetchCategories = async () => {
    if (!semester?.id) return;
    
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("semester_id", semester.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("حدث خطأ في جلب الفئات");
    } else {
      setCategories(data || []);
    }
  };

  const fetchFileCounts = async () => {
    if (!semester?.id) return;
    
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id")
      .eq("semester_id", semester.id);

    if (!categoriesData) return;

    const categoryIds = categoriesData.map(c => c.id);
    
    const { data, error } = await supabase
      .from("files")
      .select("category_id")
      .in("category_id", categoryIds);

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast.error("الرجاء إدخال اسم الفئة");
      return;
    }

    if (!semester?.id) {
      toast.error("لم يتم العثور على الترم");
      return;
    }

    setIsCreating(true);

    try {
      // Generate slug using AI translation
      const { data: slugData, error: slugError } = await supabase.functions.invoke('translate-to-slug', {
        body: { text: newCategoryName }
      });

      if (slugError) {
        console.error("Error generating slug:", slugError);
        toast.error("حدث خطأ في إنشاء الرابط");
        setIsCreating(false);
        return;
      }

      const { error } = await supabase
        .from("categories")
        .insert({
          name: newCategoryName,
          slug: slugData.slug,
          description: newCategoryDescription || null,
          semester_id: semester.id
        });

      if (error) throw error;

      toast.success("تم إنشاء الفئة بنجاح");
      setNewCategoryName("");
      setNewCategoryDescription("");
      setIsDialogOpen(false);
      fetchCategories();
      fetchFileCounts();
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error("حدث خطأ في إنشاء الفئة");
    } finally {
      setIsCreating(false);
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
        {/* Pull to Refresh Indicator */}
        {shouldShowIndicator && (
          <div 
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300"
            style={{ 
              opacity: isRefreshing ? 1 : pullDistance / 80,
              transform: `translateX(-50%) translateY(${Math.min(pullDistance / 2, 40)}px)`
            }}
          >
            <div className="bg-card border border-border rounded-full p-3 shadow-lg">
              <RefreshCw className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <img 
            src={logoMain} 
            alt="SONS OF TAIBA" 
            className="h-32 sm:h-40 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
          />
        </div>

        {/* Breadcrumbs */}
        {semester && departmentName && levelName && (
          <Breadcrumbs 
            items={[
              { label: "الرئيسية", href: "/" },
              { label: departmentName },
              { label: levelName },
              { label: semester.name }
            ]}
          />
        )}

        <div className="mb-6">
          {isAdmin ? (
            <div className="grid grid-cols-3 gap-4">
              <Button
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>

              <Button 
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('تم نسخ رابط الترم');
                }}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                مشاركة
              </Button>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    إضافة
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle>إضافة فئة جديدة</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم الفئة (المادة)</Label>
                      <Input
                        id="name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="مثال: برمجة 1، رياضيات 2، إلخ"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">الوصف (اختياري)</Label>
                      <Textarea
                        id="description"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        placeholder="وصف المادة"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setNewCategoryName('');
                          setNewCategoryDescription('');
                        }}
                      >
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? "جاري الإنشاء..." : "إنشاء"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                رجوع
              </Button>

              <Button 
                onClick={() => {
                  const url = window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('تم نسخ رابط الترم');
                }}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                مشاركة
              </Button>
            </div>
          )}
        </div>

        {semester && (
          <h1 className="text-3xl font-bold text-center mb-8">{semester.name}</h1>
        )}

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                description={category.description}
                fileCount={fileCounts[category.id] || 0}
                onClick={() => navigate(`/${semester.slug}/categories/${category.slug || category.id}`)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
              <Folder className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              لم يتم إضافة مواد حالياً
            </h3>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default SemesterCategories;
