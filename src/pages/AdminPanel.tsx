import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { 
  Users, FileText, Search, 
  ChevronLeft, Download, Eye, Folder, File, UserCircle, 
  Trash2, Mail, Shield, Bell, Send
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  roles: string[];
}

interface UserFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  file_extension: string | null;
  share_code: string | null;
  is_public: boolean;
  created_at: string;
}

interface UserFolder {
  id: string;
  name: string;
  created_at: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, loading: isLoadingAdmin } = useIsAdmin(user);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userFiles, setUserFiles] = useState<UserFile[]>([]);
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalFiles: 0, totalFolders: 0 });
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const { t, language } = useLanguage();

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

  useEffect(() => {
    // Only redirect if we have a user, admin check is complete, and user is NOT admin
    // Add a small delay to ensure the check has completed
    if (user && !isLoadingAdmin && !isAdmin) {
      const timer = setTimeout(() => {
        toast.error("ليس لديك صلاحية الوصول");
        navigate("/dashboard");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAdmin, isLoadingAdmin, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchStats();
    }
  }, [isAdmin]);

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    
    setSendingBroadcast(true);
    try {
      const response = await supabase.functions.invoke('send-notification', {
        body: {
          broadcast: true,
          title: broadcastTitle,
          message: broadcastMessage,
          type: "info"
        }
      });

      if (response.error) {
        throw response.error;
      }

      toast.success(t('notificationSentToAll'));
      setBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error(t('notificationFailed'));
    } finally {
      setSendingBroadcast(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("يرجى تسجيل الدخول مجدداً");
        return;
      }

      const response = await supabase.functions.invoke('list-users', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (response.error) {
        console.error("Error fetching users:", response.error);
        toast.error("فشل تحميل المستخدمين");
      } else if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("فشل تحميل المستخدمين");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const [usersRes, filesRes, foldersRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: 'exact' }),
      supabase.from("user_files").select("id", { count: 'exact' }),
      supabase.from("user_folders").select("id", { count: 'exact' })
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      totalFiles: filesRes.count || 0,
      totalFolders: foldersRes.count || 0
    });
  };

  const fetchUserData = async (userId: string) => {
    const [filesRes, foldersRes] = await Promise.all([
      supabase
        .from("user_files")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_folders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ]);

    setUserFiles(filesRes.data || []);
    setUserFolders(foldersRes.data || []);
  };

  const handleSelectUser = (adminUser: AdminUser) => {
    setSelectedUser(adminUser);
    fetchUserData(adminUser.id);
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
    } catch (error) {
      toast.error("فشل تحميل الملف");
    }
  };

  const deleteFile = async (file: UserFile) => {
    if (!window.confirm(`هل أنت متأكد من حذف الملف "${file.name}"؟`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      // Send notification to file owner
      if (selectedUser) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              userId: selectedUser.id,
              title: "تم حذف ملف",
              message: `تم حذف ملفك "${file.name}" بواسطة المدير`,
              type: "warning",
              metadata: { fileName: file.name, deletedBy: user?.email }
            }
          });
        } catch (notifError) {
          console.error("Failed to send notification:", notifError);
        }
      }

      toast.success("تم حذف الملف بنجاح");
      if (selectedUser) {
        fetchUserData(selectedUser.id);
      }
      fetchStats();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("فشل حذف الملف");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مسؤول';
      case 'moderator':
        return 'مشرف';
      case 'user':
        return 'مستخدم';
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(u => 
    (u.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoadingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Header title="لوحة التحكم" />

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground">المستخدمين</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalFiles}</p>
                  <p className="text-sm text-muted-foreground">الملفات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Folder className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalFolders}</p>
                  <p className="text-sm text-muted-foreground">المجلدات</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Broadcast Notification Button */}
        <div className="mb-6">
          <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Bell className="h-4 w-4" />
                {t('broadcastNotification')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('broadcastNotification')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="broadcastTitle">{t('notificationTitle')}</Label>
                  <Input
                    id="broadcastTitle"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder={t('notificationTitle')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broadcastMessage">{t('notificationMessage')}</Label>
                  <Textarea
                    id="broadcastMessage"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder={t('notificationMessage')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={sendBroadcastNotification} 
                  disabled={sendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendingBroadcast ? t('sending') : t('send')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!selectedUser ? (
          /* Users List */
          <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-semibold">المستخدمين</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالإيميل أو اسم المستخدم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">جاري تحميل المستخدمين...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((adminUser, index) => (
                  <motion.div
                    key={adminUser.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => handleSelectUser(adminUser)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <UserCircle className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{adminUser.username || "بدون اسم"}</p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{adminUser.email}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {adminUser.roles.length > 0 ? (
                                adminUser.roles.map((role) => (
                                  <Badge key={role} variant={getRoleBadgeVariant(role) as any} className="text-xs">
                                    {getRoleLabel(role)}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-xs">مستخدم</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(adminUser.created_at).toLocaleDateString('ar')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* User Details */
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedUser(null)}
              className="gap-2 mb-6"
            >
              <ChevronLeft className="h-4 w-4" />
              العودة للمستخدمين
            </Button>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p>{selectedUser.username || "بدون اسم"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-normal text-muted-foreground">{selectedUser.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedUser.roles.length > 0 ? (
                        selectedUser.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role) as any} className="text-xs">
                            {getRoleLabel(role)}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">مستخدم</Badge>
                      )}
                    </div>
                    <p className="text-sm font-normal text-muted-foreground mt-2">
                      {userFiles.length} ملف • {userFolders.length} مجلد
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>

            {/* User Folders */}
            {userFolders.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium mb-4">المجلدات</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {userFolders.map((folder) => (
                    <Card key={folder.id}>
                      <CardContent className="p-4 flex flex-col items-center">
                        <Folder className="h-10 w-10 text-primary mb-2" />
                        <p className="text-sm text-center truncate w-full">{folder.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* User Files */}
            <div>
              <h3 className="text-lg font-medium mb-4">الملفات</h3>
              {userFiles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userFiles.map((file) => (
                    <Card key={file.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3 mb-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <File className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.file_size)} • {file.is_public ? "عام" : "خاص"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewFile(file)} className="flex-1 gap-1">
                            <Eye className="h-4 w-4" />
                            معاينة
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => downloadFile(file)} className="flex-1 gap-1">
                            <Download className="h-4 w-4" />
                            تحميل
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteFile(file)}
                            className="gap-1 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد ملفات لهذا المستخدم</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AdminPanel;
