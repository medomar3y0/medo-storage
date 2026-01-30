import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto pb-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 whitespace-nowrap">
          {item.href ? (
            <Link 
              to={item.href} 
              className="hover:text-primary transition-colors duration-200 font-medium"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-semibold">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <ChevronLeft className="w-4 h-4 flex-shrink-0" />
          )}
        </div>
      ))}
    </nav>
  );
};
