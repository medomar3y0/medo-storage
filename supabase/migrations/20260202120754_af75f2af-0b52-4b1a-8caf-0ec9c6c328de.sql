-- Allow admins to delete any file
CREATE POLICY "Admins can delete any file"
ON public.user_files
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete files from storage
CREATE POLICY "Admins can delete storage files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'files' 
  AND has_role(auth.uid(), 'admin'::app_role)
);