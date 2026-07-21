import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resetAdmin() {
  const db = await open({
    filename: path.join(__dirname, '../database.sqlite'),
    driver: sqlite3.Database
  });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.run('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, 'admin']);
  console.log('Admin password reset to admin123');
}

resetAdmin();
