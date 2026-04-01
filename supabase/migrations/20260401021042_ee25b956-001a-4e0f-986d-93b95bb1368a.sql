
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS npsn text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Jakarta';
