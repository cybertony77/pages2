import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Load environment variables from env.config
function loadEnvConfig() {
  try {
    const envPath = path.join(process.cwd(), '..', 'env.config');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const index = trimmed.indexOf('=');
        if (index !== -1) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          value = value.replace(/^"|"$/g, ''); // strip quotes
          envVars[key] = value;
        }
      }
    });
    
    return envVars;
  } catch (error) {
    console.log('⚠️  Could not read env.config, using process.env as fallback');
    return {};
  }
}

const envConfig = loadEnvConfig();
const JWT_SECRET = envConfig.JWT_SECRET || process.env.JWT_SECRET || 'topphysics_secret';
const MONGO_URI = envConfig.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/topphysics';
const DB_NAME = envConfig.DB_NAME || process.env.DB_NAME || 'topphysics';

console.log('🔗 Using Mongo URI:', MONGO_URI);

async function requireAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      throw new Error('Forbidden: Admins only');
    }
    return decoded;
  } catch (error) {
    throw error;
  }
}

export default async function handler(req, res) {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    // Verify admin access
    const admin = await requireAdmin(req);
    
    if (req.method === 'GET') {
      // Get all assistants
      const assistants = await db.collection('assistants').find().toArray();
      res.json(assistants);
    } else if (req.method === 'POST') {
      // Create new assistant
      const { id, name, phone, password, role } = req.body;
      if (!id || !name || !phone || !password || !role) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      const exists = await db.collection('assistants').findOne({ id });
      if (exists) {
        return res.status(409).json({ error: 'Assistant ID already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection('assistants').insertOne({ id, name, phone, password: hashedPassword, role });
      res.json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
    } else if (error.message === 'Forbidden: Admins only') {
      res.status(403).json({ error: 'Forbidden: Admins only' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    if (client) await client.close();
  }
} 