import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Home, ChevronLeft } from "lucide-react";
import logoLight from "@/assets/logo-light.png";
import logoDark from "@/assets/logo-dark.png";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLogo = mounted && theme === "dark" ? logoDark : logoLight;
  const isHomePage = location.pathname === '/';

  return (
    <header className="w-full bg-card/95 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 shadow-elegant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Back Button */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">رجوع</span>
            </Button>
          )}
          
          {/* Logo */}
          <button 
            onClick={() => navigate("/")}
            className="group relative transition-all duration-300 hover:scale-105 mx-auto"
          >
            <img 
              src={currentLogo} 
              alt="Sons of Taiba" 
              className="h-10 sm:h-12 w-auto transition-opacity duration-300 group-hover:opacity-90"
            />
          </button>
          
          {/* Home Button */}
          {!isHomePage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-200"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Button>
          )}
          
          {isHomePage && <div className="w-20" />}
        </div>
      </div>
    </header>
  );
};
