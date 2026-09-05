-- Idempotent repair for projects where the original notification-delete
-- policy was not registered in the remote migration history.
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

GRANT DELETE ON TABLE public.user_notifications TO authenticated;

DROP POLICY IF EXISTS "Users delete own notifications" ON public.user_notifications;
CREATE POLICY "Users delete own notifications"
ON public.user_notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
