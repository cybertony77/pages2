import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Title from "../../components/Title";
import { Table, ScrollArea } from '@mantine/core';
import { IconArrowRight, IconSearch } from '@tabler/icons-react';
import { ActionIcon, TextInput, useMantineTheme } from '@mantine/core';
import styles from '../../styles/TableScrollArea.module.css';
import { useAssistants } from '../../lib/api/assistants';
import LoadingSkeleton from '../../components/LoadingSkeleton';

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function InputWithButton(props) {
  const theme = useMantineTheme();
  return (
    <TextInput
      radius="xl"
      size="md"
      placeholder="Search by Username or Name"
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

export default function AllAssistants() {
  const router = useRouter();
  const containerRef = useRef(null);
  const [filteredAssistants, setFilteredAssistants] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // React Query hook
  const { data: assistants = [], isLoading, error, refetch } = useAssistants();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    // Only allow admin
    const token = sessionStorage.getItem("token");
    if (!token) {
      // Use window.location to avoid router conflicts
      window.location.href = "/";
      return;
    }
    const decoded = token ? decodeJWT(token) : null;
    if (!decoded || decoded.role !== 'admin') {
      console.log("🚫 Access denied: User is not admin, redirecting to dashboard");
      // Use window.location to avoid router conflicts
      window.location.href = "/dashboard";
    }
  }, []);

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
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    filterAssistants();
  }, [assistants, searchTerm]);



  const filterAssistants = () => {
    let filtered = assistants;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.trim().toLowerCase();
      if (/^\d+$/.test(term)) {
        // Only digits: exact match for id
        filtered = filtered.filter(assistant => assistant.id.toString() === term);
      } else {
        // Otherwise: includes for name
        filtered = filtered.filter(assistant =>
          assistant.name && assistant.name.toLowerCase().includes(term)
        );
      }
    }
    setFilteredAssistants(filtered);
  };

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: "100vh", 
        padding: "20px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ 
          width: "100%", 
          maxWidth: "900px",
          padding: "0 10px"
        }}>
          <LoadingSkeleton />
        </div>
        <style jsx>{`
          @media (max-width: 768px) {
            div[style*="padding: 20px 10px"] {
              padding: 15px 8px !important;
            }
            div[style*="maxWidth: 900px"] {
              padding: 0 5px !important;
              maxWidth: 100% !important;
            }
          }
          
          @media (max-width: 480px) {
            div[style*="padding: 20px 10px"] {
              padding: 10px 5px !important;
            }
            div[style*="maxWidth: 900px"] {
              padding: 0 !important;
              maxWidth: 100% !important;
            }
          }
          
          @media (max-width: 360px) {
            div[style*="padding: 20px 10px"] {
              padding: 8px 3px !important;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "20px 5px 20px 5px" 
    }}>
      <div ref={containerRef} style={{ maxWidth: 800, margin: "40px auto", padding: "12px" }}>
        <Title backText="Back to Manage Assistants" href="/manage_assistants" style={{ '--button-width': '180px' }}>All Assistants</Title>
        {/* Search Bar */}
        <div style={{ marginBottom: 20 }}>
          <InputWithButton
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="history-container">
          <div className="history-title">
            All Assistants ({filteredAssistants.length} records)
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
              {error.message}
            </div>
          )}
          {filteredAssistants.length === 0 ? (
            <div className="no-results">
              {searchTerm
                ? "❌ No assistants found with the search term."
                : "❌ No assistants found."
              }
            </div>
          ) : (
            <ScrollArea h={400} type="hover" className={styles.scrolled}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: '15%' }}>Username</Table.Th>
                    <Table.Th style={{ width: '25%' }}>Name</Table.Th>
                    <Table.Th style={{ width: '35%' }}>Phone Number</Table.Th>
                    <Table.Th style={{ width: '25%' }}>Role</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredAssistants.map(assistant => (
                    <Table.Tr key={assistant.id}>
                      <Table.Td style={{ fontWeight: 'bold', color: '#1FA8DC' }}>{assistant.id}</Table.Td>
                      <Table.Td style={{ fontWeight: '600' }}>{assistant.name}</Table.Td>
                      <Table.Td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{assistant.phone}</Table.Td>
                      <Table.Td style={{ 
                        fontWeight: '600',
                        color: assistant.role === 'admin' ? '#dc3545' : '#28a745'
                      }}>{assistant.role}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </div>
        <style jsx>{`
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
          .role-admin {
            color: #dc3545; /* Red for admin */
          }
          .role-assistant {
            color: #28a745; /* Green for assistant */
          }
          
          @media (max-width: 768px) {
            .history-container {
              padding: 16px;
            }
            .history-title {
              font-size: 1.3rem;
            }
          }
          
          @media (max-width: 480px) {
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