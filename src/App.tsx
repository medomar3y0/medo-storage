import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import CategoryFiles from "./pages/CategoryFiles";
import DepartmentView from "./pages/DepartmentView";
import LevelView from "./pages/LevelView";
import SemesterView from "./pages/SemesterView";
import SemesterCategories from "./pages/SemesterCategories";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
// Force types refresh

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><DepartmentView /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/admin" element={<PageTransition><Admin /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
        <Route path="/department/:departmentId/levels" element={<PageTransition><LevelView /></PageTransition>} />
        <Route path="/level/:levelId/semesters" element={<PageTransition><SemesterView /></PageTransition>} />
        <Route path="/:semesterId/categories" element={<PageTransition><SemesterCategories /></PageTransition>} />
        <Route path="/:semesterId/categories/:categoryId" element={<PageTransition><CategoryFiles /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
