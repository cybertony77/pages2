import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { AVAILABLE_CENTERS } from "../../constants/centers";
import Title from "../../components/Title";
import GradeSelect from "../../components/GradeSelect";
import CenterSelect from "../../components/CenterSelect";
import { Table, ScrollArea } from '@mantine/core';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';
import styles from '../../styles/TableScrollArea.module.css';
import { useStudents } from '../../lib/api/students';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export function InputWithButton(props) {
  const theme = useMantineTheme();
  return (
    <TextInput
      radius="xl"
      size="md"
                  placeholder="Search by ID, Name or School"
      rightSectionWidth={42}
      leftSection={<IconSearch size={18} stroke={1.5} />}
      rightSection={
        <ActionIcon size={32} radius="xl" color={theme.primaryColor} variant="filled">
          <IconArrowRight size={18} stroke={1.5} />
        </ActionIcon>
      }
      {...props}
    />
  );
}

export default function AllStudents() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedCenter, setSelectedCenter] = useState("");
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null); // 'grade', 'center', or null
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // React Query hook for fetching students with enhanced real-time updates
  const { data: students = [], isLoading, error, refetch } = useStudents({
    // Enhanced real-time settings
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue when tab is not active
    refetchOnWindowFocus: true, // Immediate update when switching back to tab
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
  });

  // Load remembered filter values from sessionStorage
  useEffect(() => {
    const rememberedGrade = sessionStorage.getItem('allStudentsSelectedGrade');
    const rememberedCenter = sessionStorage.getItem('allStudentsSelectedCenter');
    
    if (rememberedGrade) {
      setSelectedGrade(rememberedGrade);
    }
    if (rememberedCenter) {
      setSelectedCenter(rememberedCenter);
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [router]);

  useEffect(() => {
    filterStudents();
  }, [students, selectedGrade, selectedCenter, searchTerm]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto-refresh students data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  const filterStudents = () => {
    // Ensure students is always an array
    if (!Array.isArray(students)) {
      setFilteredStudents([]);
      return;
    }
    
    let filtered = students;
    if (selectedGrade) filtered = filtered.filter(student => 
      student.grade && student.grade.toLowerCase() === selectedGrade.toLowerCase()
    );
    if (selectedCenter) filtered = filtered.filter(student => 
      student.main_center && student.main_center.toLowerCase() === selectedCenter.toLowerCase()
    );
    if (searchTerm.trim() !== "") {
      const term = searchTerm.trim().toLowerCase();
      if (/^\d+$/.test(term)) {
        // Only digits: exact match for ID
        filtered = filtered.filter(student => student.id.toString() === term);
      } else {
        // Otherwise: search in name (includes) or school (includes)
        filtered = filtered.filter(student =>
          (student.name && student.name.toLowerCase().includes(term)) ||
          (student.school && student.school.toLowerCase().includes(term))
        );
      }
    }
    setFilteredStudents(filtered);
  };





  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        padding: "20px 5px 20px 5px"
      }}>
        <div style={{ maxWidth: 800, margin: "40px auto", padding: "12px" }}>
          <Title>All Students</Title>
          <LoadingSkeleton type="table" rows={8} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "20px 5px 20px 5px" 
    }}>
      <div ref={containerRef} style={{ maxWidth: 800, margin: "40px auto", padding: "12px" }}>
        <Title>All Students</Title>
        {/* Search Bar */}
        <div style={{ marginBottom: 20 }}>
          <InputWithButton
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-container">
          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Filter by Grade</label>
              <GradeSelect
                selectedGrade={selectedGrade}
                onGradeChange={(grade) => {
                  setSelectedGrade(grade);
                  // Remember the selected grade
                  if (grade) {
                    sessionStorage.setItem('allStudentsSelectedGrade', grade);
                  } else {
                    sessionStorage.removeItem('allStudentsSelectedGrade');
                  }
                }}
                isOpen={openDropdown === 'grade'}
                onToggle={() => setOpenDropdown(openDropdown === 'grade' ? null : 'grade')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">Filter by Center</label>
              <CenterSelect
                selectedCenter={selectedCenter}
                onCenterChange={(center) => {
                  setSelectedCenter(center);
                  // Remember the selected center
                  if (center) {
                    sessionStorage.setItem('allStudentsSelectedCenter', center);
                  } else {
                    sessionStorage.removeItem('allStudentsSelectedCenter');
                  }
                }}
                isOpen={openDropdown === 'center'}
                onToggle={() => setOpenDropdown(openDropdown === 'center' ? null : 'center')}
                onClose={() => setOpenDropdown(null)}
              />
            </div>
          </div>
          

        </div>
        <div className="history-container">
          <div className="history-title">
            All Students ({filteredStudents.length} records)
          </div>
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 10,
              padding: 16,
              marginBottom: 16,
              textAlign: 'center',
              fontWeight: 600,
              border: '1.5px solid #fca5a5',
              fontSize: '1.1rem',
              boxShadow: '0 4px 16px rgba(220, 53, 69, 0.08)'
            }}>
              {error.message || "Failed to fetch students data"}
            </div>
          )}
          {filteredStudents.length === 0 ? (
            <div className="no-results">
              {searchTerm
                ? "No students found with the search term."
                : "No students found."
              }
            </div>
          ) : (
            <ScrollArea h={400} type="hover" className={styles.scrolled}>
              <Table striped highlightOnHover withTableBorder withColumnBorders style={{ minWidth: '950px' }}>
                <Table.Thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: '80px', minWidth: '80px', textAlign: 'center' }}>ID</Table.Th>
                    <Table.Th style={{ width: '150px', minWidth: '150px', textAlign: 'center' }}>Name</Table.Th>
                    <Table.Th style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>Grade</Table.Th>
                    <Table.Th style={{ width: '150px', minWidth: '150px', textAlign: 'center' }}>School</Table.Th>
                    <Table.Th style={{ width: '140px', minWidth: '140px', textAlign: 'center' }}>Student Phone</Table.Th>
                    <Table.Th style={{ width: '140px', minWidth: '140px', textAlign: 'center' }}>Parent Phone</Table.Th>
                    <Table.Th style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>Center</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredStudents.map(student => (
                    <Table.Tr key={student.id}>
                      <Table.Td style={{ fontWeight: 'bold', color: '#1FA8DC', width: '80px', minWidth: '80px', textAlign: 'center' }}>{student.id}</Table.Td>
                      <Table.Td style={{ fontWeight: '600', width: '150px', minWidth: '150px', textAlign: 'center' }}>{student.name}</Table.Td>
                      <Table.Td style={{ width: '120px', minWidth: '120px', textAlign: 'center' }}>{student.grade}</Table.Td>
                      <Table.Td style={{ width: '150px', minWidth: '150px', textAlign: 'center' }}>{student.school || 'N/A'}</Table.Td>
                      <Table.Td style={{ fontFamily: 'monospace', fontSize: '0.9rem', width: '140px', minWidth: '140px', textAlign: 'center' }}>{student.phone}</Table.Td>
                      <Table.Td style={{ fontFamily: 'monospace', fontSize: '0.9rem', width: '140px', minWidth: '140px', textAlign: 'center' }}>{student.parents_phone}</Table.Td>
                      <Table.Td style={{ width: '130px', minWidth: '130px', textAlign: 'center' }}>{student.main_center}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </div>
        <style jsx>{`
          .filters-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            margin-bottom: 24px;
          }
          .filter-row {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
          }
          .filter-group {
            flex: 1;
            min-width: 180px;
          }
          .filter-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
            font-size: 0.95rem;
          }
          .history-container {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            overflow-x: auto;
          }
          .history-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #495057;
            margin-bottom: 20px;
            text-align: center;
          }
          .no-results {
            text-align: center;
            color: #6c757d;
            font-style: italic;
            padding: 40px 20px;
          }
          .phone-number {
            font-family: monospace;
            font-size: 0.9rem;
          }
          
          @media (max-width: 768px) {
            .filters-container {
              padding: 16px;
            }
            .filter-row {
              flex-direction: column;
              gap: 8px;
            }
            .filter-group {
              min-width: auto;
            }
            .history-container {
              padding: 16px;
            }
            .history-title {
              font-size: 1.3rem;
            }
          }
          
          @media (max-width: 480px) {
            .filters-container {
              padding: 12px;
            }
            .history-container {
              padding: 12px;
            }
            .history-title {
              font-size: 1.2rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
} 