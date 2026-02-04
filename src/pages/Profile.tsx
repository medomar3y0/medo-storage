import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { User, Session } from "@supabase/supabase-js";
import { Eye, EyeOff, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { changePasswordSchema, changeUsernameSchema } from "@/lib/authValidation";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();

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

      toast.success(t('passwordUpdatedSuccess'));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || t('error'));
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
      toast.error(t('usernameSameAsOld'));
      return;
    }

    setLoading(true);

    try {
      // Verify password first
      if (!user?.email) throw new Error(t('emailNotFound'));
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordForUsername,
      });

      if (signInError) {
        toast.error(t('wrongPassword'));
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
        toast.error(t('usernameAlreadyTaken'));
        setLoading(false);
        return;
      }

      // Update username
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast.success(t('usernameUpdatedSuccess'));
      setUsername(newUsername);
      setNewUsername("");
      setPasswordForUsername("");
    } catch (error: any) {
      toast.error(error.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t('deleteAccountConfirm'))) {
      return;
    }

    if (!confirm(t('deleteAccountFinalConfirm'))) {
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error(t('userIdNotFound'));
      }

      // Call edge function to delete user
      const { error: deleteError } = await supabase.functions.invoke("delete-user", {
        body: { userId: user.id },
      });

      if (deleteError) throw deleteError;

      // Sign out
      await supabase.auth.signOut();
      
      toast.success(t('accountDeletedSuccess'));
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || t('error'));
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin": return t('admin');
      case "moderator": return t('moderator');
      case "downloader": return t('downloader');
      case "viewer": return t('viewer');
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Header title={t('profile')} />

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="space-y-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-6 w-6" />
                {t('accountInfo')}
              </CardTitle>
              <CardDescription>{t('yourPersonalData')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('email')}</Label>
                <Input
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label>{t('username')}</Label>
                <Input
                  value={username || t('usernameNotSet')}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label>{t('permissions')}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userRoles.length === 0 ? (
                    <span className="text-sm text-muted-foreground">{t('noPermissions')}</span>
                  ) : (
                    userRoles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {getRoleName(role)}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label>{t('createdAt')}</Label>
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
              <CardTitle>{t('changeUsername')}</CardTitle>
              <CardDescription>{t('updateYourUsername')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangeUsername} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUsername">{t('newUsername')}</Label>
                  <Input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={t('enterNewUsername')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordForUsername">{t('passwordConfirm')}</Label>
                  <div className="relative">
                    <Input
                      id="passwordForUsername"
                      type={showPasswordForUsername ? "text" : "password"}
                      value={passwordForUsername}
                      onChange={(e) => setPasswordForUsername(e.target.value)}
                      placeholder={t('enterCurrentPassword')}
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
                  {loading ? t('updating') : t('updateUsername')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('changePassword')}</CardTitle>
              <CardDescription>{t('updateYourPassword')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t('newPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder={t('enterNewPassword')}
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
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder={t('reenterNewPassword')}
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
                  {loading ? t('updating') : t('updatePassword')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">{t('dangerZone')}</CardTitle>
              <CardDescription>{t('deleteAccountWarning')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full"
              >
                {loading ? t('deleting') : t('deleteAccount')}
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
