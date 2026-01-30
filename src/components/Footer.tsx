import { MessageCircle, Code } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="mt-auto border-t bg-card text-card-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs sm:text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <span>© جميع الحقوق محفوظة ل</span>
              <span className="font-bold text-primary">SONS OF TAIBA</span>
            </div>
            <a
              href="https://chat.whatsapp.com/ISVxK2e63CU6qf6KbMZfhS?mode=wwt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span>للتواصل</span>
            </a>
          </div>
          
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Code className="h-3.5 w-3.5 text-primary" />
              <span>تم التطوير بواسطة</span>
              <span className="font-bold text-primary">MEDO MAR3Y</span>
            </div>
            <a
              href="https://wa.me/qr/3DDYB2JNLHGLL1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 text-primary" />
              <span>للتواصل</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
