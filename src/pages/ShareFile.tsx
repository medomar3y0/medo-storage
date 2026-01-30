import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Download, Eye, File, Home, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SharedFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  file_extension: string | null;
  is_public: boolean;
}

const ShareFile = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFile = async () => {
      if (!shareCode) {
        setError("رابط غير صالح");
        setLoading(false);
        return;
      }

      // Extract the share code without extension
      const code = shareCode.split('.')[0];

      const { data, error } = await supabase
        .from("user_files")
        .select("id, name, file_path, file_size, file_extension, is_public")
        .eq("share_code", code)
        .single();

      if (error || !data) {
        setError("الملف غير موجود");
        setLoading(false);
        return;
      }

      if (!data.is_public) {
        setError("هذا الملف خاص وغير متاح للعرض");
        setLoading(false);
        return;
      }

      setFile(data);
      setLoading(false);
    };

    fetchFile();
  }, [shareCode]);

  const viewFile = async () => {
    if (!file) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      toast.error("فشل فتح الملف");
    }
  };

  const downloadFile = async () => {
    if (!file) return;
    
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("تم تحميل الملف");
    } catch (err) {
      toast.error("فشل تحميل الملف");
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">الرئيسية</span>
            </Button>

            <h1 className="text-lg font-bold text-primary">MEDO STORAGE</h1>

            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : error ? (
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">خطأ</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => navigate("/")} className="gap-2">
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Button>
            </CardContent>
          </Card>
        ) : file ? (
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <File className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl break-words">{file.name}</CardTitle>
              {file.file_size && (
                <p className="text-sm text-muted-foreground mt-2">
                  {formatFileSize(file.file_size)}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={viewFile} className="w-full gap-2">
                <Eye className="h-4 w-4" />
                معاينة الملف
              </Button>
              <Button onClick={downloadFile} variant="outline" className="w-full gap-2">
                <Download className="h-4 w-4" />
                تحميل الملف
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Footer />
    </div>
  );
};

export default ShareFile;
