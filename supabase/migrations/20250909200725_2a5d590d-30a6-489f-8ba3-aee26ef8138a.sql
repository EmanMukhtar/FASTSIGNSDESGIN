-- Add new columns to jobs table for enhanced functionality
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS thumbnail TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
ADD COLUMN IF NOT EXISTS client_name TEXT;

-- Create notifications table for real-time updates
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create project templates table
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  template_data JSONB,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create file comments table for collaboration
CREATE TABLE IF NOT EXISTS public.file_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  parent_id UUID, -- for threaded comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create file versions table for version control
CREATE TABLE IF NOT EXISTS public.file_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_id UUID NOT NULL,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  changelog TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for project templates
CREATE POLICY "All users can view public templates" ON public.project_templates
FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create templates" ON public.project_templates
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own templates" ON public.project_templates
FOR UPDATE USING (auth.uid() = created_by);

-- Create RLS policies for file comments
CREATE POLICY "Authenticated users can view all file comments" ON public.file_comments
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create file comments" ON public.file_comments
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON public.file_comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.file_comments
FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for file versions
CREATE POLICY "Authenticated users can view all file versions" ON public.file_versions
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create file versions" ON public.file_versions
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add triggers for updated_at columns
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_templates_updated_at
BEFORE UPDATE ON public.project_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_file_comments_updated_at
BEFORE UPDATE ON public.file_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default project templates
INSERT INTO public.project_templates (name, description, thumbnail, template_data, category, is_public) VALUES
('Business Card Design', 'Standard business card template with Fast Signs branding', null, '{"width": "3.5in", "height": "2in", "elements": [{"type": "text", "content": "Company Name"}, {"type": "text", "content": "Contact Info"}]}', 'business', true),
('Banner Design', 'Large format banner template for outdoor advertising', null, '{"width": "8ft", "height": "4ft", "elements": [{"type": "text", "content": "Main Headline"}, {"type": "image", "placeholder": "Company Logo"}]}', 'outdoor', true),
('Vehicle Wrap', 'Full vehicle wrap design template', null, '{"elements": [{"type": "text", "content": "Company Branding"}, {"type": "image", "placeholder": "Vehicle Template"}]}', 'vehicle', true),
('Window Graphics', 'Storefront window graphics template', null, '{"elements": [{"type": "text", "content": "Store Hours"}, {"type": "text", "content": "Services"}]}', 'storefront', true);