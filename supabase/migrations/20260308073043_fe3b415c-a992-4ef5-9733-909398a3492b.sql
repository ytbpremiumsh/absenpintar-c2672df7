
ALTER TABLE public.pickup_settings 
ADD COLUMN IF NOT EXISTS school_start_time time DEFAULT '07:00',
ADD COLUMN IF NOT EXISTS school_end_time time DEFAULT '14:00';
