-- Mantem a permissao de acesso separada da apresentacao do item. O feature
-- flag decide se usuarios comuns podem acessar; nav_items controla ordem,
-- rotulo, status e icones por dispositivo.
DO $$
DECLARE
  target_order integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.nav_items
    WHERE href = '/premium/cursos'
  ) THEN
    SELECT COALESCE(
      (SELECT order_index FROM public.nav_items WHERE href = '/guias' ORDER BY order_index LIMIT 1),
      (SELECT COALESCE(MAX(order_index), -1) + 1 FROM public.nav_items)
    )
    INTO target_order;

    UPDATE public.nav_items
    SET order_index = order_index + 1
    WHERE order_index >= target_order
      AND icon IS DISTINCT FROM 'id-card-cta';

    INSERT INTO public.nav_items (
      label,
      href,
      icon,
      order_index,
      is_active,
      is_external,
      open_in_new_tab,
      show_icon_desktop,
      show_icon_tablet,
      show_icon_mobile,
      is_new
    )
    VALUES (
      'Cursos',
      '/premium/cursos',
      'book-open',
      target_order,
      true,
      false,
      false,
      true,
      true,
      true,
      false
    );
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
