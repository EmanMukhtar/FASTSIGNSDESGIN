import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Search, Star, Copy, Edit, Trash2, Car, Building, Store } from 'lucide-react';

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  template_data: any;
  category: string;
  is_public: boolean;
  created_by?: string;
  created_at: string;
}

const Templates = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('project_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;

    try {
      const { error } = await supabase
        .from('project_templates')
        .insert([
          {
            name,
            description,
            category,
            template_data: {
              elements: [
                { type: 'text', content: 'Template Title', style: { fontSize: '24px' } },
                { type: 'text', content: 'Template Description', style: { fontSize: '16px' } }
              ]
            },
            is_public: true,
            created_by: user?.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      setShowCreateDialog(false);
      fetchTemplates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const useTemplate = async (template: ProjectTemplate) => {
    try {
      // Create a new job based on the template
      const { error } = await supabase
        .from('jobs')
        .insert([
          {
            name: `${template.name} - Copy`,
            description: template.description,
            created_by: user?.id,
            status: 'pending',
            priority: 'medium'
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job created from template",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to use template",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'business': return <Building className="h-4 w-4" />;
      case 'vehicle': return <Car className="h-4 w-4" />;
      case 'storefront': return <Store className="h-4 w-4" />;
      case 'outdoor': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(templates.map(t => t.category))];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-fast-blue" />
          <h1 className="text-3xl font-bold text-foreground">Project Templates</h1>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-fast-blue hover:bg-fast-blue/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable project template for your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createTemplate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter template name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Enter template description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category"
                  name="category"
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="general">General</option>
                  <option value="business">Business</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="storefront">Storefront</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Template</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <TabsList className="grid grid-cols-6 w-full sm:w-auto">
            <TabsTrigger value="all" onClick={() => setCategoryFilter('all')}>All</TabsTrigger>
            <TabsTrigger value="business" onClick={() => setCategoryFilter('business')}>Business</TabsTrigger>
            <TabsTrigger value="vehicle" onClick={() => setCategoryFilter('vehicle')}>Vehicle</TabsTrigger>
            <TabsTrigger value="storefront" onClick={() => setCategoryFilter('storefront')}>Store</TabsTrigger>
            <TabsTrigger value="outdoor" onClick={() => setCategoryFilter('outdoor')}>Outdoor</TabsTrigger>
            <TabsTrigger value="general" onClick={() => setCategoryFilter('general')}>General</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="group hover:shadow-lg transition-all duration-200">
                <div className="h-48 bg-gradient-to-br from-fast-blue/10 to-fast-red/10 flex items-center justify-center">
                  {template.thumbnail ? (
                    <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      {getCategoryIcon(template.category)}
                      <p className="text-sm text-muted-foreground mt-2">Template Preview</p>
                    </div>
                  )}
                </div>
                
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {getCategoryIcon(template.category)}
                      <span className="ml-1 capitalize">{template.category}</span>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {new Date(template.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => useTemplate(template)}
                        className="bg-fast-blue hover:bg-fast-blue/90"
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Use Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Templates;