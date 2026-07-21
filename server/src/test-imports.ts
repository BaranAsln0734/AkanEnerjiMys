import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, getDb } from './db.js';
import crypto from 'crypto';
import { z } from 'zod';
import { 
  authMiddleware, 
  adminOnly, 
  generateToken, 
  comparePassword, 
  hashPassword,
  loginSchema,
  registerSchema 
} from './auth.js';
import {
  customerSchema,
  generatorSchema,
  partSchema,
  serviceRecordSchema
} from './schemas.js';

console.log('All imports loaded');
