const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 60,
});

async function setupDatabase() {
  try {
    console.log('Tentative de connexion à la base de données...');
    
    // Test de connexion
    await sql`SELECT 1 as test`;
    console.log('✅ Connexion réussie !');

    // Créer la table quotes
    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        author TEXT NOT NULL,
        tags JSONB,
        source_url TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ Table quotes créée');

    // Créer la table scraping_sessions
    await sql`
      CREATE TABLE IF NOT EXISTS scraping_sessions (
        id SERIAL PRIMARY KEY,
        status VARCHAR(50) NOT NULL,
        current_page INTEGER DEFAULT 0,
        total_pages INTEGER DEFAULT 0,
        quotes_found INTEGER DEFAULT 0,
        new_quotes INTEGER DEFAULT 0,
        errors INTEGER DEFAULT 0,
        logs JSONB DEFAULT '[]'::jsonb,
        start_time TIMESTAMP DEFAULT NOW(),
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `;
    console.log('✅ Table scraping_sessions créée');

    // Créer la table users (pour compatibilité)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `;
    console.log('✅ Table users créée');

    console.log('🎉 Configuration de la base de données terminée !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la configuration:', error);
    process.exit(1);
  }
}

setupDatabase();