-- Explicitly requested visual fixtures. These are influencer records, not auth users.
-- Repeatable without duplicating the ten test profiles.
INSERT INTO public.admin_influencers (name, profile_url, photo_url, status, show_on_home)
SELECT
  'Parceiro de teste ' || lpad(n::text, 2, '0'),
  'https://www.pqestudar.com.br/?parceiro-teste=' || lpad(n::text, 2, '0'),
  'https://www.pqestudar.com.br/images/premium/work.webp',
  'accepted',
  true
FROM generate_series(1, 10) AS n
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_influencers i
  WHERE i.profile_url = 'https://www.pqestudar.com.br/?parceiro-teste=' || lpad(n::text, 2, '0')
);

SELECT name, profile_url, photo_url
FROM public.get_home_influencer_partners()
WHERE profile_url ~ '^https://www\.pqestudar\.com\.br/\?parceiro-teste=(0[1-9]|10)$'
ORDER BY name;
