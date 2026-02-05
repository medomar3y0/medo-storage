import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { 
  FolderPlus, Upload, Folder, File, 
  Trash2, Download, Eye, Copy, Link,
  ChevronLeft, Share2, FolderDown, ChevronRight, Grid3X3, List, FolderOpen
} from "lucide-react";
import { useFolderDownload } from "@/hooks/useFolderDownload";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserFolder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  parent_id: string | null;
  share_code: string | null;
  is_public: boolean;
}

interface UserFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  file_extension: string | null;
  share_code: string | null;
  is_public: boolean;
  folder_id: string | null;
  user_id: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<UserFolder | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderPath, setFolderPath] = useState<UserFolder[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('fileViewMode') as 'grid' | 'list') || 'grid';
  });
  const { downloadFolder, downloading: downloadingFolder } = useFolderDownload();
  const { t } = useLanguage();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    localStorage.setItem('fileViewMode', newMode);
  };

  const generateFolderShareCode = async (folder: UserFolder) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const { error } = await supabase
      .from("user_folders")
      .update({ share_code: code, is_public: true })
      .eq("id", folder.id);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(t('linkCopied'));
      const link = `${window.location.origin}/folder/${code}`;
      navigator.clipboard.writeText(link);
      fetchFolders(currentFolder?.id || null);
    }
  };

  const copyFolderLink = (folder: UserFolder) => {
    if (folder.share_code) {
      const link = `${window.location.origin}/folder/${folder.share_code}`;
      navigator.clipboard.writeText(link);
      toast.success(t('folderLinkCopied'));
    } else {
      generateFolderShareCode(folder);
    }
  };

  const fetchFolders = useCallback(async (parentId: string | null = null) => {
    if (!user) return;
    
    let query = supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", user.id);
    
    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching folders:", error);
    } else {
      setFolders(data || []);
    }
  }, [user]);

  const fetchFiles = useCallback(async (folderId: string | null) => {
    if (!user) return;
    
    let query = supabase
      .from("user_files")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (folderId) {
      query = query.eq("folder_id", folderId);
    } else {
      query = query.is("folder_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching files:", error);
    } else {
      setFiles(data || []);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchFolders(currentFolder?.id || null);
      fetchFiles(currentFolder?.id || null);
    }
  }, [user, currentFolder?.id, fetchFolders, fetchFiles]);

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    
    setIsCreatingFolder(true);
    
    const { error } = await supabase
      .from("user_folders")
      .insert({
        name: newFolderName.trim(),
        user_id: user.id,
        parent_id: currentFolder?.id || null
      });

    if (error) {
      toast.error(t('folderCreatedFailed'));
      console.error(error);
    } else {
      toast.success(t('folderCreatedSuccess'));
      setNewFolderName("");
      setFolderDialogOpen(false);
      fetchFolders(currentFolder?.id || null);
    }
    
    setIsCreatingFolder(false);
  };

  const deleteFolder = async (folderId: string) => {
    if (!window.confirm(t('deleteFolderConfirm'))) return;

    const { error } = await supabase
      .from("user_folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      toast.error(t('folderDeletedFailed'));
    } else {
      toast.success(t('folderDeletedSuccess'));
      fetchFolders(currentFolder?.id || null);
      if (currentFolder?.id === folderId) {
        setCurrentFolder(null);
        setFolderPath([]);
      }
    }
  };

  const generateShareCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const navigateToFolder = (folder: UserFolder) => {
    setFolderPath(prev => [...prev, folder]);
    setCurrentFolder(folder);
  };

  const navigateBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1] : null);
    } else {
      setCurrentFolder(null);
    }
  };

  const navigateToPathIndex = (index: number) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]);
    }
  };

  const handleDownloadFolder = async (folder: UserFolder) => {
    if (!user) return;
    
    // Get all folders for path resolution
    const { data: allFolders } = await supabase
      .from("user_folders")
      .select("id, name, parent_id")
      .eq("user_id", user.id);
    
    await downloadFolder(folder, user.id, allFolders || []);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    
    setUploading(true);
    const uploadedFiles = Array.from(e.target.files);
    
    for (const file of uploadedFiles) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("files")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const shareCode = generateShareCode();

        const { error: dbError } = await supabase
          .from("user_files")
          .insert({
            user_id: user.id,
            folder_id: currentFolder?.id || null,
            name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            file_extension: fileExt,
            share_code: shareCode,
            is_public: false
          });

        if (dbError) throw dbError;
        
        toast.success(t('fileUploadedSuccess'));
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(t('fileUploadedFailed'));
      }
    }
    
    setUploading(false);
    fetchFiles(currentFolder?.id || null);
    e.target.value = '';
  };

  const deleteFile = async (file: UserFile) => {
    if (!window.confirm(t('deleteFileConfirm'))) return;

    try {
      const { error: storageError } = await supabase.storage
        .from("files")
        .remove([file.file_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("user_files")
        .delete()
        .eq("id", file.id);

      if (dbError) throw dbError;

      toast.success(t('fileDeletedSuccess'));
      fetchFiles(currentFolder?.id || null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t('fileDeletedFailed'));
    }
  };

  const toggleFilePublic = async (file: UserFile) => {
    const { error } = await supabase
      .from("user_files")
      .update({ is_public: !file.is_public })
      .eq("id", file.id);

    if (error) {
      toast.error(t('error'));
    } else {
      toast.success(file.is_public ? t('fileNowPrivate') : t('fileNowPublic'));
      fetchFiles(currentFolder?.id || null);
    }
  };

  const copyShareLink = (file: UserFile) => {
    const link = `${window.location.origin}/s/${file.share_code}`;
    navigator.clipboard.writeText(link);
    toast.success(t('linkCopied'));
  };

  const viewFile = async (file: UserFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("files")
        .createSignedUrl(file.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast.error(t('fileOpenFailed'));
    }
  };

  const downloadFile = async (file: UserFile) => {
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
      toast.success(t('fileDownloaded'));
    } catch (error) {
      toast.error(t('fileDownloadFailed'));
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <Header title={t('myFiles')} />

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-1 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateToPathIndex(-1)}
                className={`gap-1 ${!currentFolder ? 'font-semibold text-primary' : ''}`}
              >
                {t('myFiles')}
              </Button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground flip-rtl" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToPathIndex(index)}
                    className={index === folderPath.length - 1 ? 'font-semibold text-primary' : ''}
                  >
                    {folder.name}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FolderPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('newFolder')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createNewFolder')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folderName">{t('folderName')}</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={t('enterFolderName')}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createFolder} disabled={isCreatingFolder || !newFolderName.trim()}>
                    {isCreatingFolder ? t('creating') : t('create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Label className="cursor-pointer">
              <Button variant="default" className="gap-2" asChild>
                <span>
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">{uploading ? t('uploading') : t('uploadFile')}</span>
                </span>
              </Button>
              <Input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
          </div>
        </div>

        {/* Current folder actions (download & share) */}
        {currentFolder && (
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{currentFolder.name}</p>
                  <p className="text-sm text-muted-foreground">{files.length} {t('files')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleDownloadFolder(currentFolder)}
                  disabled={downloadingFolder}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('downloadFolder')}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => copyFolderLink(currentFolder)}
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('shareFolder')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Folders Grid */}
        {folders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">{t('folders')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {folders.map((folder, index) => (
                <motion.div
                  key={folder.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer hover:shadow-lg transition-all group"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <CardContent className="relative p-4 flex flex-col items-center">
                      <Folder className="h-12 w-12 text-primary mb-2" />
                      <p className="text-sm font-medium text-center truncate w-full">{folder.name}</p>
                      {/* Folder actions */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFolder(folder);
                          }}
                          disabled={downloadingFolder}
                          aria-label={t('downloadFolder')}
                        >
                          <FolderDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyFolderLink(folder);
                          }}
                          aria-label={t('shareFolder')}
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        aria-label={t('delete')}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Files Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">{t('files')}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleViewMode}
              className="gap-2"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              <span className="hidden sm:inline">{viewMode === 'grid' ? t('listView') : t('gridView')}</span>
            </Button>
          </div>
          {files.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
              : "flex flex-col gap-2"
            }>
              {files.map((file, index) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className={viewMode === 'list' ? 'p-0' : ''}>
                    {viewMode === 'grid' ? (
                      <>
                        <CardHeader className="pb-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <File className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm truncate">{file.name}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatFileSize(file.file_size)}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* Privacy Toggle */}
                          <div className="flex items-center justify-between mb-4 p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`public-${file.id}`}
                                checked={file.is_public}
                                onCheckedChange={() => toggleFilePublic(file)}
                              />
                              <Label htmlFor={`public-${file.id}`} className="text-sm cursor-pointer">
                                {t('public')}
                              </Label>
                            </div>
                          </div>

                          {/* Share Link */}
                          {file.share_code && (
                            <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-muted/30">
                              <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                              <code className="text-xs truncate flex-1 direction-ltr text-left">
                                /s/{file.share_code}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyShareLink(file)}
                                className="shrink-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="grid grid-cols-4 gap-2">
                            <Button variant="outline" size="sm" onClick={() => viewFile(file)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadFile(file)}>
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => copyShareLink(file)}>
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteFile(file)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      /* List View */
                      <div className="flex items-center gap-4 p-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <File className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatFileSize(file.file_size)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`public-${file.id}`}
                            checked={file.is_public}
                            onCheckedChange={() => toggleFilePublic(file)}
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewFile(file)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(file)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyShareLink(file)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteFile(file)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
                <File className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('noFilesYet')}</h3>
              <p className="text-muted-foreground">
                {t('uploadFirstFile')}
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
