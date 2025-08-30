const fs = require('fs');

const routesContent = fs.readFileSync('server/routes.js', 'utf8');

const newStatsFunction = `  // Get statistics
  app.get('/api/stats', async (req, res) => {
    try {
      // Requêtes simplifiées pour éviter les erreurs PostgreSQL
      const quotesCount = await sql\`SELECT COUNT(*) as count FROM quotes\`;
      const authorsCount = await sql\`SELECT COUNT(DISTINCT author) as count FROM quotes WHERE author IS NOT NULL\`;
      
      // Pour les tags, on compte simplement le nombre de lignes avec des tags
      let totalTags = 0;
      try {
        const quotes = await sql\`SELECT tags FROM quotes WHERE tags IS NOT NULL AND jsonb_typeof(tags) = 'array'\`;
        const allTags = new Set();
        quotes.forEach(quote => {
          if (quote.tags && Array.isArray(quote.tags)) {
            quote.tags.forEach(tag => allTags.add(tag));
          }
        });
        totalTags = allTags.size;
      } catch (tagError) {
        totalTags = 0;
      }
      
      res.json({
        totalQuotes: parseInt(quotesCount[0].count),
        totalAuthors: parseInt(authorsCount[0].count),
        totalTags: totalTags
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des statistiques'
      });
    }
  });`;

// Remplacer la fonction des statistiques
const regex = /\/\/ Get statistics[\s\S]*?(?=\n\n  \/\/ Start scraping)/;
const newContent = routesContent.replace(regex, newStatsFunction + '\n');

fs.writeFileSync('server/routes.js', newContent);
console.log('Statistiques function updated successfully');
