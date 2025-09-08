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
const MONGO_URI = envConfig.MONGO_URI || 'mongodb://localhost:27017/topphysics';
const DB_NAME = envConfig.DB_NAME || process.env.DB_NAME || 'topphysics';

console.log('🔗 Using Mongo URI:', MONGO_URI);

async function getAssistantFromToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    const decoded = await getAssistantFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'Unauthorized' });
    if (req.method === 'GET') {
      const assistant = await db.collection('assistants').findOne({ id: decoded.assistant_id });
      if (!assistant) return res.status(404).json({ error: 'Assistant not found' });
      res.json({
        id: assistant.id,
        name: assistant.name,
        phone: assistant.phone,
        password: assistant.password,
        role: assistant.role
      });
    } else if (req.method === 'PUT') {
      // Edit profile - handle partial updates properly
      const { name, id, phone, password } = req.body;
      
      // Build update object with only defined values (not null or undefined)
      const update = {};
      
      if (name !== undefined && name !== null && name.trim() !== '') {
        update.name = name;
      }
      if (id !== undefined && id !== null && id.trim() !== '') {
        update.id = id;
      }
      if (phone !== undefined && phone !== null && phone.trim() !== '') {
        update.phone = phone;
      }
      if (password !== undefined && password !== null && password.trim() !== '') {
        update.password = await bcrypt.hash(password, 10);
      }
      
      // Only proceed if there are fields to update
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }
      
      await db.collection('assistants').updateOne(
        { id: decoded.assistant_id },
        { $set: update }
      );
      res.json({ success: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) await client.close();
  }
} 