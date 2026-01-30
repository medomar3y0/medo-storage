import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType?: string;
}

export const FilePreviewDialog = ({ 
  open, 
  onOpenChange, 
  fileUrl, 
  fileName,
  fileType 
}: FilePreviewDialogProps) => {
  const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const isVideo = fileType?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(fileName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
        </DialogHeader>
        <div className="w-full">
          {isPDF && (
            <iframe
              src={fileUrl}
              className="w-full h-[70vh] border-0"
              title={fileName}
            />
          )}
          {isImage && (
            <img
              src={fileUrl}
              alt={fileName}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
          {isVideo && (
            <video
              src={fileUrl}
              controls
              className="w-full h-auto max-h-[70vh]"
            >
              متصفحك لا يدعم تشغيل الفيديو.
            </video>
          )}
          {!isPDF && !isImage && !isVideo && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">لا يمكن عرض معاينة لهذا النوع من الملفات</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
