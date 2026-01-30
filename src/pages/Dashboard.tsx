import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { 
  Home, LogOut, FolderPlus, Upload, Folder, File, 
  Trash2, Share2, Download, Eye, Copy, Link, 
  ChevronLeft, UserCircle, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface UserFolder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface UserFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  file_extension: string | null;
  share_code: string | null;
  is_public: boolean;
  folder_id: string | null;
  user_id: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<UserFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const { isAdmin } = useIsAdmin(user);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchFolders = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching folders:", error);
    } else {
      setFolders(data || []);
    }
  }, [user]);

  const fetchFiles = useCallback(async (folderId: string | null) => {
    if (!user) return;
    
    let query = supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (folderId) {
      query = query.eq("folder_id", folderId);
    } else {
      query = query.is("folder_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching files:", error);
    } else {
      setFiles(data || []);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFolders();
      fetchFiles(currentFolder?.id || null);
    }
  }, [user, currentFolder, fetchFolders, fetchFiles]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    
    setIsCreatingFolder(true);
    
    const { error } = await supabase
      .from("user_folders")
      .insert({
        name: newFolderName.trim(),
        user_id: user.id
      });

    if (error) {
      toast.error("فشل إنشاء المجلد");
      console.error(error);
    } else {
      toast.success("تم إنشاء المجلد بنجاح");
      setNewFolderName("");
      setFolderDialogOpen(false);
      fetchFolders();
    }
    
    setIsCreatingFolder(false);
  };

  const deleteFolder = async (folderId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المجلد وجميع ملفاته؟")) return;

    const { error } = await supabase
      .from("user_folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      toast.error("فشل حذف المجلد");
    } else {
      toast.success("تم حذف المجلد بنجاح");
      fetchFolders();
      if (currentFolder?.id === folderId) {
        setCurrentFolder(null);
      }
    }
  };

  const generateShareCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    setUploading(true);
    const uploadedFiles = Array.from(e.target.files);
    
    for (const file of uploadedFiles) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const shareCode = generateShareCode();

        const { error: dbError } = await supabase
          .from("user_files")
          .insert({
            user_id: user.id,
            folder_id: currentFolder?.id || null,
            name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            file_extension: fileExt,
            share_code: shareCode,
            is_public: false
          });

        if (dbError) throw dbError;
        
        toast.success(`تم رفع ${file.name} بنجاح`);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(`فشل رفع ${file.name}`);
      }
    }
    
    setUploading(false);
    fetchFiles(currentFolder?.id || null);
    e.target.value = '';
  };

  const deleteFile = async (file: UserFile) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الملف؟")) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast.success("تم حذف الملف بنجاح");
      fetchFiles(currentFolder?.id || null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("فشل حذف الملف");
    }
  };

  const toggleFilePublic = async (file: UserFile) => {
    const { error } = await supabase
      .from("user_files")
      .update({ is_public: !file.is_public })
      .eq("id", file.id);

    if (error) {
      toast.error("فشل تحديث إعدادات الملف");
    } else {
      toast.success(file.is_public ? "الملف الآن خاص" : "الملف الآن عام");
      fetchFiles(currentFolder?.id || null);
    }
  };

  const copyShareLink = (file: UserFile) => {
    const link = `${window.location.origin}/s/${file.share_code}.${file.file_extension}`;
    navigator.clipboard.writeText(link);
    toast.success("تم نسخ الرابط");
  };

  const viewFile = async (file: UserFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast.error("فشل فتح الملف");
    }
  };

  const downloadFile = async (file: UserFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الملف");
    } catch (error) {
      toast.error("فشل تحميل الملف");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">لوحة الأدمن</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="gap-2"
              >
                <UserCircle className="h-4 w-4" />
                <span className="hidden sm:inline">الملف الشخصي</span>
              </Button>
            </div>

            <h1 className="text-lg font-bold text-primary">MEDO STORAGE</h1>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            {currentFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(null)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                العودة
              </Button>
            )}
            <h2 className="text-xl font-semibold">
              {currentFolder ? currentFolder.name : "ملفاتي"}
            </h2>
          </div>
          
          <div className="flex gap-2">
            {!currentFolder && (
              <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FolderPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">مجلد جديد</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إنشاء مجلد جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="folderName">اسم المجلد</Label>
                      <Input
                        id="folderName"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="أدخل اسم المجلد"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={createFolder} disabled={isCreatingFolder || !newFolderName.trim()}>
                      {isCreatingFolder ? "جاري الإنشاء..." : "إنشاء"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Label className="cursor-pointer">
              <Button variant="default" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{uploading ? "جاري الرفع..." : "رفع ملف"}</span>
                </span>
              </Button>
              <Input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
          </div>
        </div>

        {/* Folders Grid (only show if not in a folder) */}
        {!currentFolder && folders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">المجلدات</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all group"
                    onClick={() => setCurrentFolder(folder)}
                  >
                    <CardContent className="p-4 flex flex-col items-center">
                      <Folder className="h-12 w-12 text-primary mb-2" />
                      <p className="text-sm font-medium text-center truncate w-full">{folder.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Files Grid */}
        <div>
          <h3 className="text-lg font-medium mb-4">الملفات</h3>
          {files.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <File className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm truncate">{file.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Privacy Toggle */}
                      <div className="flex items-center justify-between mb-4 p-2 rounded-lg bg-muted/50">
                        <Label htmlFor={`public-${file.id}`} className="text-sm cursor-pointer">
                          {file.is_public ? "عام" : "خاص"}
                        </Label>
                        <Switch
                          id={`public-${file.id}`}
                          checked={file.is_public}
                          onCheckedChange={() => toggleFilePublic(file)}
                        />
                      </div>

                      {/* Share Link */}
                      {file.share_code && (
                        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/30">
                          <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                          <code className="text-xs truncate flex-1">
                            /s/{file.share_code}.{file.file_extension}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyShareLink(file)}
                            className="shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewFile(file)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadFile(file)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyShareLink(file)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteFile(file)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
                <File className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">لا توجد ملفات</h3>
              <p className="text-muted-foreground">
                ابدأ برفع ملفاتك هنا
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
