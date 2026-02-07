import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

type ColorTheme = 'orange' | 'green' | 'blue';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('colorTheme') as ColorTheme) || 'green';
    }
    return 'green';
  });
  const { t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Apply color theme to document
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  const handleThemeChange = (mode: 'light' | 'dark', color: ColorTheme) => {
    setTheme(mode);
    setColorTheme(color);
  };

  const getCurrentThemeKey = () => {
    const mode = theme === 'dark' ? 'dark' : 'light';
    return `${mode}-${colorTheme}`;
  };

  const themeOptions = [
    { key: 'light-orange', mode: 'light' as const, color: 'orange' as const, label: t('lightOrange') },
    { key: 'light-green', mode: 'light' as const, color: 'green' as const, label: t('lightGreen') },
    { key: 'light-blue', mode: 'light' as const, color: 'blue' as const, label: t('lightBlue') },
    { key: 'dark-orange', mode: 'dark' as const, color: 'orange' as const, label: t('darkOrange') },
    { key: 'dark-green', mode: 'dark' as const, color: 'green' as const, label: t('darkGreen') },
    { key: 'dark-blue', mode: 'dark' as const, color: 'blue' as const, label: t('darkBlue') },
  ];

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-10 h-10">
        <Palette className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-10 h-10 hover:bg-accent/10 transition-all">
          <Palette className="h-5 w-5 text-primary" />
          <span className="sr-only">{t('chooseTheme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.key}
            onClick={() => handleThemeChange(option.mode, option.color)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{option.label}</span>
            {getCurrentThemeKey() === option.key && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
