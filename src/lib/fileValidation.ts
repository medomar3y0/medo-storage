import { z } from "zod";

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Text
  'text/plain',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  // Video
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.txt',
  '.zip', '.rar',
  '.mp4', '.mpeg', '.mov'
];

export const fileValidationSchema = z.object({
  file: z.custom<File>((file) => file instanceof File, "يجب أن يكون ملف صالح")
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `حجم الملف يجب أن يكون أقل من 500 ميجابايت`
    })
    .refine((file) => {
      return ALLOWED_MIME_TYPES.includes(file.type);
    }, {
      message: "نوع الملف غير مسموح به"
    })
    .refine((file) => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return ALLOWED_EXTENSIONS.includes(extension);
    }, {
      message: "امتداد الملف غير مسموح به"
    })
});

export const validateFile = (file: File): { valid: boolean; error?: string } => {
  try {
    fileValidationSchema.parse({ file });
    return { valid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0].message };
    }
    return { valid: false, error: "حدث خطأ في التحقق من الملف" };
  }
};

export const validateFiles = (files: FileList): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = validateFile(file);
    if (!result.valid) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};
