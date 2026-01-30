import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Folder, 
  Building2, 
  Calculator, 
  Briefcase, 
  Users, 
  GraduationCap,
  BookOpen,
  FileText,
  Laptop,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface CategoryCardProps {
  name: string;
  description?: string;
  fileCount: number;
  onClick: () => void;
  departmentName?: string;
  index?: number;
}

// Function to get icon based on department or category name
const getIconForCategory = (name: string, departmentName?: string) => {
  const lowerName = (name + " " + (departmentName || "")).toLowerCase();
  
  if (lowerName.includes("محاسب") || lowerName.includes("حساب")) return Calculator;
  if (lowerName.includes("إدار") || lowerName.includes("ادار")) return Briefcase;
  if (lowerName.includes("موارد") || lowerName.includes("بشري")) return Users;
  if (lowerName.includes("هندس") || lowerName.includes("تقني")) return Laptop;
  if (lowerName.includes("اقتصاد") || lowerName.includes("مالي")) return TrendingUp;
  if (lowerName.includes("تربي") || lowerName.includes("تعليم")) return GraduationCap;
  if (lowerName.includes("قانون") || lowerName.includes("حقوق")) return FileText;
  if (lowerName.includes("طب") || lowerName.includes("صحة")) return Building2;
  
  return BookOpen;
};

export const CategoryCard = ({ name, description, fileCount, onClick, departmentName, index = 0 }: CategoryCardProps) => {
  const Icon = getIconForCategory(name, departmentName);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut" 
      }}
      whileHover={{ scale: 1.02 }}
    >
      <Card 
        onClick={onClick}
        className="shimmer-effect group cursor-pointer card-glow bg-card/80 backdrop-blur-sm relative h-full"
      >
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all duration-500 shrink-0">
            <Icon className="h-7 w-7 text-primary icon-animate group-hover:rotate-6 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl group-hover:text-primary transition-colors duration-300">
              {name}
            </CardTitle>
            {description && (
              <CardDescription className="mt-2 line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm font-medium shrink-0">
            {fileCount} {fileCount === 1 ? 'ملف' : 'ملفات'}
          </div>
        </div>
      </CardHeader>
    </Card>
    </motion.div>
  );
};