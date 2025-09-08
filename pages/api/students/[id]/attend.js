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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  const student_id = parseInt(id);
  const { attended, lastAttendance, lastAttendanceCenter, attendanceWeek } = req.body;
  
  console.log('🎯 Toggling attendance for student:', student_id);
  console.log('📅 Attendance data:', { attended, lastAttendance, lastAttendanceCenter, attendanceWeek });
  
  let client;
  try {
    client = await MongoClient.connect(MONGO_URI);
    const db = client.db(DB_NAME);
    
    // Verify authentication
    const user = await authMiddleware(req);
    console.log('✅ Authentication successful for user:', user.assistant_id);
    
    // Get the student data first
    const student = await db.collection('students').findOne({ id: student_id });
    if (!student) {
      console.log('❌ Student not found:', student_id);
      return res.status(404).json({ error: 'Student not found' });
    }
    console.log('✅ Found student:', student.name);
    
    // Determine which week to update
    const weekNumber = attendanceWeek || 1;
    const weekIndex = weekNumber - 1; // Convert to array index
    
    // Check if weeks array exists and has enough elements
    if (!student.weeks || student.weeks.length <= weekIndex) {
      console.log('❌ Week index out of bounds:', weekIndex, 'for student:', student_id);
      return res.status(400).json({ error: 'Invalid week number' });
    }
    
    if (attended) {
      // Mark as attended
      const updateQuery = {
        [`weeks.${weekIndex}.attended`]: true,
        [`weeks.${weekIndex}.lastAttendance`]: lastAttendance || null,
        [`weeks.${weekIndex}.lastAttendanceCenter`]: lastAttendanceCenter || null
      };
      
      const result = await db.collection('students').updateOne(
        { id: student_id },
        { $set: updateQuery }
      );
      
      if (result.matchedCount === 0) {
        console.log('❌ Failed to update student:', student_id);
        return res.status(404).json({ error: 'Student not found' });
      }
      console.log('✅ Student marked as attended for week', weekNumber);
      
      // Create simplified history record (only studentId and week)
      const historyRecord = {
        studentId: student.id,
        week: weekNumber
      };
      
      console.log('📝 Creating simplified history record:', historyRecord);
      const historyResult = await db.collection('history').insertOne(historyRecord);
      console.log('✅ History record created with ID:', historyResult.insertedId);
      
    } else {
      // Mark as not attended (unattend)
      // Also reset hw, paid, and quiz since student didn't attend
      const updateQuery = {
        [`weeks.${weekIndex}.attended`]: false,
        [`weeks.${weekIndex}.lastAttendance`]: null,
        [`weeks.${weekIndex}.lastAttendanceCenter`]: null,
        [`weeks.${weekIndex}.hwDone`]: false,
        [`weeks.${weekIndex}.paidSession`]: false,
        [`weeks.${weekIndex}.quizDegree`]: null,
        [`weeks.${weekIndex}.message_state`]: false
      };
      
      const result = await db.collection('students').updateOne(
        { id: student_id },
        { $set: updateQuery }
      );
      
      if (result.matchedCount === 0) {
        console.log('❌ Failed to update student:', student_id);
        return res.status(404).json({ error: 'Student not found' });
      }
      console.log('✅ Student marked as not attended for week', weekNumber);
      
      // Remove simplified history record for this student and week
      const historyDeleteResult = await db.collection('history').deleteMany({
        studentId: student_id,
        week: weekNumber
      });
      console.log('🗑️ Removed', historyDeleteResult.deletedCount, 'history records');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error in attend endpoint:', error);
    if (error.message.includes('Unauthorized') || error.message.includes('Invalid token')) {
      res.status(401).json({ error: error.message });
    } else {
      console.error('Error toggling attendance:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    if (client) await client.close();
  }
} 