import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Send, History, User, Clock, GitBranch } from 'lucide-react';

interface FileComment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  parent_id?: string;
  profiles?: {
    full_name: string;
  };
}

interface FileVersion {
  id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  changelog?: string;
  created_at: string;
  created_by?: string;
  profiles?: {
    full_name: string;
  };
}

interface FileCollaborationProps {
  fileId: string;
  fileName: string;
}

const FileCollaboration = ({ fileId, fileName }: FileCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<FileComment[]>([]);
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'versions'>('comments');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
    fetchVersions();
  }, [fileId]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('file_comments')
        .select('*')
        .eq('file_id', fileId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('file_versions')
        .select('*')
        .eq('file_id', fileId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('file_comments')
        .insert([
          {
            file_id: fileId,
            user_id: user?.id,
            comment: newComment.trim(),
          }
        ]);

      if (error) throw error;

      setNewComment('');
      fetchComments();
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const createNewVersion = async (file: File, changelog: string) => {
    try {
      // Upload new version file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${fileId}_v${versions.length + 1}.${fileExt}`;
      const filePath = `${fileId}/versions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('job-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create version record
      const { error: versionError } = await supabase
        .from('file_versions')
        .insert([
          {
            file_id: fileId,
            version_number: versions.length + 1,
            file_path: filePath,
            file_size: file.size,
            changelog,
            created_by: user?.id,
          }
        ]);

      if (versionError) throw versionError;

      fetchVersions();
      
      toast({
        title: "Success",
        description: "New version created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new version",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="animate-pulse p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>File Collaboration</span>
        </CardTitle>
        <CardDescription>
          Comments and version history for {fileName}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b">
          <Button
            variant={activeTab === 'comments' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('comments')}
            className="rounded-b-none"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Comments ({comments.length})
          </Button>
          <Button
            variant={activeTab === 'versions' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('versions')}
            className="rounded-b-none"
          >
            <History className="mr-2 h-4 w-4" />
            Versions ({versions.length})
          </Button>
        </div>

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            <ScrollArea className="h-64 w-full">
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-fast-blue text-white text-xs">
                          U
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            Unknown User
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{comment.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            
            <form onSubmit={addComment} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <Button type="submit" size="sm" disabled={!newComment.trim()}>
                <Send className="mr-2 h-4 w-4" />
                Add Comment
              </Button>
            </form>
          </div>
        )}

        {/* Versions Tab */}
        {activeTab === 'versions' && (
          <div className="space-y-4">
            <ScrollArea className="h-64 w-full">
              <div className="space-y-3">
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No version history available</p>
                  </div>
                ) : (
                  versions.map((version) => (
                    <div key={version.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline" className="mt-1">
                        v{version.version_number}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            Version {version.version_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(version.file_size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        {version.changelog && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.changelog}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Unknown</span>
                          <Clock className="h-3 w-3 ml-2" />
                          <span>{new Date(version.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileCollaboration;