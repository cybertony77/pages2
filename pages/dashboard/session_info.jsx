import { useEffect, useState, useRef, useMemo } from 'react';
import { AVAILABLE_CENTERS } from '../../constants/centers';
import GradeSelect from '../../components/GradeSelect';
import CenterSelect from '../../components/CenterSelect';
import AttendanceWeekSelect from '../../components/AttendanceWeekSelect';
import { SessionTable } from '../../components/SessionTable.jsx';
import Title from '../../components/Title';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import { Center, Group, Paper, RingProgress, SimpleGrid, Text } from '@mantine/core';
import { useRouter } from 'next/router';
import { useStudents } from '../../lib/api/students';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function SessionInfo() {
  const containerRef = useRef(null);
  const router = useRouter();
  const [selectedCenter, setSelectedCenter] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [filtered, setFiltered] = useState(null);
  const [showHW, setShowHW] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'grade', 'center', 'week', or null

  // React Query hook with real-time updates - 5 second polling like history page
  const { data: students = [], isLoading, error, refetch, isRefetching, dataUpdatedAt } = useStudents({}, {
    // Aggressive real-time settings for immediate updates
    refetchInterval: 5 * 1000, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue when tab is not active
    refetchOnWindowFocus: true, // Immediate update when switching back to tab
    refetchOnReconnect: true, // Refetch when reconnecting to internet
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 1000, // Keep in cache for only 1 second
    refetchOnMount: true, // Always refetch when component mounts/page entered
  });

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handle message state updates (simplified - SessionTable handles the local state)
  const handleMessageStateChange = (studentId, messageState) => {
    console.log('Message state changed for student:', studentId, 'to:', messageState);
    // SessionTable now handles the local state directly, so this is just for logging
  };



  useEffect(() => {
    // Listen for manual refresh events
    const handleRefresh = () => {
      refetch();
    };
    window.addEventListener('refreshStudents', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshStudents', handleRefresh);
    };
  }, [refetch]);

  // Debug: Log React Query status for session info
  useEffect(() => {
    console.log('Session Info React Query Status:', {
      isLoading,
      isRefetching,
      dataUpdatedAt: new Date(dataUpdatedAt).toLocaleTimeString(),
      studentsCount: students.length,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [isLoading, isRefetching, dataUpdatedAt, students.length]);

  // No need for complex state merging - SessionTable handles message states locally

  // Load remembered values from sessionStorage on component mount
  useEffect(() => {
    const rememberedCenter = sessionStorage.getItem('sessionInfoLastSelectedCenter');
    const rememberedGrade = sessionStorage.getItem('sessionInfoLastSelectedGrade');
    const rememberedWeek = sessionStorage.getItem('sessionInfoLastSelectedWeek');
    
    if (rememberedCenter) setSelectedCenter(rememberedCenter);
    if (rememberedGrade) setSelectedGrade(rememberedGrade);
    if (rememberedWeek) setSelectedWeek(rememberedWeek);
  }, []);

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

    // Also handle when a dropdown opens to close others
    const handleDropdownOpen = () => {
      // Close any open dropdowns when a new one opens
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('focusin', handleDropdownOpen);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('focusin', handleDropdownOpen);
    };
  }, [openDropdown]);

  // Get all possible centers for dropdown
  const allCenters = AVAILABLE_CENTERS;

  // Filtering logic
  const handleFilterFormSubmit = (e) => {
    e.preventDefault();
    handleFilter();
  };

  const handleFilter = () => {
    let filteredList = students;
    if (selectedGrade) {
      filteredList = filteredList.filter(s => s.grade && s.grade.toLowerCase().includes(selectedGrade.toLowerCase()));
    }
    setFiltered(filteredList);
  };

  // Trigger filtering when students data or filters change
  useEffect(() => {
    handleFilter();
  }, [students, selectedGrade, selectedCenter, selectedWeek]);

  // Helper function to get week number from week string
  const getWeekNumber = (weekString) => {
    if (!weekString) return null;
    const match = weekString.match(/week (\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  // Helper function to get student data for specific week
  const getStudentWeekData = (student, weekNumber) => {
    if (!student.weeks || !weekNumber) return student;
    const weekIndex = weekNumber - 1;
    const weekData = student.weeks[weekIndex];
    if (!weekData) return student;
    
    return {
      ...student,
      attended_the_session: weekData.attended,
      lastAttendance: weekData.lastAttendance,
      lastAttendanceCenter: weekData.lastAttendanceCenter,
      hwDone: weekData.hwDone,
      paidSession: weekData.paidSession,
      quizDegree: weekData.quizDegree,
      message_state: weekData.message_state,
      // Store the week number for WhatsApp button to use
      currentWeekNumber: weekNumber
    };
  };

  const dataToCount = filtered !== null ? filtered : students;

  // Helper function to check if student attended in specific week
  const didStudentAttendInWeek = (student, weekNumber) => {
    if (!student.weeks || !weekNumber) return false;
    const weekIndex = weekNumber - 1;
    const weekData = student.weeks[weekIndex];
    return weekData && weekData.attended;
  };

  // Helper function to check if student attended in specific center in specific week
  const didStudentAttendInCenterInWeek = (student, center, weekNumber) => {
    if (!student.weeks || !weekNumber || !center) return false;
    const weekIndex = weekNumber - 1;
    const weekData = student.weeks[weekIndex];
    return weekData && weekData.attended && weekData.lastAttendanceCenter && 
           weekData.lastAttendanceCenter.toLowerCase() === center.toLowerCase();
  };

  // Get the week number for filtering
  const weekNumber = getWeekNumber(selectedWeek);

  // Counts - now based on specific week if selected
  const attendedCount = weekNumber ? 
    dataToCount.filter(s => didStudentAttendInWeek(s, weekNumber)).length :
    dataToCount.filter(s => s.weeks && s.weeks.some(week => week.attended)).length;
    
  const notAttendedCount = weekNumber ? 
    dataToCount.filter(s => !didStudentAttendInWeek(s, weekNumber)).length :
    dataToCount.filter(s => !s.weeks || !s.weeks.some(week => week.attended)).length;
    
  const hwDoneCount = weekNumber ? 
    dataToCount.filter(s => {
      if (!s.weeks || !weekNumber) return false;
      const weekIndex = weekNumber - 1;
      const weekData = s.weeks[weekIndex];
      return weekData && weekData.hwDone;
    }).length :
    dataToCount.filter(s => s.weeks && s.weeks.some(week => week.hwDone)).length;
    
  const hwNotDoneCount = weekNumber ? 
    dataToCount.filter(s => {
      if (!s.weeks || !weekNumber) return false;
      const weekIndex = weekNumber - 1;
      const weekData = s.weeks[weekIndex];
      return weekData && !weekData.hwDone;
    }).length :
    dataToCount.filter(s => !s.weeks || !s.weeks.some(week => week.hwDone)).length;
    
  const paidCount = weekNumber ? 
    dataToCount.filter(s => {
      if (!s.weeks || !weekNumber) return false;
      const weekIndex = weekNumber - 1;
      const weekData = s.weeks[weekIndex];
      return weekData && weekData.paidSession;
    }).length :
    dataToCount.filter(s => s.weeks && s.weeks.some(week => week.paidSession)).length;
    
  const notPaidCount = weekNumber ? 
    dataToCount.filter(s => {
      if (!s.weeks || !weekNumber) return false;
      const weekIndex = weekNumber - 1;
      const weekData = s.weeks[weekIndex];
      return weekData && !weekData.paidSession;
    }).length :
    dataToCount.filter(s => !s.weeks || !s.weeks.some(week => week.paidSession)).length;

  const centerCounts = {};
  dataToCount.forEach(s => {
    if (s.weeks) {
      s.weeks.forEach(week => {
        if (week.lastAttendanceCenter) {
          // If week is selected, only count that week
          if (weekNumber && week.week !== weekNumber) return;
          centerCounts[week.lastAttendanceCenter] = (centerCounts[week.lastAttendanceCenter] || 0) + 1;
        }
      });
    }
  });

  // --- NEW METRICS LOGIC ---
  // MC: Main Center Attended (in specific week if selected)
  const MC = dataToCount.filter(s => {
    if (!selectedGrade || !selectedCenter) return false;
    
    const gradeMatch = s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '');
    const centerMatch = s.main_center && s.main_center.toLowerCase() === selectedCenter.toLowerCase();
    
    if (!gradeMatch || !centerMatch) return false;
    
    if (weekNumber) {
      // Check if attended in selected week and in selected center
      return didStudentAttendInCenterInWeek(s, selectedCenter, weekNumber);
    } else {
      // Check if attended in any week in selected center
      return s.weeks && s.weeks.some(week => 
        week.attended && week.lastAttendanceCenter && 
        week.lastAttendanceCenter.toLowerCase() === selectedCenter.toLowerCase()
      );
    }
  }).length;

  // NAMC: Not Attended but Main Center (in specific week if selected)
  const NAMC_students = dataToCount.filter(s => {
    if (!selectedGrade || !selectedCenter) return false;
    
    const gradeMatch = s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '');
    const centerMatch = s.main_center && s.main_center.toLowerCase() === selectedCenter.toLowerCase();
    
    if (!gradeMatch || !centerMatch) return false;
    
    if (weekNumber) {
      // Check if NOT attended in selected week
      return !didStudentAttendInWeek(s, weekNumber);
    } else {
      // Check if NOT attended in any week
      return !s.weeks || !s.weeks.some(week => week.attended);
    }
  });
  const NAMC = NAMC_students.length;
  const NAMC_ids = NAMC_students.map(s => s.id).join(', ');

  // Main Center denominator: all students with main_center === selectedCenter and grade === selectedGrade (regardless of attendance)
  const mainCenterTotal = dataToCount.filter(s =>
    s.main_center && s.main_center.toLowerCase() === selectedCenter.toLowerCase() &&
    s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '')
  ).length;

  // NMC: Not Main Center Attended (in specific week if selected)
  const NMC = dataToCount.filter(s => {
    if (!selectedGrade || !selectedCenter) return false;
    
    const gradeMatch = s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '');
    const centerMatch = s.main_center && s.main_center.toLowerCase() !== selectedCenter.toLowerCase();
    
    if (!gradeMatch || !centerMatch) return false;
    
    if (weekNumber) {
      // Check if attended in selected week and in selected center
      return didStudentAttendInCenterInWeek(s, selectedCenter, weekNumber);
    } else {
      // Check if attended in any week in selected center
      return s.weeks && s.weeks.some(week => 
        week.attended && week.lastAttendanceCenter && 
        week.lastAttendanceCenter.toLowerCase() === selectedCenter.toLowerCase()
      );
    }
  }).length;

  // Total Attended: MC + NMC
  const totalAttended = MC + NMC;

  // MC percent (show as MC / mainCenterTotal and percent)
  const MC_percent = mainCenterTotal > 0 ? Math.round((MC / mainCenterTotal) * 100) : 0;

  // Filtered students for table (by grade, center, and week if selected)
  let filteredStudents = (filtered !== null ? filtered : students).filter(s => {
    if (!selectedGrade || !selectedCenter) return false;
    
    const gradeMatch = s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '');
    if (!gradeMatch) return false;
    
    if (weekNumber) {
      // If week is selected, check if attended in that specific week and center
      return didStudentAttendInCenterInWeek(s, selectedCenter, weekNumber);
    } else {
      // If no week selected, check if attended in any week in selected center
      return s.weeks && s.weeks.some(week => 
        week.attended && week.lastAttendanceCenter && 
        week.lastAttendanceCenter.toLowerCase() === selectedCenter.toLowerCase()
      );
    }
  });

  // If a specific week is selected, update the student data to show that week's information
  if (selectedWeek && weekNumber) {
    filteredStudents = filteredStudents.map(student => getStudentWeekData(student, weekNumber));
  }

  // Filter for not attended students (considering week if selected)
  const notAttendedStudents = (filtered !== null ? filtered : students).filter(s => {
    if (!selectedGrade || !selectedCenter) return false;
    
    const gradeMatch = s.grade && s.grade.toLowerCase().replace(/\./g, '') === selectedGrade.toLowerCase().replace(/\./g, '');
    const centerMatch = s.main_center && s.main_center.toLowerCase() === selectedCenter.toLowerCase();
    
    if (!gradeMatch || !centerMatch) return false;
    
    if (weekNumber) {
      // Check if NOT attended in selected week
      return !didStudentAttendInWeek(s, weekNumber);
    } else {
      // Check if NOT attended in any week
      return !s.weeks || !s.weeks.some(week => week.attended);
    }
  });

  // Update not attended students with week data if week is selected
  if (selectedWeek && weekNumber) {
    notAttendedStudents.forEach(student => {
      Object.assign(student, getStudentWeekData(student, weekNumber));
    });
  }

  return (
    <div style={{ minHeight: '100vh', padding: '20px 5px 20px 5px' }}>
              <div ref={containerRef} style={{ maxWidth: 600, margin: '20px auto', padding: 24 }}>
        <style jsx>{`
          .title {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 24px;
            text-align: center;
          }
          .counts-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-around;
            gap: 32px 12px;
            color: #000000;
          }
          .circle-metric {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 140px;
            margin-bottom: 12px;
            color: #000000;
          }
          .circle-label {
            font-weight: 600;
            color: #495057;
            margin-top: 12px;
            margin-bottom: 2px;
            font-size: 1.1rem;
          }
          .circle-count {
            color: #222;
            font-size: 1rem;
            margin-top: 2px;
          }
          .circle {
            width: 100px;
            height: 100px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .circle svg {
            transform: rotate(-90deg);
          }
          .circle-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.3rem;
            font-weight: 700;
            color: #000000;
          }
          .center-list {
            margin-top: 16px;
          }
          .center-item {
            font-size: 1rem;
            margin-bottom: 6px;
            color: #000000;
          }
          .error-message {
            background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
            color: white;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
          }
          .filter-section {
            background: #fff;
            border-radius: 12px;
            padding: 18px 18px 10px 18px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.07);
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .filter-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 4px;
          }
          .filter-select {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
            background: #fff;
            color: #222;
            margin-bottom: 8px;
          }
          .filter-btn {
            width: 100%;
            padding: 10px 2px;
            background: linear-gradient(90deg, #87CEEB 0%, #B0E0E6 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 600;
            letter-spacing: 1px;
            box-shadow: 0 2px 8px rgba(135, 206, 235, 0.2);
            cursor: pointer;
            transition: background 0.2s, transform 0.2s;
          }
          .filter-btn:hover {
            background: linear-gradient(90deg, #5F9EA0 0%, #87CEEB 100%);
            transform: translateY(-2px) scale(1.03);
          }
          .table-toggle-btn {
            padding: 8px 16px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(40, 167, 69, 0.2);
          }
          .table-toggle-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
          }
          .table-toggle-btn.active {
            background: #dc3545;
            box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
          }
          .table-toggle-btn.active:hover {
            background: #c82333;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
          }
          .week-info {
            background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
            color: white;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(23, 162, 184, 0.3);
          }
          
          @media (max-width: 768px) {
            .filter-section {
              padding: 16px;
            }
            .filter-btn {
              padding: 14px 2px;
              font-size: 1.1rem;
            }
            .table-toggle-btn {
              padding: 8px 14px;
              font-size: 0.95rem;
            }
            .circle {
              width: 80px;
              height: 80px;
            }
            .circle-text {
              font-size: 1.1rem;
            }
          }
          
          @media (max-width: 480px) {
            .filter-section {
              padding: 12px;
            }
            .filter-select {
              padding: 8px 10px;
              font-size: 0.95rem;
            }
            .filter-btn {
              padding: 12px 2px;
              font-size: 1rem;
            }
            .table-toggle-btn {
              padding: 6px 12px;
              font-size: 0.9rem;
            }
            .circle {
              width: 70px;
              height: 70px;
            }
            .circle-text {
              font-size: 1rem;
            }
          }
        `}</style>
        <Title>Session Info</Title>
        {error && <div className="error-message">❌ {error}</div>}
        
        {/* Show week info if week is selected */}
        {selectedWeek && (
          <div className="week-info">
            📅 Showing data for {selectedWeek} - {selectedCenter} - {selectedGrade}
          </div>
        )}
        
        <form onSubmit={handleFilterFormSubmit} className="filter-section">
          <div className="filter-label">Center</div>
          <CenterSelect
            selectedCenter={selectedCenter}
            onCenterChange={(center) => {
              setSelectedCenter(center);
              if (center) {
                sessionStorage.setItem('sessionInfoLastSelectedCenter', center);
              } else {
                // Clear selection - remove from sessionStorage
                sessionStorage.removeItem('sessionInfoLastSelectedCenter');
              }
            }}
            isOpen={openDropdown === 'center'}
            onToggle={() => setOpenDropdown(openDropdown === 'center' ? null : 'center')}
            onClose={() => setOpenDropdown(null)}
          />
          <div className="filter-label">Grade</div>
          <GradeSelect 
            selectedGrade={selectedGrade} 
            onGradeChange={(grade) => {
              setSelectedGrade(grade);
              if (grade) {
                sessionStorage.setItem('sessionInfoLastSelectedGrade', grade);
              } else {
                // Clear selection - remove from sessionStorage
                sessionStorage.removeItem('sessionInfoLastSelectedGrade');
              }
            }}
            required={false} 
            isOpen={openDropdown === 'grade'}
            onToggle={() => setOpenDropdown(openDropdown === 'grade' ? null : 'grade')}
            onClose={() => setOpenDropdown(null)}
          />
          <div className="filter-label">Week (Optional)</div>
          <AttendanceWeekSelect
            selectedWeek={selectedWeek}
            onWeekChange={(week) => {
              setSelectedWeek(week);
              if (week) {
                sessionStorage.setItem('sessionInfoLastSelectedWeek', week);
              } else {
                // Clear selection - remove from sessionStorage
                sessionStorage.removeItem('sessionInfoLastSelectedWeek');
              }
            }}
            isOpen={openDropdown === 'week'}
            onToggle={() => setOpenDropdown(openDropdown === 'week' ? null : 'week')}
            onClose={() => setOpenDropdown(null)}
          />
          <button type="submit" className="filter-btn">Filter Students</button>
        </form>

        <StatsRing MC={MC} NMC={NMC} totalAttended={totalAttended} mainCenterTotal={mainCenterTotal} selectedWeek={selectedWeek} />
        
        {/* Table toggles and table */}
        <div className="table-container" style={{ margin: '24px 0', background: '#fff', borderRadius: 12, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className={`table-toggle-btn ${showHW ? 'active' : ''}`}
              onClick={() => setShowHW(v => !v)}
            >
              {showHW ? 'Hide HW' : 'Show HW'}
            </button>
            <button
              className={`table-toggle-btn ${showPaid ? 'active' : ''}`}
              onClick={() => setShowPaid(v => !v)}
            >
              {showPaid ? 'Hide Paid' : 'Show Paid'}
            </button>
            <button
              className={`table-toggle-btn ${showQuiz ? 'active' : ''}`}
              onClick={() => setShowQuiz(v => !v)}
            >
              {showQuiz ? 'Hide Quiz Degree' : 'Show Quiz Degree'}
            </button>
          </div>
          <SessionTable
            data={filteredStudents}
            showHW={showHW}
            showPaid={showPaid}
            showQuiz={showQuiz}
            height={300}
            showWhatsApp={true}
            emptyMessage={selectedWeek ? 
              `No students attended in ${selectedCenter} for ${selectedGrade} in ${selectedWeek}.` :
              `No students found for selected grade and center.`
            }
            onMessageStateChange={handleMessageStateChange}
          />
        </div>
        
        {/* Second table: Not attended, grade and main_center match selection */}
        <div className="table-container" style={{ margin: '24px 0', background: '#fff', borderRadius: 12, padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, textAlign: 'center', color: '#000' }}>
            {selectedWeek ? `Not Attended in ${selectedWeek}` : 'Not Attended Students'}
          </div>
          <SessionTable
            data={notAttendedStudents}
            height={300}
            showMainCenter={false}
            showWhatsApp={true}
            emptyMessage={selectedWeek ? 
              `All students in ${selectedCenter} for ${selectedGrade} attended in ${selectedWeek}.` :
              `No students found for selected grade and center.`
            }
            onMessageStateChange={handleMessageStateChange}
          />
        </div>
        {isLoading && <LoadingSkeleton />}
      </div>
    </div>
  );
}

// Replace counts-container with StatsRing
function StatsRing({ MC, NMC, totalAttended, mainCenterTotal, selectedWeek }) {
  const stats = [
    {
      label: 'Main Center',
      stats: `${MC} / ${mainCenterTotal}`,
      progress: mainCenterTotal > 0 ? Math.round((MC / mainCenterTotal) * 100) : 0,
      color: 'teal',
    },
    {
      label: 'Not Main Center',
      stats: NMC,
      progress: totalAttended > 0 ? Math.round((NMC / totalAttended) * 100) : 0,
      color: 'red',
    },
    {
      label: 'Total Attended',
      stats: totalAttended,
      progress: totalAttended > 0 ? 100 : 0,
      color: 'blue',
    },
  ];
  
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} style={{ marginBottom: 24 }}>
      {stats.map((stat) => (
        <Paper withBorder radius="md" p="xs" key={stat.label}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <RingProgress
              size={80}
              roundCaps
              thickness={8}
              sections={[{ value: stat.progress, color: stat.color }]}
              label={null}
            />
            <Text c="dimmed" size="xs" tt="uppercase" fw={700} mt={12} align="center">
              {stat.label}
            </Text>
            <Text fw={700} size="xl" align="center">
              {stat.stats}
            </Text>
          </div>
        </Paper>
      ))}
    </SimpleGrid>
  );
} 