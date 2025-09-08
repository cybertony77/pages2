import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { AVAILABLE_CENTERS } from "../../constants/centers";
import Title from "../../components/Title";
import AttendanceWeekSelect from "../../components/AttendanceWeekSelect";
import CenterSelect from "../../components/CenterSelect";
import QRScanner from "../../components/QRScanner";
import { useStudents, useStudent, useToggleAttendance, useUpdateHomework, useUpdatePayment, useUpdateQuizGrade } from "../../lib/api/students";

// Helper to extract student ID from QR text (URL or plain number)
function extractStudentId(qrText) {
  try {
    // Try to parse as URL and extract id param
    const url = new URL(qrText);
    const id = url.searchParams.get('id');
    if (id) return id;
  } catch (e) {
    // Not a URL, fall through
  }
  // Fallback: if it's just a number
  if (/^\d+$/.test(qrText)) {
    return qrText;
  }
  return null;
}

export default function QR() {
  const containerRef = useRef(null);
  const [studentId, setStudentId] = useState("");
  const [searchId, setSearchId] = useState(""); // Separate state for search
  const [error, setError] = useState("");
  const [attendSuccess, setAttendSuccess] = useState(false);
  const [attendanceCenter, setAttendanceCenter] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [quizDegreeInput, setQuizDegreeInput] = useState("");
  const [quizDegreeOutOf, setQuizDegreeOutOf] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null); // 'week', 'center', or null
  // Simple optimistic state for immediate UI feedback
  const [optimisticHwDone, setOptimisticHwDone] = useState(null);
  const [optimisticPaidSession, setOptimisticPaidSession] = useState(null);
  const [optimisticAttended, setOptimisticAttended] = useState(null);
  const [isQRScanned, setIsQRScanned] = useState(false); // Track if student was found via QR scan
  const [searchResults, setSearchResults] = useState([]); // Store multiple search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Show/hide search results
  const router = useRouter();

  // React Query hooks with enhanced real-time updates
  const { data: rawStudent, isLoading: studentLoading, error: studentError } = useStudent(searchId, { 
    enabled: !!searchId,
    // Optimized for fast error responses
    refetchInterval: 2 * 1000, // Refetch every 2 seconds for faster updates
    refetchIntervalInBackground: true, // Continue when tab is not active
    refetchOnWindowFocus: true, // Immediate update when switching back to tab
    staleTime: 0, // Always consider data stale for immediate updates
    gcTime: 1000, // Keep in cache for only 1 second to force fresh data
    retry: 1, // Only retry once to show errors faster
    retryDelay: 500, // Retry after 500ms instead of default longer delay
  });
  
  // Get all students for name-based search
  const { data: allStudents } = useStudents();
  const toggleAttendanceMutation = useToggleAttendance();
  const updateHomeworkMutation = useUpdateHomework();
  const updatePaymentMutation = useUpdatePayment();
  const updateQuizGradeMutation = useUpdateQuizGrade();

  // Load remembered values from sessionStorage
  useEffect(() => {
    const rememberedCenter = sessionStorage.getItem('lastAttendanceCenter');
    const rememberedWeek = sessionStorage.getItem('lastSelectedWeek');
    
    console.log('Loading from session storage:', { rememberedCenter, rememberedWeek });
    
    if (rememberedCenter) {
      setAttendanceCenter(rememberedCenter);
      console.log('Center loaded from session storage:', rememberedCenter);
    }
    if (rememberedWeek) {
      setSelectedWeek(rememberedWeek);
      console.log('Week loaded from session storage:', rememberedWeek);
    }
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem("token");
    if (!t) {
      router.push("/");
      return;
    }
  }, [router]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
        // Also blur any focused input to close browser autocomplete
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
          document.activeElement.blur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to convert week string to numeric index
  const getWeekNumber = (weekString) => {
    if (!weekString) return null;
    const match = weekString.match(/week (\d+)/);
    const result = match ? parseInt(match[1]) : null;
    console.log('🔧 Converting week string:', { weekString, result });
    return result;
  };

  // Helper function to get current week data
  const getCurrentWeekData = (student, weekString) => {
    if (!student.weeks || !weekString) return null;
    const weekNumber = getWeekNumber(weekString);
    if (!weekNumber) return null;
    const weekIndex = weekNumber - 1;
    return student.weeks[weekIndex] || null;
  };

  // Helper function to update student state with current week data
  const updateStudentWithWeekData = (student, weekString) => {
    const weekData = getCurrentWeekData(student, weekString);
    if (!weekData) return student;
    
    return {
      ...student,
      attended_the_session: weekData.attended,
      lastAttendance: weekData.lastAttendance,
      lastAttendanceCenter: weekData.lastAttendanceCenter,
      hwDone: weekData.hwDone,
      paidSession: weekData.paidSession,
      quizDegree: weekData.quizDegree
    };
  };

  // Update student data with current week information using useMemo
  const student = useMemo(() => {
    if (rawStudent && selectedWeek) {
      return updateStudentWithWeekData(rawStudent, selectedWeek);
    }
    return rawStudent;
  }, [rawStudent, selectedWeek]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    
    const searchTerm = studentId.trim();
    
    // Mark that this is a manual search, not QR scan
    setIsQRScanned(false);
    setSearchResults([]);
    setShowSearchResults(false);
    
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

  // Handle student selection from search results
  const handleStudentSelect = (selectedStudent) => {
    setSearchId(selectedStudent.id.toString());
    setStudentId(selectedStudent.id.toString());
    setSearchResults([]);
    setShowSearchResults(false);
    setError("");
    setIsQRScanned(false); // Mark as manual search
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    
  }, [studentId, student]);

  // Auto-attend student function
  const autoAttendStudent = async (studentId) => {
    try {
      console.log('🤖 Auto-attending student:', student.name, 'for week:', selectedWeek, 'center:', attendanceCenter);
      
      // Set optimistic state immediately
      setOptimisticAttended(true);
      
      const weekNumber = getWeekNumber(selectedWeek);
      
      // Create attendance data
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const lastAttendance = `${day}/${month}/${year} in ${attendanceCenter}`;
      
      const attendanceData = { 
        attended: true,
        lastAttendance, 
        lastAttendanceCenter: attendanceCenter, 
        attendanceWeek: weekNumber 
      };
      
      // Call the attendance API
      toggleAttendanceMutation.mutate({
        id: student.id,
        attendanceData
      });
      
    } catch (error) {
      console.error('Error in auto-attend:', error);
      // Reset optimistic state on error
      setOptimisticAttended(null);
    }
  };

  // Handle QR code scanned from the QRScanner component
  const handleQRCodeScanned = (scannedStudentId) => {
    setError("");
    setAttendSuccess(false);
    setStudentId(scannedStudentId);
    setSearchId(scannedStudentId);
    
    // Only mark as QR scanned if center and week are already selected
    // This prevents auto-attendance if student is scanned before selecting center/week
    if (attendanceCenter && selectedWeek) {
      setIsQRScanned(true); // Mark that this student was found via QR scan with conditions met
    } else {
      setIsQRScanned(false); // Don't auto-attend if conditions not met at scan time
    }
  };

  // Handle QR scanner errors
  const handleQRScannerError = (errorMessage) => {
    // Handle both Error objects and strings
    if (errorMessage instanceof Error) {
      console.log(errorMessage.message || 'An error occurred');
    } else {
      console.log(errorMessage);
    }
  };

  // Auto-hide error after 6 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError("") , 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle student errors from React Query with immediate feedback
  useEffect(() => {
    if (studentError) {
      setError("Student not found or unauthorized.");
    }
  }, [studentError]);

  // Show immediate error when searchId changes but no student is found after a short delay
  useEffect(() => {
    if (searchId && !studentLoading) {
      const timer = setTimeout(() => {
        if (!rawStudent && !studentError) {
          setError("Student not found or unauthorized.");
        }
      }, 1000); // Show error after 1 second if no data and no error
      
      return () => clearTimeout(timer);
    }
  }, [searchId, studentLoading, rawStudent, studentError]);

  // Clear optimistic state when student or week changes
  useEffect(() => {
    setOptimisticHwDone(null);
    setOptimisticPaidSession(null);
    setOptimisticAttended(null);
  }, [student?.id, selectedWeek]);

  // Auto-attend student when conditions are met (ONLY for QR scans with pre-selected center/week)
  useEffect(() => {
    // Only auto-attend if:
    // 1. Student data is loaded
    // 2. Center and week are selected
    // 3. Student is not already attended
    // 4. We haven't already set optimistic attendance
    // 5. Student was found via QR scan AND center/week were already selected at scan time
    if (student && attendanceCenter && selectedWeek && !student.attended_the_session && optimisticAttended === null && isQRScanned) {
      // Add a small delay to ensure UI is ready
      const timer = setTimeout(() => {
        autoAttendStudent(student.id);
      }, 800); // 800ms delay for better UX
      
      return () => clearTimeout(timer);
    }
  }, [student, attendanceCenter, selectedWeek, optimisticAttended, isQRScanned]);

  // Reset HW/Paid optimistic states when attendance becomes false
  useEffect(() => {
    const currentAttended = optimisticAttended !== null ? optimisticAttended : student?.attended_the_session;
    if (currentAttended === false) {
      // If attendance is false, reset other optimistic states to false/null
      setOptimisticHwDone(false);
      setOptimisticPaidSession(false);
      // Clear quiz degree inputs as well
      setQuizDegreeInput("");
      setQuizDegreeOutOf("");
      // Note: Quiz degree in DB will be handled by the backend reset
    }
  }, [optimisticAttended, student?.attended_the_session]);




  const toggleAttendance = async () => {
    if (!student || !selectedWeek || !attendanceCenter) return;
    
    // Use current displayed state (optimistic if available, otherwise DB state)
    const currentAttended = optimisticAttended !== null ? optimisticAttended : student.attended_the_session;
    const newAttended = !currentAttended;
    setOptimisticAttended(newAttended);
    
    const weekNumber = getWeekNumber(selectedWeek);
    
    let attendanceData;
    if (newAttended) {
      // Mark as attended - create timestamp and center info
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const lastAttendance = `${day}/${month}/${year} in ${attendanceCenter}`;
      
      attendanceData = { 
        attended: true,
        lastAttendance, 
        lastAttendanceCenter: attendanceCenter, 
        attendanceWeek: weekNumber 
      };
    } else {
      // Mark as not attended - clear attendance info
      attendanceData = { 
        attended: false,
        lastAttendance: null, 
        lastAttendanceCenter: null, 
        attendanceWeek: weekNumber 
      };
    }
    
    console.log('🎯 Scan Page - Toggling attendance:', {
      studentId: student.id,
      studentName: student.name,
      newAttendedState: newAttended,
      weekNumber
    });

    toggleAttendanceMutation.mutate({
      id: student.id,
      attendanceData
    });
  };

  const toggleHwDone = async () => {
    if (!student || !selectedWeek || !attendanceCenter) return;
    
    // Check if student is attended - can't do homework if not attended
    const currentAttended = optimisticAttended !== null ? optimisticAttended : student.attended_the_session;
    if (!currentAttended) {
      setError("Student must be marked as attended before homework can be updated.");
      return;
    }
    
    // Use current displayed state (optimistic if available, otherwise DB state)
    const currentHwDone = optimisticHwDone !== null ? optimisticHwDone : student.hwDone;
    const newHwDone = !currentHwDone;
    setOptimisticHwDone(newHwDone);
    
    const weekNumber = getWeekNumber(selectedWeek);
    
    updateHomeworkMutation.mutate({
      id: student.id,
      homeworkData: { hwDone: newHwDone, week: weekNumber }
    });
  };

  const togglePaidSession = async () => {
    if (!student || !selectedWeek || !attendanceCenter) return;
    
    // Check if student is attended - can't pay if not attended
    const currentAttended = optimisticAttended !== null ? optimisticAttended : student.attended_the_session;
    if (!currentAttended) {
      setError("Student must be marked as attended before payment can be updated.");
      return;
    }
    
    // Use current displayed state (optimistic if available, otherwise DB state)
    const currentPaidSession = optimisticPaidSession !== null ? optimisticPaidSession : student.paidSession;
    const newPaidSession = !currentPaidSession;
    setOptimisticPaidSession(newPaidSession);
    
    const weekNumber = getWeekNumber(selectedWeek);
    
    updatePaymentMutation.mutate({
      id: student.id,
      paymentData: { paidSession: newPaidSession, week: weekNumber }
    });
  };

  // Add form handler for quiz degree
  const handleQuizFormSubmit = async (e) => {
    e.preventDefault();
    await handleQuizDegreeSubmit();
  };

  const handleQuizDegreeSubmit = async () => {
    if (!student || !selectedWeek || !attendanceCenter) return;
    if (quizDegreeInput === "" || quizDegreeOutOf === "") return;
    
    // Check if student is attended - can't enter quiz if not attended
    const currentAttended = optimisticAttended !== null ? optimisticAttended : student.attended_the_session;
    if (!currentAttended) {
      setError("Student must be marked as attended before quiz degree can be entered.");
      return;
    }
    
    const quizDegreeValue = `${quizDegreeInput} / ${quizDegreeOutOf}`;
    const weekNumber = getWeekNumber(selectedWeek);
    
    updateQuizGradeMutation.mutate({
      id: student.id,
      quizData: { quizDegree: quizDegreeValue, week: weekNumber }
    });
    
    // Clear inputs after submission
    setQuizDegreeInput("");
    setQuizDegreeOutOf("");
  };



  const goBack = () => {
    router.push("/dashboard");
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      padding: "20px 5px 20px 5px",
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
        .back-btn {
          background: linear-gradient(90deg, #6c757d 0%, #495057 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .back-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .input-section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }
        .input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .manual-input {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #ffffff;
          color: #000000;
        }
        .manual-input:focus {
          outline: none;
          border-color: #87CEEB;
          background: white;
          box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.1);
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
        .fetch-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 2px 8px rgba(31, 168, 220, 0.2);
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
        .student-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border: 1px solid rgba(255,255,255,0.2);
        }
        .student-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #495057;
          margin-bottom: 16px;
          border-bottom: 2px solid #e9ecef;
          padding-bottom: 12px;
        }
        .student-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          background: #ffffff;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid #e9ecef;
          border-left: 4px solid #1FA8DC;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }
        .info-item.select-item {
          border-left: 2px solid #e9ecef;
        }
        .info-label {
          font-weight: 700;
          color: #6c757d;
          font-size: 0.85rem;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .info-value {
          color: #212529;
          font-size: 1.2rem;
          font-weight: 600;
          line-height: 1.4;
        }
        .status-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }
        .status-badge {
          padding: 8px 16px;
          border-radius: 25px;
          font-weight: 600;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: fit-content;
          white-space: nowrap;
        }
        .status-attended {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
        }
        .status-not-attended {
          background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
          color: white;
        }
        .mark-attended-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
          width: 100%;
        }
        .mark-attended-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
        }
        .success-message {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border-radius: 10px;
          padding: 16px;
          margin-top: 16px;
          text-align: center;
          font-weight: 600;
          box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
        }
        .mark-hw-btn {
          transition: background 0.2s, color 0.2s;
        }
        .select-styled {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          font-size: 1rem;
          background: #fff;
          color: #222;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin-top: 4px;
          box-sizing: border-box;
        }
        .select-styled:focus {
          outline: none;
          border-color: #87CEEB;
          box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.1);
        }
        .quiz-row {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-top: 10px;
          margin-bottom: 16px;
          width: 100%;
        }
        .quiz-input {
          width: 40%;
          min-width: 0;
        }
        .quiz-btn {
          width: 20%;
          min-width: 70px;
          padding-left: 0;
          padding-right: 0;
        }
        .quiz-inputs-container {
          display: flex;
          gap: 8px;
          width: 80%;
        }
        @media (max-width: 600px) {
          .quiz-row {
            flex-direction: column;
            gap: 8px;
          }
          .quiz-input, .quiz-btn {
            width: 100%;
          }
          .quiz-inputs-container {
            display: flex;
            gap: 8px;
            width: 100%;
          }
          .quiz-input {
            width: 50%;
          }
        }
        @media (max-width: 768px) {
          .student-info {
            gap: 12px;
          }
          .status-row {
            flex-direction: column;
            gap: 8px;
          }
          .status-badge {
            justify-content: center;
            width: 100%;
          }
          .info-item {
            padding: 16px;
          }
          .info-value {
            font-size: 1rem;
          }
          .input-group {
            flex-direction: column;
            gap: 12px;
          }
          .fetch-btn {
            width: 100%;
            padding: 14px 20px;
            font-size: 0.95rem;
          }
          .manual-input {
            width: 100%;
          }
        }
        @media (max-width: 480px) {
          .student-info {
            gap: 10px;
          }
          .info-item {
            padding: 14px;
          }
          .info-label {
            font-size: 0.8rem;
          }
          .info-value {
            font-size: 0.95rem;
          }
          .status-badge {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
        }
      `}</style>

             <Title>QR Code Scanner</Title>

      <div className="input-section">
        <form onSubmit={handleManualSubmit} className="input-group">
                  <input
          className="manual-input"
          type="text"
          placeholder="Enter student ID or Name"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setSearchId(""); // Clear search ID to prevent auto-fetch
            setIsQRScanned(false); // Reset QR scan flag when input changes
            setSearchResults([]);
            setShowSearchResults(false);
            // Clear error and success when input changes
            if (e.target.value !== studentId) {
              setError("");
              setAttendSuccess(false);
            }
          }}
        />
          <button type="submit" className="fetch-btn">
            🔍 Search
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

      {/* Week and Center Selection - Always visible */}
      <div style={{ 
        background: 'white', 
        borderRadius: 16, 
        padding: 24, 
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)', 
        marginBottom: 24 
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Attendance Center */}
          <div>
            <div style={{ 
              fontWeight: 600, 
              color: '#6c757d', 
              fontSize: '0.9rem', 
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Attendance Center
            </div>
            <CenterSelect
              selectedCenter={attendanceCenter}
              onCenterChange={(center) => {
                setAttendanceCenter(center);
                // Remember the selected center
                if (center) {
                  sessionStorage.setItem('lastAttendanceCenter', center);
                } else {
                  // Clear selection - remove from sessionStorage
                  sessionStorage.removeItem('lastAttendanceCenter');
                }
              }}
            />
          </div>
          
          {/* Attendance Week */}
          <div>
            <div style={{ 
              fontWeight: 600, 
              color: '#6c757d', 
              fontSize: '0.9rem', 
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Attendance Week
            </div>
            <AttendanceWeekSelect
              selectedWeek={selectedWeek}
              onWeekChange={(week) => {
                console.log('Week selected:', week);
                setSelectedWeek(week);
                // Save to session storage
                if (week) {
                  sessionStorage.setItem('lastSelectedWeek', week);
                  console.log('Week saved to session storage:', week);
                } else {
                  // Clear selection - remove from sessionStorage
                  sessionStorage.removeItem('lastSelectedWeek');
                  console.log('Week removed from session storage');
                }
              }}
              required={true}
            />
          </div>
        </div>
      </div>

      <QRScanner 
        onQRCodeScanned={handleQRCodeScanned}
        onError={handleQRScannerError}
      />

      {student && (
        <div className="student-card">
          <div className="student-name">{student.name}</div>
                  
          <div className="student-info">
              {student.grade && (
              <div className="info-item">
                <span className="info-label">Grade</span>
                <span className="info-value">{student.grade}</span>
              </div>
              )}
            {student.main_center && (
            <div className="info-item">
              <span className="info-label">Main Center</span>
              <span className="info-value">{student.main_center}</span>
            </div>
            )}
            {student.school && (
            <div className="info-item">
              <span className="info-label">School</span>
              <span className="info-value">{student.school}</span>
            </div>
            )}
          </div>

          <div className="status-row">
            <span className={`status-badge ${(!attendanceCenter || !selectedWeek) 
              ? 'status-not-attended' 
              : (optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                ? 'status-attended' 
                : 'status-not-attended'}`}>
              {(!attendanceCenter || !selectedWeek) 
                ? '❌ Not Attended' 
                : (optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                  ? '✅ Attended' 
                  : '❌ Not Attended'}
            </span>
            <span className={`status-badge ${(!attendanceCenter || !selectedWeek) 
              ? 'status-not-attended' 
              : (optimisticHwDone !== null ? optimisticHwDone : student.hwDone) 
                ? 'status-attended' 
                : 'status-not-attended'}`}>
              {(!attendanceCenter || !selectedWeek) 
                ? '❌ H.W: Not Done' 
                : (optimisticHwDone !== null ? optimisticHwDone : student.hwDone) 
                  ? '✅ H.W: Done' 
                  : '❌ H.W: Not Done'}
            </span>
            <span className={`status-badge ${(!attendanceCenter || !selectedWeek) 
              ? 'status-not-attended' 
              : (optimisticPaidSession !== null ? optimisticPaidSession : student.paidSession) 
                ? 'status-attended' 
                : 'status-not-attended'}`}>
              {(!attendanceCenter || !selectedWeek) 
                ? '❌ Not Paid' 
                : (optimisticPaidSession !== null ? optimisticPaidSession : student.paidSession) 
                  ? '✅ Paid' 
                  : '❌ Not Paid'}
            </span>
            <span className={`status-badge ${(!attendanceCenter || !selectedWeek) 
              ? 'status-not-attended' 
              : student.quizDegree 
                ? 'status-attended' 
                : 'status-not-attended'}`}>
              {(!attendanceCenter || !selectedWeek) 
                ? '❌ Quiz: ...' 
                : student.quizDegree 
                  ? `✅ Quiz: ${student.quizDegree}` 
                  : '❌ Quiz: ...'}
            </span>
          </div>

          {/* Show current attendance info if student is attended AND center/week are selected */}
          {(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) && student.lastAttendance && attendanceCenter && selectedWeek && (
            <div className="info-item">
              <div className="info-label">Attendance info:</div>
              <div className="info-value" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {student.lastAttendance}
              </div>
            </div>
          )}
          

          {/* Warning message when week/center not selected */}
          {(!selectedWeek || !attendanceCenter) && (
            <div style={{
              background: 'linear-gradient(135deg, #ffc107 0%, #ffb74d 100%)',
              color: 'white',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 8,
              textAlign: 'center',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(255, 193, 7, 0.3)',
              fontSize: '0.9rem'
            }}>
              ⚠️ Please select both a attendance week and attendance center to enable tracking attendance
            </div>
          )}

          {/* Simple toggle buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            
            {/* Attendance Toggle Button - Always visible */}
            <button
              className="toggle-btn"
              onClick={toggleAttendance}
              disabled={!attendanceCenter || !selectedWeek}
              style={{
                width: '100%',
                background: (!attendanceCenter || !selectedWeek) 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' // Default "Not Attended" state
                  : (optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                    ? 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)' 
                    : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '1.1rem',
                padding: '14px 0',
                cursor: (!attendanceCenter || !selectedWeek) ? 'not-allowed' : 'pointer',
                opacity: (!attendanceCenter || !selectedWeek) ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {(!attendanceCenter || !selectedWeek) 
                ? '✅ Mark as Attended' 
                : (optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                  ? '❌ Mark as Not Attended' 
                  : '✅ Mark as Attended'}
            </button>

            {/* Homework Toggle Button */}
            <button
              className="toggle-btn"
              onClick={toggleHwDone}
              disabled={!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)}
              style={{
                width: '100%',
                background: (!attendanceCenter || !selectedWeek) 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' // Default "Not Done" state
                  : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                      ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)' // Gray when not attended
                    : (optimisticHwDone !== null ? optimisticHwDone : student.hwDone) 
                      ? 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)' 
                      : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '1.1rem',
                padding: '14px 0',
                cursor: (!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 'not-allowed' : 'pointer',
                opacity: (!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {(!attendanceCenter || !selectedWeek) 
                ? '✅ Mark as H.W Done' 
                : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                  ? '🚫 Must Attend First' 
                  : (optimisticHwDone !== null ? optimisticHwDone : student.hwDone) 
                    ? '❌ Mark as H.W Not Done' 
                    : '✅ Mark as H.W Done'}
            </button>

            {/* Payment Toggle Button */}
            <button
              className="toggle-btn"
              onClick={togglePaidSession}
              disabled={!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)}
              style={{
                width: '100%',
                background: (!attendanceCenter || !selectedWeek) 
                  ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' // Default "Not Paid" state
                  : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                    ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)' // Gray when not attended
                    : (optimisticPaidSession !== null ? optimisticPaidSession : student.paidSession) 
                      ? 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)' 
                      : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: '1.1rem',
                padding: '14px 0',
                cursor: (!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 'not-allowed' : 'pointer',
                opacity: (!attendanceCenter || !selectedWeek || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 0.5 : 1,
                transition: 'all 0.3s ease'
              }}
            >
              {(!attendanceCenter || !selectedWeek) 
                ? '✅ Mark as Paid' 
                : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) 
                  ? '🚫 Must Attend First' 
                  : (optimisticPaidSession !== null ? optimisticPaidSession : student.paidSession) 
                    ? '❌ Mark as Not Paid' 
                    : '✅ Mark as Paid'}
            </button>

          </div>

          {/* Quiz degree input section */}
          <div className="info-label" style={{ marginBottom: 6, marginTop: 10, textAlign: 'start', fontWeight: 600 }}>
            Quiz Degree
          </div>
          <form onSubmit={handleQuizFormSubmit} className="quiz-row">
            <div className="quiz-inputs-container">
            <input
              type="number"
              step="any"
              min="0"
              className="manual-input quiz-input"
              placeholder={
                (!selectedWeek || !attendanceCenter) ? "Select week and center first..." 
                : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) ? "Must attend first..."
                : "degree ..."
              }
              value={quizDegreeInput}
              onChange={e => setQuizDegreeInput(e.target.value)}
              disabled={updateQuizGradeMutation.isPending || !selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)}
              style={{
                opacity: (!selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 0.5 : 1,
                cursor: (!selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 'not-allowed' : 'text'
              }}
            />
            <input
              type="number"
              step="any"
              min="0"
              className="manual-input quiz-input"
              placeholder={
                (!selectedWeek || !attendanceCenter) ? "Select week and center first..." 
                : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) ? "Must attend first..."
                : "out of ..."
              }
              value={quizDegreeOutOf}
              onChange={e => setQuizDegreeOutOf(e.target.value)}
              disabled={updateQuizGradeMutation.isPending || !selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)}
              style={{
                opacity: (!selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 0.5 : 1,
                cursor: (!selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 'not-allowed' : 'text'
              }}
            />
            </div>
            <button
              type="submit"
              className="fetch-btn quiz-btn"
              disabled={updateQuizGradeMutation.isPending || quizDegreeInput === "" || quizDegreeOutOf === "" || !selectedWeek || !attendanceCenter || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)}
              style={{
                opacity: (!selectedWeek || !attendanceCenter || quizDegreeInput === "" || quizDegreeOutOf === "" || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 0.5 : 1,
                cursor: (!selectedWeek || !attendanceCenter || quizDegreeInput === "" || quizDegreeOutOf === "" || !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session)) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
              title={
                !selectedWeek ? 'Please select a week first' 
                : !attendanceCenter ? 'Please select an attendance center first' 
                : !(optimisticAttended !== null ? optimisticAttended : student.attended_the_session) ? 'Student must attend first'
                : (quizDegreeInput === "" || quizDegreeOutOf === "") ? 'Please fill both fields' 
                : ''
              }
            >
              {updateQuizGradeMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </form>
        </div>
      )}



      {/* Error message now appears below the student card */}
      {error && (
        <div className="error-message">
          ❌ {typeof error === 'string' ? error : 'An error occurred'}
        </div>
      )}
      </div>
    </div>
  );
}