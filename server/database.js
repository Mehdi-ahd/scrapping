const postgres = require('postgres');

// Configuration de connexion Supabase
const connectionString = 'postgresql://postgres.gmxbcamuwegdspsfkscp:krLo2FyZVd5VQiNk@aws-0-eu-west-3.pooler.supabase.com:6543/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 20,
  idle_timeout: 20,
  connect_timeout: 60,
});

module.exports = { sql };