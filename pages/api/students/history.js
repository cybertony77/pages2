import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
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

async function authMiddleware(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new Error('Unauthorized - No Bearer token');
  }
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token - ' + error.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    // Verify authentication
    const user = await authMiddleware(req);
    
    // Get history records (only studentId and week)
    const historyRecords = await db.collection('history').find().toArray();
    console.log('📊 Found', historyRecords.length, 'history records');
    
    // Get all students data
    const students = await db.collection('students').find().toArray();
    console.log('👥 Found', students.length, 'students');
    
    // Create a map of students by ID for quick lookup
    const studentMap = new Map();
    students.forEach(student => {
      studentMap.set(student.id, student);
    });
    
    const studentHistoryMap = new Map();
    
    // Process each history record
    historyRecords.forEach(record => {
      const student = studentMap.get(record.studentId);
      if (!student) {
        console.warn(`Student ${record.studentId} not found for history record`);
        return;
      }
      
      // Get the specific week data from student's weeks array
      const weekIndex = record.week - 1; // Convert week number to array index
      const weekData = student.weeks && student.weeks[weekIndex] ? student.weeks[weekIndex] : null;
      
      if (!weekData || !weekData.attended) {
        console.warn(`Week ${record.week} data not found or student not attended for student ${record.studentId}`);
        return;
      }
      
      // Create enriched history record with student data
      const enrichedRecord = {
        studentId: record.studentId,
        week: record.week,
        main_center: student.main_center || 'n/a',
        center: weekData.lastAttendanceCenter || 'n/a',
        attendanceDate: weekData.lastAttendance || 'n/a',
        hwDone: weekData.hwDone || false,
        paidSession: weekData.paidSession || false,
        quizDegree: weekData.quizDegree || null,
        message_state: weekData.message_state || false
      };
      
      // Group by student
      if (!studentHistoryMap.has(record.studentId)) {
        studentHistoryMap.set(record.studentId, {
          id: student.id,
          name: student.name,
          grade: student.grade,
          school: student.school,
          phone: student.phone,
          parentsPhone: student.parentsPhone,
          historyRecords: []
        });
      }
      
      studentHistoryMap.get(record.studentId).historyRecords.push(enrichedRecord);
    });
    
    // Convert map to array and sort by student ID
    const result = Array.from(studentHistoryMap.values()).sort((a, b) => a.id - b.id);
    
    console.log('📈 Returning history for', result.length, 'students with attendance records');
    res.json(result);
  } catch (error) {
    if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
      res.status(401).json({ error: error.message });
    } else {
      console.error('Error fetching history data:', error);
      res.status(500).json({ error: 'Failed to fetch history data' });
    }
  } finally {
    if (client) await client.close();
  }
} 