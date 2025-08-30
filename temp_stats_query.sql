-- Requête simplifiée pour les statistiques
SELECT 
  (SELECT COUNT(*) FROM quotes) as totalQuotes,
  (SELECT COUNT(DISTINCT author) FROM quotes) as totalAuthors,
  COALESCE((SELECT COUNT(DISTINCT tag) FROM (SELECT jsonb_array_elements_text(tags) as tag FROM quotes WHERE tags IS NOT NULL AND jsonb_typeof(tags) = 'array') sub), 0) as totalTags;
