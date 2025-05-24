const postgres = require('postgres');

// Configuration de connexion Supabase
const connectionString = '[Votre chaîne de connexion]';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
});

module.exports = { sql };
