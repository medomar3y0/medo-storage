import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Loader2, Trash2, FolderOpen, Upload, Plus, Home, Shield, LogOut, UserCircle, AlertCircle, Users, Edit, Activity } from "lucide-react";
import logoMain from "@/assets/logo-main.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useActivityLog } from "@/hooks/useActivityLog";
import { Badge } from "@/components/ui/badge";
import { validateFiles } from "@/lib/fileValidation";

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  parent_id?: string | null;
  semester_id?: string | null;
  semester_name?: string;
  semester_number?: number;
  semester_slug?: string;
  level_name?: string;
  level_number?: number;
  department_name?: string;
}

interface UserWithRole {
  id: string;
  email: string;
  username: string;
  name?: string;
  created_at: string;
  roles: string[];
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

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  const { logActivity } = useActivityLog();

  // Check authentication and admin status
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      setSession(session);
      setUser(session.user);

      // Check admin status
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
      
      setInitializing(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      
      setSession(session);
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAdmin === true) {
      fetchCategories();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("list-users");

      if (error) {
        console.error("Error fetching users:", error);
        toast.error("فشل في تحميل المستخدمين");
        return;
      }

      // Transform users to have roles as array
      const usersWithRoles = (data.users || []).map((u: any) => ({
        ...u,
        roles: u.roles || []
      }));
      
      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("فشل في تحميل المستخدمين");
    }
  };


  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select(`
        *,
        semesters!inner (
          name,
          slug,
          semester_number,
          academic_levels!inner (
            name,
            level_number,
            departments!inner (
              name
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("فشل في تحميل الفئات");
    } else {
      // Transform the nested data structure
      const transformedData = (data || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        parent_id: cat.parent_id,
        semester_id: cat.semester_id,
        semester_name: cat.semesters?.name,
        semester_slug: cat.semesters?.slug,
        semester_number: cat.semesters?.semester_number,
        level_name: cat.semesters?.academic_levels?.name,
        level_number: cat.semesters?.academic_levels?.level_number,
        department_name: cat.semesters?.academic_levels?.departments?.name,
      }));
      setCategories(transformedData);
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("يرجى إدخال اسم الفئة");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("categories")
      .insert([{ 
        name: categoryName, 
        description: categoryDescription
      }]);

    if (error) {
      toast.error("فشل في إنشاء الفئة");
    } else {
      toast.success("تم إنشاء الفئة بنجاح");
      setCategoryName("");
      setCategoryDescription("");
      fetchCategories();
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الملفات المرتبطة بها.")) {
      return;
    }

    setLoading(true);

    // Get category name for logging
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", categoryId)
      .single();

    // Delete all files in this category first
    const { data: files } = await supabase
      .from("files")
      .select("file_path")
      .eq("category_id", categoryId);

    if (files) {
      for (const file of files) {
        await supabase.storage.from("files").remove([file.file_path]);
      }
    }

    // Delete file records
    await supabase.from("files").delete().eq("category_id", categoryId);

    // Delete category
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("فشل في حذف الفئة");
    } else {
      // Log the activity
      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        user_email: user?.email,
        action_type: "delete_category",
        target_type: "category",
        target_id: categoryId,
        target_name: category?.name,
      });
      
      toast.success("تم حذف الفئة بنجاح");
      fetchCategories();
    }
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === user?.id) {
      toast.error("لا يمكنك حذف نفسك");
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف المستخدم ${userEmail}؟`)) {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast.error("حدث خطأ أثناء حذف المستخدم");
      } else {
        await logActivity({
          actionType: 'delete_user',
          targetType: 'user',
          targetId: userId,
          targetName: userEmail,
          details: { deleted_user_email: userEmail }
        });

        toast.success("تم حذف المستخدم بنجاح");
        fetchUsers();
      }
    }
  };


  const handleUploadFile = async () => {
    if (!selectedFiles || selectedFiles.length === 0 || !selectedCategoryId) {
      toast.error("يرجى اختيار ملف أو أكثر وفئة");
      return;
    }

    // Validate files
    const validationResult = validateFiles(selectedFiles);
    if (!validationResult.valid) {
      validationResult.errors.forEach(error => toast.error(error));
      return;
    }

    setLoading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${selectedCategoryId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(filePath, file);

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError);
          failCount++;
          continue;
        }

        const { error: dbError } = await supabase.from("files").insert([
          {
            name: file.name,
            file_path: filePath,
            category_id: selectedCategoryId,
            file_size: file.size,
            mime_type: file.type,
          },
        ]);

        if (dbError) {
          console.error(`Error saving ${file.name} to database:`, dbError);
          failCount++;
        } else {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم رفع ${successCount} ملف بنجاح`);
      }
      if (failCount > 0) {
        toast.error(`فشل رفع ${failCount} ملف`);
      }

      setSelectedFiles(null);
      setSelectedCategoryId("");
    } catch (error: any) {
      toast.error("فشل في رفع الملفات");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Show loading while checking authentication
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show unauthorized message if not admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mb-2">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">غير مصرح</CardTitle>
            <CardDescription>ليس لديك صلاحية للوصول إلى لوحة التحكم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button onClick={() => navigate("/")} className="w-full">
              العودة إلى الصفحة الرئيسية
            </Button>
            <Button onClick={handleLogout} className="w-full">
              تسجيل الخروج
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="gap-2 hover:bg-accent/10"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/admin")}
                className="gap-2 bg-accent/10"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate("/profile")}
                className="gap-2 hover:bg-accent/10"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">الملف الشخصي</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Logo */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <img 
            src={logoMain} 
            alt="SONS OF TAIBA Admin" 
            className="h-24 sm:h-32 w-auto object-contain drop-shadow-2xl"
          />
        </div>


        {/* Categories List */}
        <div>
          <h2 className="text-2xl font-bold mb-6">الفئات الحالية</h2>
          {categories.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">لا توجد فئات حالياً. ابدأ بإنشاء فئة جديدة.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Main Categories */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.filter(cat => !cat.parent_id).map((category) => (
                  <div key={category.id}>
                     <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.description && (
                          <CardDescription>{category.description}</CardDescription>
                        )}
                        {/* Department, Level, and Semester Info */}
                        {category.department_name && (
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground border-t pt-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">القسم:</span>
                              <span>{category.department_name}</span>
                            </div>
                            {category.level_number && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">المستوى:</span>
                                <span>{getLevelName(category.level_number)}</span>
                              </div>
                            )}
                            {category.semester_number && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">الترم:</span>
                                <span>الترم {category.semester_number === 1 ? 'الأول' : 'الثاني'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/${category.semester_slug}/categories/${category.slug || category.id}`)}
                          className="w-full gap-2"
                        >
                          <FolderOpen className="h-4 w-4" />
                          عرض الملفات
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                          disabled={loading}
                          className="w-full gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف الفئة
                        </Button>
                      </CardContent>
                    </Card>
                    
                    {/* Subcategories */}
                    {categories.filter(sub => sub.parent_id === category.id).length > 0 && (
                      <div className="mr-6 mt-2 space-y-2">
                        {categories.filter(sub => sub.parent_id === category.id).map((subCategory) => (
                          <Card key={subCategory.id} className="border-r-4 border-r-primary/30">
                            <CardHeader className="py-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{category.name} /</span>
                                {subCategory.name}
                              </CardTitle>
                              {subCategory.description && (
                                <CardDescription className="text-xs">{subCategory.description}</CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="py-2 space-y-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/${subCategory.semester_slug}/categories/${subCategory.slug || subCategory.id}`)}
                                className="w-full gap-2 h-8 text-xs"
                              >
                                <FolderOpen className="h-3 w-3" />
                                عرض الملفات
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteCategory(subCategory.id)}
                                disabled={loading}
                                className="w-full gap-2 h-8 text-xs"
                              >
                                <Trash2 className="h-3 w-3" />
                                حذف
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Users Management */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Users className="h-6 w-6" />
            إدارة المستخدمين
          </h2>
          {users.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">لا يوجد مستخدمين حالياً.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {users.map((userItem) => (
                <Card key={userItem.id}>
                  <CardContent className="p-6">
                    <div className="border rounded-lg p-4 cursor-default">
                      {/* Header with email */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-lg break-words">
                            {userItem.email}
                            {userItem.id === user?.id && (
                              <span className="text-xs text-muted-foreground mr-2">(أنت)</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {userItem.username || 'لا يوجد اسم مستخدم'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Date */}
                      <div className="text-xs text-muted-foreground mb-4">
                        📅 تاريخ الإنشاء: {new Date(userItem.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>

                      {/* Role Badge & Delete Button */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={userItem.email === "mohamednasrahmed@outlook.com" ? "default" : "secondary"}>
                          {userItem.email === "mohamednasrahmed@outlook.com" ? "مدير" : "مستخدم"}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(userItem.id, userItem.email)}
                          disabled={userItem.id === user?.id || loading}
                          className="gap-2"
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
