import { useLocation, useNavigate } from "react-router-dom";
import { MobileMenu } from "@/components/MobileMenu";

type HeaderProps = {
  /** عنوان الصفحة (لو لم يُمرَّر سيتم استخدام اسم الموقع). */
  title?: string;
};

export const Header = ({ title }: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === "/";
  const displayTitle = isHomePage ? "MEDO STORAGE" : (title ?? "MEDO STORAGE");

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-lg font-bold text-primary text-right"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            {displayTitle}
          </button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};
