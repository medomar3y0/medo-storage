import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Footer } from "@/components/Footer";
import { MobileMenu } from "@/components/MobileMenu";
import { User, Session } from "@supabase/supabase-js";
import { Eye, EyeOff, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { changePasswordSchema, changeUsernameSchema } from "@/lib/authValidation";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [passwordForUsername, setPasswordForUsername] = useState("");
  const [showPasswordForUsername, setShowPasswordForUsername] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        // Fetch username when user is logged in
        fetchUsername(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchUsername(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUsername = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      setUsername(data.username || "");
    }

    // Fetch user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (!rolesError && rolesData) {
      setUserRoles(rolesData.map(r => r.role));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password data
    const validationResult = changePasswordSchema.safeParse({ 
      newPassword, 
      confirmPassword 
    });
    
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("تم تغيير كلمة المرور بنجاح");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate username data
    const validationResult = changeUsernameSchema.safeParse({ 
      username: newUsername, 
      password: passwordForUsername 
    });
    
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }

    if (newUsername === username) {
      toast.error("اسم المستخدم الجديد مطابق للقديم");
      return;
    }

    setLoading(true);

    try {
      // Verify password first
      if (!user?.email) throw new Error("لم يتم العثور على البريد الإلكتروني");
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForUsername,
      });

      if (signInError) {
        toast.error("كلمة المرور غير صحيحة");
        setLoading(false);
        return;
      }

      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", newUsername)
        .maybeSingle();

      if (existingUser) {
        toast.error("اسم المستخدم مستخدم بالفعل");
        setLoading(false);
        return;
      }

      // Update username
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success("تم تغيير اسم المستخدم بنجاح");
      setUsername(newUsername);
      setNewUsername("");
      setPasswordForUsername("");
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تغيير اسم المستخدم");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("هل أنت متأكد من حذف حسابك؟ هذا الإجراء لا يمكن التراجع عنه!")) {
      return;
    }

    if (!confirm("تحذير: سيتم حذف حسابك وجميع بياناتك نهائياً. هل تريد المتابعة؟")) {
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error("لم يتم العثور على معرف المستخدم");
      }

      // Call edge function to delete user
      const { error: deleteError } = await supabase.functions.invoke("delete-user", {
        body: { userId: user.id },
      });

      if (deleteError) throw deleteError;

      // Sign out
      await supabase.auth.signOut();
      
      toast.success("تم حذف الحساب بنجاح");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "حدث خطأ أثناء حذف الحساب");
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-lg font-bold text-primary">الملف الشخصي</h1>
            <MobileMenu />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-6 w-6" />
                معلومات الحساب
              </CardTitle>
              <CardDescription>بيانات حسابك الشخصية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label>اسم المستخدم</Label>
                <Input
                  value={username || "لم يتم تعيين اسم مستخدم"}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label>الصلاحيات</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userRoles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">لا توجد صلاحيات</span>
                  ) : (
                    userRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {role === "admin" && "مدير"}
                        {role === "moderator" && "محرر"}
                        {role === "downloader" && "محمل"}
                        {role === "viewer" && "مشاهد"}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label>تاريخ الإنشاء</Label>
                <Input
                  value={new Date(user.created_at).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  disabled
                  className="bg-muted/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Change Username Card */}
          <Card>
            <CardHeader>
              <CardTitle>تغيير اسم المستخدم</CardTitle>
              <CardDescription>قم بتحديث اسم المستخدم الخاص بك</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangeUsername} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUsername">اسم المستخدم الجديد</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم الجديد"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordForUsername">كلمة المرور للتأكيد</Label>
                  <div className="relative">
                    <Input
                      id="passwordForUsername"
                      type={showPasswordForUsername ? "text" : "password"}
                      value={passwordForUsername}
                      onChange={(e) => setPasswordForUsername(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPasswordForUsername(!showPasswordForUsername)}
                    >
                      {showPasswordForUsername ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "جاري التحديث..." : "تحديث اسم المستخدم"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>تغيير كلمة المرور</CardTitle>
              <CardDescription>قم بتحديث كلمة المرور الخاصة بك</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="أدخل كلمة المرور الجديدة"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="أعد إدخال كلمة المرور الجديدة"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">منطقة الخطر</CardTitle>
              <CardDescription>حذف الحساب نهائياً - هذا الإجراء لا يمكن التراجع عنه</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full"
              >
                {loading ? "جاري الحذف..." : "حذف الحساب نهائياً"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
