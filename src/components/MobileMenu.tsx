import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Home, 
  FolderOpen, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Shield,
  User as UserIcon
} from "lucide-react";
import { toast } from "sonner";

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin(user);
  const { t } = useLanguage();

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success(t('logoutSuccess'));
    setOpen(false);
    navigate("/");
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Menu className="h-6 w-6" />
          <span className="sr-only">{t('menu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-right">{t('menu')}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-2">
          {/* Home */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={() => handleNavigate("/")}
          >
            <Home className="h-5 w-5" />
            {t('home')}
          </Button>

          {user ? (
            <>
              {/* Dashboard / My Files */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate("/dashboard")}
              >
                <FolderOpen className="h-5 w-5" />
                {t('myFiles')}
              </Button>

              {/* Profile */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate("/profile")}
              >
                <UserIcon className="h-5 w-5" />
                {t('profile')}
              </Button>

              {/* Admin Panel */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={() => handleNavigate("/admin")}
                >
                  <Shield className="h-5 w-5" />
                  {t('adminPanel')}
                </Button>
              )}

              {/* Logout */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              {/* Login */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate("/auth")}
              >
                <LogIn className="h-5 w-5" />
                {t('login')}
              </Button>

              {/* Signup */}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate("/auth?signup=true")}
              >
                <UserPlus className="h-5 w-5" />
                {t('signup')}
              </Button>
            </>
          )}

          {/* Theme & Language */}
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('theme')}</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('language')}</span>
              <LanguageSelector />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
