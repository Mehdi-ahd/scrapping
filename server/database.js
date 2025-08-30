const postgres = require('postgres');
require('dotenv').config();
const dburl = process.env.DB_URL;

// Configuration de connexion Supabase
const connectionString = `${dburl}`;

if (!dburl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    undefined: null
  },
  onnotice: () => {}, // Suppress notices
});

module.exports = { sql };