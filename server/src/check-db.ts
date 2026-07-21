import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkUsers() {
  const db = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  const users = await db.all('SELECT id, username, role, name FROM users');
  console.log('Current users in DB:', users);
  
  const admin = await db.get('SELECT * FROM users WHERE username = ?', 'admin');
  if (admin) {
      console.log('Admin user found.');
  } else {
      console.log('Admin user NOT found.');
  }
}

checkUsers();
