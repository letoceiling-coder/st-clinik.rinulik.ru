SELECT ci.slug, SUM(CASE WHEN c.yandex_org_id IS NOT NULL THEN 1 ELSE 0 END), SUM(CASE WHEN c.yandex_org_id IS NULL THEN 1 ELSE 0 END)
FROM clinics c JOIN cities ci ON ci.id = c.city_id WHERE c.status = 'published' GROUP BY ci.slug;
