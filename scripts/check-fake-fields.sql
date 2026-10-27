SELECT name, is_verified, tagline, achievements
FROM clinics
WHERE yandex_org_id IS NOT NULL AND city_id = (SELECT id FROM cities WHERE slug = 'krasnodar')
LIMIT 5;
