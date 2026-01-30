import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileItem } from "@/components/FileItem";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SkeletonCard } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Download, Share2, Home, Shield, LogOut, LogIn, Upload, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { User } from "@supabase/supabase-js";
import logoMain from "@/assets/logo-main.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { validateFiles } from "@/lib/fileValidation";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface File {
  id: string;
  name: string;
  file_path: string;
  file_size?: number;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
}

interface EditCategoryData {
  name: string;
  description: string;
}


interface ParentCategory {
  name: string;
}

const CategoryFiles = () => {
  const { semesterId: semesterSlug, categoryId: categorySlug } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin } = useIsAdmin(user);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<EditCategoryData>({ name: '', description: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [semesterName, setSemesterName] = useState<string>("");
  const [levelName, setLevelName] = useState<string>("");
  const [departmentName, setDepartmentName] = useState<string>("");

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchCategory(), category ? fetchFiles() : Promise.resolve()]);
    setIsLoading(false);
    toast.success("تم تحديث البيانات");
  };

  const { isPulling, isRefreshing, pullDistance, shouldShowIndicator } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  useEffect(() => {
    if (categorySlug) {
      setIsLoading(true);
      fetchCategory();
    }
  }, [categorySlug]);

  useEffect(() => {
    if (category) {
      fetchFiles().finally(() => setIsLoading(false));
      fetchSemesterName();
    }
  }, [category]);

  const fetchSemesterName = async () => {
    if (!category) return;
    
    const { data, error } = await supabase
      .from("categories")
      .select(`
        semesters(
          name, 
          slug,
          academic_levels(
            name,
            departments(name)
          )
        )
      `)
      .eq("id", category.id)
      .single();

    if (!error && data) {
      setSemesterName(data.semesters?.name || "");
      setLevelName(data.semesters?.academic_levels?.name || "");
      setDepartmentName(data.semesters?.academic_levels?.departments?.name || "");
    }
  };

  const fetchCategory = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (error) {
      toast.error("حدث خطأ في جلب الفئة");
      return;
    }

    setCategory(data);
  };

  const fetchFiles = async () => {
    if (!category?.id) return;
    
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .eq("category_id", category.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("حدث خطأ في جلب الملفات");
      return;
    }

    setFiles(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !category?.id) {
      toast.error("الرجاء اختيار ملف");
      return;
    }

    // Validate files
    const validationResult = validateFiles(selectedFile);
    if (!validationResult.valid) {
      validationResult.errors.forEach(error => toast.error(error));
      return;
    }

    setIsUploading(true);
    const filesArray = Array.from(selectedFile as FileList);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of filesArray) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${category.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { error: dbError } = await supabase
            .from('files')
            .insert({
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              category_id: category.id
            });

          if (dbError) throw dbError;
          successCount++;
        } catch (error) {
          console.error("Error uploading file:", error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`تم رفع ${successCount} ملف بنجاح`);
      }
      if (failCount > 0) {
        toast.error(`فشل رفع ${failCount} ملف`);
      }
      
      setSelectedFile(null);
      setIsUploadDialogOpen(false);
      fetchFiles();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast.error("حدث خطأ في رفع الملفات");
    } finally {
      setIsUploading(false);
    }
  };


  const handleDownloadAll = async () => {
    if (files.length === 0) {
      toast.error("لا توجد ملفات للتحميل");
      return;
    }

    toast.info("جاري إنشاء الملف المضغوط...");

    try {
      const zip = new JSZip();

      for (const file of files) {
        const { data, error } = await supabase.storage
          .from('files')
          .download(file.file_path);

        if (error) throw error;

        zip.file(file.name, data);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${category?.name || 'files'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("تم تحميل الملف المضغوط");
    } catch (error) {
      console.error('Error creating zip:', error);
      toast.error("حدث خطأ في إنشاء الملف المضغوط");
    }
  };

  const handleShareCategory = () => {
    const categoryUrl = window.location.href;
    navigator.clipboard.writeText(categoryUrl);
    toast.success('تم نسخ رابط الفئة');
  };

  const handleEditCategory = async () => {
    if (!category?.id || !editData.name.trim()) {
      toast.error("يرجى إدخال اسم الفئة");
      return;
    }

    setIsUploading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: editData.name,
          description: editData.description
        })
        .eq("id", category.id);

      if (error) throw error;

      toast.success("تم تحديث الفئة بنجاح");
      setIsEditDialogOpen(false);
      fetchCategory();
    } catch (error: any) {
      console.error("Error updating category:", error);
      toast.error("حدث خطأ في تحديث الفئة");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!category?.id) return;

    if (!confirm("هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع الملفات المرتبطة بها.")) {
      return;
    }

    setIsUploading(true);
    try {
      // Delete all files in storage
      const { data: files } = await supabase
        .from("files")
        .select("file_path")
        .eq("category_id", category.id);

      if (files) {
        for (const file of files) {
          await supabase.storage.from("files").remove([file.file_path]);
        }
      }

      // Delete file records
      await supabase.from("files").delete().eq("category_id", category.id);

      // Delete category
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast.success("تم حذف الفئة بنجاح");
      navigate(-1);
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error("حدث خطأ في حذف الفئة");
    } finally {
      setIsUploading(false);
    }
  };

  const openEditDialog = () => {
    if (category) {
      setEditData({
        name: category.name,
        description: category.description || ''
      });
      setIsEditDialogOpen(true);
    }
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
        {category && semesterName && levelName && departmentName && (
          <Breadcrumbs 
            items={[
              { label: "الرئيسية", href: "/" },
              { label: departmentName },
              { label: levelName },
              { label: semesterName, href: `/${semesterSlug}` },
              { label: category.name }
            ]}
          />
        )}

        {/* Category Header */}
        {category && (
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {category.description}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 mb-8">
          {/* Admin Buttons Row */}
          {isAdmin && (
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button 
                variant="default"
                onClick={openEditDialog} 
                className="gap-2 w-full"
              >
                <Edit className="w-4 h-4" />
                <span>تعديل</span>
              </Button>
              <Button 
                variant="default"
                onClick={handleDeleteCategory} 
                className="gap-2 w-full"
                disabled={isUploading}
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </Button>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2 w-full">
                    <Upload className="w-4 h-4" />
                    <span>رفع</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle>رفع ملفات جديدة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="file">اختر الملفات</Label>
                      <Input
                        id="file"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="*/*"
                        multiple
                      />
                    </div>
                    
                    {selectedFile && selectedFile.length > 0 && (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm">الملفات المختارة ({selectedFile.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {Array.from(selectedFile).map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-background rounded-md border">
                              <div className="flex-1 min-w-0 ml-3">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} ميجابايت
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsUploadDialogOpen(false);
                          setSelectedFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="flex-1"
                      >
                        إلغاء
                      </Button>
                      <Button 
                        onClick={handleUploadFile} 
                        disabled={!selectedFile || isUploading}
                        className="flex-1"
                      >
                        {isUploading ? "جاري الرفع..." : "تأكيد الرفع"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
            </div>
          )}
          
          {/* General Buttons Row */}
          <div className={`grid gap-2 w-full ${files.length > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Button 
              onClick={() => window.history.back()} 
              className="gap-2 w-full"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع</span>
            </Button>
            <Button 
              variant="default"
              onClick={handleShareCategory} 
              className="gap-2 w-full"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة</span>
            </Button>
            {files.length > 0 && (
              <Button 
                variant="default"
                onClick={handleDownloadAll} 
                className="gap-2 w-full"
              >
                <Download className="w-4 h-4" />
                <span>تحميل الكل</span>
              </Button>
            )}
          </div>
          
          {/* Edit Dialog */}
          {isAdmin && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>تعديل الفئة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryName">اسم الفئة</Label>
                    <Input
                      id="categoryName"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="أدخل اسم الفئة"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryDescription">الوصف</Label>
                    <Textarea
                      id="categoryDescription"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="أدخل وصف الفئة (اختياري)"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button 
                      onClick={handleEditCategory} 
                      disabled={!editData.name.trim() || isUploading}
                    >
                      {isUploading ? "جاري التحديث..." : "تحديث"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Files List */}
        <div className="space-y-4">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : files.length === 0 ? (
            <div className="text-center py-16 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                <Download className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">لا توجد ملفات في هذه الفئة</p>
            </div>
          ) : (
            files.map((file, index) => (
              <FileItem
                key={file.id}
                id={file.id}
                name={file.name}
                filePath={file.file_path}
                fileSize={file.file_size}
                isAdmin={isAdmin}
                onDelete={fetchFiles}
                index={index}
              />
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CategoryFiles;