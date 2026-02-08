-- Fix relationships for existing tables
ALTER TABLE public.feedback 
DROP CONSTRAINT IF EXISTS feedback_user_id_fkey,
ADD CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.upgrade_feedback 
DROP CONSTRAINT IF EXISTS upgrade_feedback_user_id_fkey,
ADD CONSTRAINT upgrade_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
