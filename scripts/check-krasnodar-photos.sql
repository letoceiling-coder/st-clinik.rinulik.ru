SELECT c.name, c.yandex_org_id IS NOT NULL AS real,
       COUNT(p.id) AS photos,
       SUM(CASE WHEN p.status='approved' THEN 1 ELSE 0 END) AS approved
FROM clinics c
LEFT JOIN clinic_photos p ON p.clinic_id = c.id
WHERE c.city_id = (SELECT id FROM cities WHERE slug = 'krasnodar')
  AND c.status = 'published'
GROUP BY c.id
LIMIT 8;
