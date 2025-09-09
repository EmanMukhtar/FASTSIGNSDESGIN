import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  Download, 
  FileText, 
  Image, 
  File, 
  Trash2, 
  Star,
  StarOff,
  Loader2
} from 'lucide-react';

interface JobFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  is_presentation: boolean;
  created_at: string;
  uploaded_by: string;
  profiles?: {
    full_name: string;
  };
}

interface JobFilesProps {
  jobId: string;
}

const JobFiles = ({ jobId }: JobFilesProps) => {
  const [files, setFiles] = useState<JobFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, [jobId]);

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('job_files')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${jobId}/${fileName}`;

        // Upload file to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('job-files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Check if it's a presentation file
        const isPresentation = file.name.toLowerCase().includes('presentation') || 
                             file.type.includes('presentation') ||
                             fileExt?.toLowerCase() === 'pptx' ||
                             fileExt?.toLowerCase() === 'ppt';

        // Save file metadata to database
        const { error: dbError } = await supabase
          .from('job_files')
          .insert([
            {
              job_id: jobId,
              file_name: file.name,
              file_type: file.type || 'application/octet-stream',
              file_size: file.size,
              file_path: filePath,
              is_presentation: isPresentation,
              uploaded_by: user?.id,
            }
          ]);

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) uploaded successfully`,
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadFile = async (file: JobFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('job-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "File downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const deleteFile = async (file: JobFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('job-files')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('job_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const togglePresentation = async (file: JobFile) => {
    try {
      const { error } = await supabase
        .from('job_files')
        .update({ is_presentation: !file.is_presentation })
        .eq('id', file.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `File ${file.is_presentation ? 'removed from' : 'marked as'} presentation`,
      });

      fetchFiles();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update file status",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string, fileName: string) => {
    if (fileType.startsWith('image/') || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(fileName)) {
      return <Image className="h-5 w-5" />;
    }
    if (fileType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const presentationFiles = files.filter(f => f.is_presentation);
  const otherFiles = files.filter(f => !f.is_presentation);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Project Files</h2>
          <p className="text-muted-foreground">Upload and manage design files for this job</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            accept=".png,.jpg,.jpeg,.svg,.pdf,.ai,.psd,.eps,.pptx,.ppt,.doc,.docx"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-fast-blue hover:bg-fast-blue/90"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {presentationFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Star className="mr-2 h-5 w-5 text-fast-red" fill="currentColor" />
                Presentation Files
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presentationFiles.map((file) => (
                  <Card key={file.id} className="border-l-4 border-l-fast-red">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                          {getFileIcon(file.file_type, file.file_name)}
                          <div>
                            <CardTitle className="text-sm font-medium truncate">
                              {file.file_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {formatFileSize(file.file_size)}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-fast-red/10 text-fast-red">
                          Presentation
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {file.profiles?.full_name || 'Unknown'} • {new Date(file.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePresentation(file)}
                            className="h-8 w-8 p-0"
                          >
                            <StarOff className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(file)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {file.uploaded_by === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteFile(file)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {otherFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">All Files</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {otherFiles.map((file) => (
                  <Card key={file.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-2">
                        {getFileIcon(file.file_type, file.file_name)}
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-medium truncate">
                            {file.file_name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {formatFileSize(file.file_size)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">
                          {file.profiles?.full_name || 'Unknown'}
                        </span>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => togglePresentation(file)}
                            className="h-8 w-8 p-0"
                            title="Mark as presentation"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadFile(file)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {file.uploaded_by === user?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteFile(file)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No files uploaded</h3>
                <p className="text-muted-foreground mb-4">
                  Upload design files, presentations, and other assets for this job.
                </p>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload First File
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default JobFiles;