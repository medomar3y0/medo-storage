import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, FileText, Image, FileVideo, FileType, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface FileItemProps {
  id: string;
  name: string;
  filePath: string;
  fileSize?: number;
  isAdmin: boolean;
  onDelete?: () => void;
  index?: number;
}

export const FileItem = ({ id, name, filePath, fileSize, isAdmin, onDelete, index = 0 }: FileItemProps) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(extension || '')) {
      return Image;
    }
    
    // Video files
    if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv'].includes(extension || '')) {
      return FileVideo;
    }
    
    // PDF files
    if (extension === 'pdf') {
      return FileText;
    }
    
    // Office/Word files
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(extension || '')) {
      return FileType;
    }
    
    // Default icon for other files
    return File;
  };

  const FileIcon = getFileIcon(name);


  const handleView = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error("Error viewing file:", error);
      toast.error("فشل فتح الملف");
    }
  };

  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الملف بنجاح');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('حدث خطأ في تحميل الملف');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف؟')) return;

    try {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      toast.success('تم حذف الملف بنجاح');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('حدث خطأ في حذف الملف');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.1,
        ease: "easeOut" 
      }}
      className="p-4 rounded-lg bg-card border border-border card-glow"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <FileIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium break-words sm:truncate">{name}</p>
            {fileSize && (
              <p className="text-sm text-muted-foreground mt-1">{formatFileSize(fileSize)}</p>
            )}
          </div>
        </div>
        
        {/* Action Buttons - Full Width Grid */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <Button
            size="sm"
            variant="default"
            onClick={handleView}
            className="gap-1.5 w-full"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">معاينة</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleDownload}
            className="gap-1.5 w-full"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تحميل</span>
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              variant="default"
              onClick={handleDelete}
              className="gap-1.5 w-full"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">حذف</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};