-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create job_files table
CREATE TABLE public.job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  is_presentation BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on job_files
ALTER TABLE public.job_files ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for job files
INSERT INTO storage.buckets (id, name, public) VALUES ('job-files', 'job-files', false);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email IN ('eman.mukhtar@fastsigns.com', 'chuck@curryhhi.com') THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for jobs
CREATE POLICY "Authenticated users can view all jobs" ON public.jobs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update jobs they created" ON public.jobs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete jobs they created" ON public.jobs
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for job_files
CREATE POLICY "Authenticated users can view all job files" ON public.job_files
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload job files" ON public.job_files
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update files they uploaded" ON public.job_files
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete files they uploaded" ON public.job_files
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Storage policies for job-files bucket
CREATE POLICY "Authenticated users can view job files" ON storage.objects
  FOR SELECT USING (bucket_id = 'job-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload job files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'job-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their uploaded files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'job-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their uploaded files" ON storage.objects
  FOR DELETE USING (bucket_id = 'job-files' AND auth.uid()::text = (storage.foldername(name))[1]);