const express = require('express');
const { registerRoutes } = require('./routes');
const { setupVite, serveStatic } = require('./vite');

const app = express();
const port = process.env.PORT || 5000;

// Middleware pour gérer le JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function startServer() {
  try {
    // Configuration des routes
    const server = await registerRoutes(app);

    // Démarrage du serveur
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Serveur lancé sur le port ${port}`);
    });

  } catch (error) {
    console.error('❌ Échec du démarrage du serveur :', error);
    process.exit(1);
  }
}

startServer();
