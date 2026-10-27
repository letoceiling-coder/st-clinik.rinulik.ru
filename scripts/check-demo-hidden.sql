SELECT name, status, yandex_org_id IS NOT NULL AS real FROM clinics
WHERE city_id = (SELECT id FROM cities WHERE slug = 'krasnodar')
  AND name LIKE '%Жемчуг%';
