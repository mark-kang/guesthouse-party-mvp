const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Xi8fwuVUCH.7r&S@db.jmtehtsdqlwkbxidsjch.supabase.co:5432/postgres';

async function initDB() {
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    
    console.log('Schema executed successfully');
  } catch (err) {
    console.error('Error executing schema', err);
  } finally {
    await client.end();
  }
}

initDB();
