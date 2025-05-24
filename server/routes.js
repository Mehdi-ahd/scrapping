const { createServer } = require('http');
const { sql } = require('./database');
const { QuoteScraper } = require('./scraper');

let currentScraper = null;
let scrapingProgress = null;

async function registerRoutes(app) {
  //Recupere toutes les citations avec pagination et filtres 
  app.get('/api/quotes', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;
      const author = req.query.author;
      const tag = req.query.tag;
      
      const offset = (page - 1) * limit;
      
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;
      
      if (search) {
        whereConditions.push(`(text ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      if (author) {
        whereConditions.push(`author = $${paramIndex}`);
        params.push(author);
        paramIndex++;
      }
      
      if (tag) {
        whereConditions.push(`$${paramIndex} = ANY(tags)`);
        params.push(tag);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const quotesQuery = `
        SELECT * FROM quotes 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const countQuery = `SELECT COUNT(*) as count FROM quotes ${whereClause}`;
      
      const [quotesResult, countResult] = await Promise.all([
        sql.unsafe(quotesQuery, [...params, limit, offset]),
        sql.unsafe(countQuery, params)
      ]);
      
      res.json({
        quotes: quotesResult,
        pagination: {
          page,
          limit,
          total: parseInt(countResult[0].count),
          totalPages: Math.ceil(countResult[0].count / limit),
        }
      });
    } catch (error) {
      console.error('Error fetching quotes:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des citations'
      });
    }
  });

 
  app.get('/api/quotes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID invalide' });
      }
      
      const result = await sql`SELECT * FROM quotes WHERE id = ${id}`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Citation non trouvée' });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error fetching quote:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération de la citation'
      });
    }
  });

  // Créer de nouvelles citations
  app.post('/api/quotes', async (req, res) => {
    try {
      const { text, author, tags, sourceUrl } = req.body;
      
      if (!text || !author) {
        return res.status(400).json({ error: 'Texte et auteur sont obligatoires' });
      }
      
      
      const existing = await sql`
        SELECT id FROM quotes WHERE text = ${text} AND author = ${author}
      `;
      
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Cette citation existe déjà' });
      }
      
      const result = await sql`
        INSERT INTO quotes (text, author, tags, source_url, created_at, updated_at)
        VALUES (${text}, ${author}, ${tags || null}, ${sourceUrl || null}, NOW(), NOW())
        RETURNING *
      `;
      
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating quote:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la création de la citation'
      });
    }
  });

  // Modifier une citation
  app.put('/api/quotes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { text, author, tags, sourceUrl } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID invalide' });
      }
      
      const result = await sql`
        UPDATE quotes 
        SET text = ${text}, author = ${author}, tags = ${tags || null}, 
            source_url = ${sourceUrl || null}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Citation non trouvée' });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error('Error updating quote:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la mise à jour de la citation'
      });
    }
  });

  // Supprimer une citation
  app.delete('/api/quotes/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID invalide' });
      }
      
      const result = await sql`DELETE FROM quotes WHERE id = ${id} RETURNING id`;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Citation non trouvée' });
      }
      
      res.json({ message: 'Citation supprimée avec succès' });
    } catch (error) {
      console.error('Error deleting quote:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la suppression de la citation'
      });
    }
  });

  // Recuperer les auteurs
  app.get('/api/authors', async (req, res) => {
    try {
      const authors = await sql`
        SELECT author as name, COUNT(*) as quotesCount 
        FROM quotes 
        GROUP BY author 
        ORDER BY author
      `;
      res.json(authors);
    } catch (error) {
      console.error('Error fetching authors:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des auteurs'
      });
    }
  });

  // Recuperer les tags
  app.get('/api/tags', async (req, res) => {
    try {
      const tags = await sql`
        SELECT tag as name, COUNT(*) as usageCount
        FROM quotes, unnest(tags) as tag
        WHERE tags IS NOT NULL
        GROUP BY tag
        ORDER BY tag
      `;
      res.json(tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des tags'
      });
    }
  });

  // Recuperer les statistiques
  app.get('/api/stats', async (req, res) => {
    try {
      const [quotesCount, authorsCount, tagsCount] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM quotes`,
        sql`SELECT COUNT(DISTINCT author) as count FROM quotes`,
        sql`SELECT COUNT(DISTINCT tag) as count FROM quotes, unnest(tags) as tag WHERE tags IS NOT NULL`
      ]);
      
      res.json({
        totalQuotes: parseInt(quotesCount[0].count),
        totalAuthors: parseInt(authorsCount[0].count),
        totalTags: parseInt(tagsCount[0].count)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des statistiques'
      });
    }
  });

  // Commencer le scrapping
  app.post('/api/scraper/start', async (req, res) => {
    try {
      if (currentScraper) {
        return res.status(409).json({ error: 'Scraping déjà en cours' });
      }
      
      const { maxPages = 10, delay = 1000, skipExisting = true } = req.body;
      
      currentScraper = new QuoteScraper({
        maxPages,
        delay,
        skipExisting,
      });
      
      scrapingProgress = {
        currentPage: 0,
        totalPages: maxPages,
        quotesFound: 0,
        newQuotes: 0,
        errors: 0,
        isComplete: false,
        logs: [],
        startTime: new Date(),
      };
      
      res.json({ message: 'Scraping démarré', progress: scrapingProgress });
      
      currentScraper.scrapeQuotes((progress) => {
        scrapingProgress = { ...progress, startTime: scrapingProgress.startTime };
      }).then(async (result) => {
        try {
          let quotesToInsert = result.quotes;
          
          if (skipExisting) {
            const newQuotes = [];
            for (const quote of result.quotes) {
              const existing = await sql`
                SELECT id FROM quotes WHERE text = ${quote.text} AND author = ${quote.author}
              `;
              if (existing.length === 0) {
                newQuotes.push(quote);
              }
            }
            quotesToInsert = newQuotes;
          }
          
          
          if (quotesToInsert.length > 0) {
            for (const quote of quotesToInsert) {
              await sql`
                INSERT INTO quotes (text, author, tags, source_url, created_at, updated_at)
                VALUES (${quote.text}, ${quote.author}, ${quote.tags || null}, ${quote.sourceUrl || null}, NOW(), NOW())
              `;
            }
          }
          
          scrapingProgress.newQuotes = quotesToInsert.length;
          scrapingProgress.isComplete = true;
          
        } catch (error) {
          console.error('Error saving scraped quotes:', error);
          scrapingProgress.errors++;
        } finally {
          currentScraper = null;
        }
      }).catch((error) => {
        console.error('Scraping failed:', error);
        currentScraper = null;
      });
      
    } catch (error) {
      console.error('Error starting scraper:', error);
      res.status(500).json({ 
        error: 'Erreur lors du démarrage du scraping'
      });
    }
  });

  app.get('/api/scraper/progress', (req, res) => {
    if (!scrapingProgress) {
      return res.json({ 
        isActive: false,
        message: 'Aucun scraping en cours'
      });
    }
    
    res.json({
      isActive: !!currentScraper,
      ...scrapingProgress,
      elapsedTime: scrapingProgress.startTime ? 
        Math.floor((Date.now() - scrapingProgress.startTime.getTime()) / 1000) : 0
    });
  });

  app.post('/api/scraper/stop', (req, res) => {
    if (!currentScraper) {
      return res.status(404).json({ error: 'Aucun scraping en cours' });
    }
    
    currentScraper = null;
    scrapingProgress = null;
    
    res.json({ message: 'Scraping arrêté' });
  });

  app.get('/api/export', async (req, res) => {
    try {
      const format = req.query.format || 'json';
      
      const quotes = await sql`SELECT * FROM quotes ORDER BY created_at DESC`;
      
      if (format === 'csv') {
        const csv = [
          'ID,Text,Author,Tags,Source URL,Created At',
          ...quotes.map(q => [
            q.id,
            `"${q.text.replace(/"/g, '""')}"`,
            `"${q.author.replace(/"/g, '""')}"`,
            `"${(q.tags || []).join(', ')}"`,
            q.source_url || '',
            q.created_at?.toISOString() || ''
          ].join(','))
        ].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="quotes.csv"');
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="quotes.json"');
        res.json(quotes);
      }
    } catch (error) {
      console.error('Error exporting quotes:', error);
      res.status(500).json({ 
        error: 'Erreur lors de l\'export'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

module.exports = { registerRoutes };
