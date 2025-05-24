const express = require('express');
const { registerRoutes } = require('./routes');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static('.'));

async function startServer() {
  try {
    // Setup routes
    const server = await registerRoutes(app);
    
    // Start server
    server.listen(port, '0.0.0.0', () => {
      console.log(`Serveur QuoteScraper démarré sur http://localhost:${port}`);
    });
    
  } catch (error) {
    console.error('Erreur de démarrage:', error);
    process.exit(1);
  }
}

startServer();