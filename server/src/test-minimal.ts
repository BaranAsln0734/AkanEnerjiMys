import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './auth.js';
import { customerSchema } from './schemas.js';
import { initDb } from './db.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
