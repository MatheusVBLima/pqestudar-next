ALTER TABLE public.saved_items
  DROP CONSTRAINT IF EXISTS saved_items_item_type_check;

ALTER TABLE public.saved_items
  ADD CONSTRAINT saved_items_item_type_check
  CHECK (item_type IN ('tool', 'contest', 'guide', 'premium_item', 'course_analysis'));
