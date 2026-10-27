SELECT COUNT(*) AS total_published,
       SUM(CASE WHEN reviews_count >= 3 THEN 1 ELSE 0 END) AS with_3_reviews
FROM clinics
WHERE city_id = (SELECT id FROM cities WHERE slug = 'krasnodar')
  AND status = 'published';

SELECT name, rating, reviews_count FROM clinics
WHERE city_id = (SELECT id FROM cities WHERE slug = 'krasnodar')
  AND status = 'published'
ORDER BY reviews_count DESC
LIMIT 10;
