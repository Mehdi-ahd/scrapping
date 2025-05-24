const { createServer } = require('http');
const { sql } = require('./database');
const { QuoteScraper } = require('./scraper');

// État global du scraping
let currentScraper = null;
let scrapingProgress = null;

async function registerRoutes(app) {
  // Obtenir toutes les citations avec pagination et filtres
  app.get('/api/quotes', async (req, res) => { ... });

  // Obtenir une seule citation par ID
  app.get('/api/quotes/:id', async (req, res) => { ... });

  // Créer une nouvelle citation
  app.post('/api/quotes', async (req, res) => { ... });

  // Mettre à jour une citation existante
  app.put('/api/quotes/:id', async (req, res) => { ... });

  // Supprimer une citation
  app.delete('/api/quotes/:id', async (req, res) => { ... });

  // Obtenir la liste des auteurs
  app.get('/api/authors', async (req, res) => { ... });

  // Obtenir la liste des tags
  app.get('/api/tags', async (req, res) => { ... });

  // Obtenir des statistiques générales
  app.get('/api/stats', async (req, res) => { ... });

  // Démarrer le scraping
  app.post('/api/scraper/start', async (req, res) => {
    // Lancer le scraping en arrière-plan
    ...
  });

  // Obtenir la progression du scraping
  app.get('/api/scraper/progress', (req, res) => { ... });

  // Arrêter le scraping
  app.post('/api/scraper/stop', (req, res) => { ... });

  // Exporter les citations (JSON ou CSV)
  app.get('/api/export', async (req, res) => { ... });

  const httpServer = createServer(app);
  return httpServer;
}

module.exports = { registerRoutes };
