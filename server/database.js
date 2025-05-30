const postgres = require('postgres');
require('dotenv').config();
const dburl = process.env.DB_URL;

// Configuration de connexion Supabase
const connectionString = `${dburl}`;

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
});

module.exports = { sql };