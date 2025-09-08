import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Title from "../../components/Title";
import { Table, ScrollArea } from '@mantine/core';
import { weeks } from "../../constants/weeks";
import styles from '../../styles/TableScrollArea.module.css';
import { useStudents, useStudent } from '../../lib/api/students';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function StudentInfo() {
  const containerRef = useRef(null);
  const [studentId, setStudentId] = useState("");
  const [searchId, setSearchId] = useState(""); // Separate state for search
  const [error, setError] = useState("");
  const [studentDeleted, setStudentDeleted] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Store multiple search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Show/hide search results
  const router = useRouter();

  // Get all students for name-based search
  const { data: allStudents } = useStudents();
  
  // React Query hook with real-time updates - 5 second polling
  const { data: student, isLoading: studentLoading, error: studentError, refetch: refetchStudent, isRefetching, dataUpdatedAt } = useStudent(searchId, { 
    enabled: !!searchId,
    // Aggressive real-time settings for immediate updates
    refetchInterval: 5 * 1000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue when tab is not active
    refetchOnWindowFocus: true, // Immediate update when switching back to tab
    refetchOnReconnect: true, // Refetch when reconnecting to internet
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 1000, // Keep in cache for only 1 second
    refetchOnMount: true, // Always refetch when component mounts/page entered
  });

  // Debug logging for React Query status
  useEffect(() => {
    if (student && searchId) {
      console.log('🔄 Student Info Page - Data Status:', {
        studentId: searchId,
        studentName: student.name,
        isRefetching,
        dataUpdatedAt: new Date(dataUpdatedAt).toLocaleTimeString(),
        attendanceStatus: student.weeks?.[0]?.attended || false
      });
    }
  }, [student, isRefetching, dataUpdatedAt, searchId]);

  useEffect(() => {
    if (error && !studentDeleted) {
      // Only auto-hide errors that are NOT "student deleted" errors
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, studentDeleted]);

  // Handle student error
  useEffect(() => {
    if (studentError) {
      if (studentError.response?.status === 404) {
        console.log('❌ Student Info Page - Student not found:', {
          searchId,
          error: 'Student deleted or does not exist',
          timestamp: new Date().toLocaleTimeString()
        });
        setStudentDeleted(true);
        setError("Student not exists - This student may have been deleted");
      } else {
        console.log('❌ Student Info Page - Error fetching student:', {
          searchId,
          error: studentError.message,
          timestamp: new Date().toLocaleTimeString()
        });
        setStudentDeleted(false);
        setError("Error fetching student data");
      }
    } else {
      // Clear error when student data loads successfully
      if (student && !studentError) {
        setStudentDeleted(false);
        setError("");
      }
    }
  }, [studentError, searchId, student]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
  }, [router]);

  // Force refetch student data when searchId changes (when student is searched)
  useEffect(() => {
    if (searchId && refetchStudent) {
      refetchStudent();
    }
  }, [searchId, refetchStudent]);

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    
    setError("");
    setStudentDeleted(false); // Reset deletion state for new search
    setSearchResults([]);
    setShowSearchResults(false);
    
    const searchTerm = studentId.trim();
    
    // Check if it's a numeric ID
    if (/^\d+$/.test(searchTerm)) {
      // It's a numeric ID, search directly
      setSearchId(searchTerm);
    } else {
      // It's a name, search through all students (case-insensitive, includes)
      if (allStudents) {
        const matchingStudents = allStudents.filter(student => 
          student.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingStudents.length === 1) {
          // Single match, use it directly
          const foundStudent = matchingStudents[0];
          setSearchId(foundStudent.id.toString());
          setStudentId(foundStudent.id.toString());
        } else if (matchingStudents.length > 1) {
          // Multiple matches, show selection
          setSearchResults(matchingStudents);
          setShowSearchResults(true);
          setError(`Found ${matchingStudents.length} students. Please select one.`);
        } else {
          setError(`No student found with name starting with "${searchTerm}"`);
          setSearchId("");
        }
      } else {
        setError("Student data not loaded. Please try again.");
      }
    }
  };

  // Clear student data when ID input is emptied
  const handleIdChange = (e) => {
    const value = e.target.value;
    setStudentId(value);
    setSearchId(""); // Clear search ID to prevent auto-fetch
    if (!value.trim()) {
      setError("");
      setStudentDeleted(false); // Reset deletion state when clearing input
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle student selection from search results
  const handleStudentSelect = (selectedStudent) => {
    setSearchId(selectedStudent.id.toString());
    setStudentId(selectedStudent.id.toString());
    setSearchResults([]);
    setShowSearchResults(false);
    setError("");
  };

  // Helper function to get attendance status for a week
  const getWeekAttendance = (weekNumber) => {
    if (!student || !student.weeks) return { attended: false, hwDone: false, paidSession: false, quizDegree: null, message_state: false, lastAttendance: null };
    
    const weekData = student.weeks.find(w => w.week === weekNumber);
    if (!weekData) return { attended: false, hwDone: false, paidSession: false, quizDegree: null, message_state: false, lastAttendance: null };
    
    return {
      attended: weekData.attended || false,
      hwDone: weekData.hwDone || false,
      paidSession: weekData.paidSession || false,
      quizDegree: weekData.quizDegree || null,
      message_state: weekData.message_state || false,
      lastAttendance: weekData.lastAttendance || null
    };
  };

  return (
    <div style={{ 
      padding: "20px 5px 20px 5px"
    }}>
      <div ref={containerRef} style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <style jsx>{`
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
          }
          .title {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
          }
          .fetch-form {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 24px;
          }
          .fetch-input {
            flex: 1;
            padding: 14px 16px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: #ffffff;
            color: #000000;
          }
          .fetch-input:focus {
            outline: none;
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }
          .fetch-btn {
            background: linear-gradient(135deg, #1FA8DC 0%, #87CEEB 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 16px 28px;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(31, 168, 220, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 140px;
            justify-content: center;
          }
          .fetch-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(31, 168, 220, 0.4);
            background: linear-gradient(135deg, #0d8bc7 0%, #5bb8e6 100%);
          }
          .fetch-btn:active {
            transform: translateY(-1px);
            box-shadow: 0 4px 16px rgba(31, 168, 220, 0.3);
          }
          .error-message {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: white;
            border-radius: 10px;
            padding: 16px;
            margin-top: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
          }
          .form-container {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
          }
          .info-container {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            margin-top: 20px;
          }
          .student-details {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 30px;
          }
          .detail-item {
            padding: 20px;
            background: #ffffff;
            border-radius: 12px;
            border: 2px solid #e9ecef;
            border-left: 4px solid #1FA8DC;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
          }
          .detail-label {
            font-weight: 700;
            color: #6c757d;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .detail-value {
            font-size: 1rem;
            color: #212529;
            font-weight: 600;
            line-height: 1.4;
          }
          .weeks-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #495057;
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 2px solid #1FA8DC;
            padding-bottom: 10px;
          }
          
          @media (max-width: 768px) {
            .fetch-form {
              flex-direction: column;
              gap: 12px;
            }
            .fetch-btn {
              width: 100%;
              padding: 14px 20px;
              font-size: 0.95rem;
            }
            .fetch-input {
              width: 100%;
            }
            .form-container, .info-container {
              padding: 24px;
            }
            .student-details {
              gap: 12px;
            }
          }
          
          @media (max-width: 480px) {
            .form-container, .info-container {
              padding: 20px;
            }
            .detail-item {
              padding: 12px;
            }
            .detail-label {
              font-size: 0.85rem;
            }
            .detail-value {
              font-size: 1rem;
            }
            .weeks-title {
              font-size: 1.3rem;
            }
          }
        `}</style>

        <Title>Student Info</Title>

        <div className="form-container">
          <form onSubmit={handleIdSubmit} className="fetch-form">
            <input
              className="fetch-input"
              type="text"
              placeholder="Enter student ID or Name"
              value={studentId}
              onChange={handleIdChange}
              required
            />
            <button type="submit" className="fetch-btn" disabled={studentLoading}>
              {studentLoading ? "Loading..." : "🔍 Search"}
        </button>
          </form>
          
          {/* Show search results if multiple matches found */}
          {showSearchResults && searchResults.length > 0 && (
            <div style={{ 
              marginTop: "16px", 
              padding: "16px", 
              background: "#f8f9fa", 
              borderRadius: "8px", 
              border: "1px solid #dee2e6" 
            }}>
              <div style={{ 
                marginBottom: "12px", 
                fontWeight: "600", 
                color: "#495057" 
              }}>
                Select a student:
              </div>
              {searchResults.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleStudentSelect(student)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px 16px",
                    margin: "8px 0",
                    background: "white",
                    border: "1px solid #dee2e6",
                    borderRadius: "6px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#e9ecef";
                    e.target.style.borderColor = "#1FA8DC";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "white";
                    e.target.style.borderColor = "#dee2e6";
                  }}
                >
                  <div style={{ fontWeight: "600", color: "#1FA8DC" }}>
                    {student.name} (ID: {student.id})
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                    {student.grade} • {student.main_center}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {student && !studentDeleted && (
          <div className="info-container">
            <div className="student-details">
              <div className="detail-item">
                <div className="detail-label">Full Name</div>
                <div className="detail-value">{student.name}</div>
              </div>
              {student.age && (
                <div className="detail-item">
                  <div className="detail-label">Age</div>
                  <div className="detail-value">{student.age}</div>
                </div>
              )}
              <div className="detail-item">
                <div className="detail-label">Grade</div>
                <div className="detail-value">{student.grade}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">School</div>
                <div className="detail-value">{student.school || 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Student Phone</div>
                <div className="detail-value" style={{ fontFamily: 'monospace' }}>{student.phone}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Parent's Phone</div>
                <div className="detail-value" style={{ fontFamily: 'monospace' }}>{student.parents_phone}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Main Center</div>
                <div className="detail-value">{student.main_center}</div>
              </div>
            </div>
            
            <div className="weeks-title">Attendance Records - All Weeks</div>
            <ScrollArea h={400} type="hover" className={styles.scrolled}>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: '950px' }}>
                <Table.Thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Week</Table.Th>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Attendance</Table.Th>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Homework</Table.Th>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Payment</Table.Th>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Quiz Degree</Table.Th>
                    <Table.Th style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>Message Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {weeks.map((weekName, index) => {
                    const weekNumber = index + 1;
                    const weekData = getWeekAttendance(weekNumber);
                    
                    return (
                      <Table.Tr key={weekName}>
                        <Table.Td style={{ fontWeight: 'bold', color: '#1FA8DC', width: '120px', minWidth: '120px', textAlign: 'center' }}>
                          {weekName}
                        </Table.Td>
                        <Table.Td style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>
                          <span style={{ 
                            color: weekData.attended ? (weekData.lastAttendance ? '#212529' : '#28a745') : '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {weekData.attended ? (weekData.lastAttendance || '✅ Yes') : '❌ No'}
                          </span>
                        </Table.Td>
                        <Table.Td style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>
                          <span style={{ 
                            color: weekData.hwDone ? '#28a745' : '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {weekData.hwDone ? '✅ Done' : '❌ Not Done'}
                          </span>
                        </Table.Td>
                        <Table.Td style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>
                          <span style={{ 
                            color: weekData.paidSession ? '#28a745' : '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {weekData.paidSession ? '✅ Paid' : '❌ Not Paid'}
                          </span>
                        </Table.Td>
                        <Table.Td style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            color: weekData.quizDegree !== null ? '#1FA8DC' : '#6c757d'
                          }}>
                            {weekData.quizDegree !== null ? weekData.quizDegree : '0/0'}
                          </span>
                        </Table.Td>
                        <Table.Td style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>
                          <span style={{ 
                            color: weekData.message_state ? '#28a745' : '#dc3545',
                            fontWeight: 'bold',
                            fontSize: '1rem'
                          }}>
                            {weekData.message_state ? '✅ Sent' : '❌ Not Sent'}
                          </span>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}
      </div>
    </div>
  );
}
