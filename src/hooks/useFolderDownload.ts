 import { useState } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import JSZip from 'jszip';
 import { toast } from 'sonner';
 import { useLanguage } from '@/contexts/LanguageContext';
 
interface FileForDownload {
  id: string;
  name: string;
  file_path: string;
  folder_id: string | null;
}
 
 interface UserFolder {
   id: string;
   name: string;
   parent_id: string | null;
 }
 
 export const useFolderDownload = () => {
   const [downloading, setDownloading] = useState(false);
   const { t } = useLanguage();
 
  const getAllFilesInFolder = async (
    folderId: string,
    userId: string,
    allFolders: UserFolder[]
  ): Promise<FileForDownload[]> => {
     // Get files in current folder
     const { data: files } = await supabase
       .from('user_files')
      .select('id, name, file_path, folder_id')
       .eq('user_id', userId)
       .eq('folder_id', folderId);
 
    let allFiles: FileForDownload[] = files || [];
 
     // Get subfolders
     const subfolders = allFolders.filter(f => f.parent_id === folderId);
     
     // Recursively get files from subfolders
     for (const subfolder of subfolders) {
       const subfolderFiles = await getAllFilesInFolder(subfolder.id, userId, allFolders);
       allFiles = [...allFiles, ...subfolderFiles];
     }
 
     return allFiles;
   };
 
   const getFolderPath = (folderId: string, allFolders: UserFolder[]): string => {
     const folder = allFolders.find(f => f.id === folderId);
     if (!folder) return '';
     
     if (folder.parent_id) {
       const parentPath = getFolderPath(folder.parent_id, allFolders);
       return parentPath ? `${parentPath}/${folder.name}` : folder.name;
     }
     
     return folder.name;
   };
 
   const downloadFolder = async (
     folder: UserFolder,
     userId: string,
     allFolders: UserFolder[]
   ) => {
     setDownloading(true);
     
     try {
       const files = await getAllFilesInFolder(folder.id, userId, allFolders);
       
       if (files.length === 0) {
         toast.error(t('noFilesInFolder'));
         setDownloading(false);
         return;
       }
 
       const zip = new JSZip();
 
       for (const file of files) {
         try {
           const { data, error } = await supabase.storage
             .from('files')
             .download(file.file_path);
 
           if (error) {
             console.error(`Error downloading ${file.name}:`, error);
             continue;
           }
 
           // Get relative path within the folder structure
           let relativePath = file.name;
           if (file.folder_id && file.folder_id !== folder.id) {
             const folderPath = getFolderPath(file.folder_id, allFolders);
             const basePath = getFolderPath(folder.id, allFolders);
             relativePath = folderPath.replace(basePath + '/', '') + '/' + file.name;
           }
 
           zip.file(relativePath, data);
         } catch (err) {
           console.error(`Error processing ${file.name}:`, err);
         }
       }
 
       const content = await zip.generateAsync({ type: 'blob' });
       const url = URL.createObjectURL(content);
       const a = document.createElement('a');
       a.href = url;
       a.download = `${folder.name}.zip`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
 
       toast.success(t('folderDownloadSuccess'));
     } catch (error) {
       console.error('Error downloading folder:', error);
       toast.error(t('folderDownloadFailed'));
     } finally {
       setDownloading(false);
     }
   };
 
   return { downloadFolder, downloading };
 };