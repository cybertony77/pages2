import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Title from '../../components/Title';

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function ManageAssistants() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
    if (!token) {
      // Use window.location to avoid router conflicts
      window.location.href = "/";
      return;
    }
    
    const decoded = token ? decodeJWT(token) : null;
    if (!decoded || decoded.role !== 'admin') {
      console.log("🚫 Access denied: User is not admin, redirecting to dashboard");
      // Use window.location to avoid router conflicts
      window.location.href = '/dashboard';
    }
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '20px 5px 20px 5px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      <div style={{ flex: 1 }}>
        <div className="main-container" style={{ maxWidth: 600, margin: '100px auto', textAlign: 'center' }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '40px',
            width: '100%'
          }}>
                       <Title 
               backText="Back to Main Dashboard" 
               href="/dashboard"
               style={{ 
                 '--button-margin-left': '80px'
               }}
             >
               Manage Assistants
             </Title>
          </div>
          <style jsx>{`
            @media (max-width: 600px) {
              .header-row-responsive {
                flex-direction: column;
                align-items: stretch;
                gap: 16px;
              }
              .manage-title {
                font-size: 2rem;
                text-align: left;
                margin-bottom: 8px;
                word-break: normal;
                white-space: normal;
                overflow-wrap: break-word;
              }
              .back-btn-wrap {
                margin-left: 0 !important;
                justify-content: flex-start;
              }
            }
            @media (max-width: 768px) {
              .dashboard-btn {
                padding: 12px 0;
                font-size: 1rem;
                margin-bottom: 12px;
              }
              h1 {
                font-size: 1.8rem !important;
              }
            }
            @media (max-width: 480px) {
              .dashboard-btn {
                padding: 10px 0;
                font-size: 0.95rem;
                margin-bottom: 10px;
              }
              h1 {
                font-size: 1.5rem !important;
              }
            }
            .dashboard-btn {
              width: 100%;
              margin-bottom: 16px;
              padding: 14px 0;
              background: linear-gradient(90deg, #87CEEB 0%, #B0E0E6 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 1.1rem;
              font-weight: 600;
              letter-spacing: 1px;
              box-shadow: 0 2px 8px rgba(135, 206, 235, 0.2);
              cursor: pointer;
              transition: background 0.2s, transform 0.2s;
            }
            .dashboard-btn:hover {
              background: linear-gradient(90deg, #5F9EA0 0%, #87CEEB 100%);
              transform: translateY(-2px) scale(1.03);
            }
            
            .main-container {
              max-width: 380px;
              margin: 100px auto;
              text-align: center;
            }
            
            @media (max-width: 768px) {
              .main-container {
                max-width: 450px !important;
              }
            }
            
            @media (max-width: 480px) {
              .main-container {
                max-width: 380px !important;
              }
            }
          `}</style>
          <button
            className="dashboard-btn"
            onClick={() => router.push('/manage_assistants/all_assistants')}
          >
            👥 All Assistants
          </button>
          <button
            className="dashboard-btn"
            onClick={() => router.push('/manage_assistants/add_assistant')}
          >
            ➕ Add Assistant
          </button>
          <button
            className="dashboard-btn"
            onClick={() => router.push('/manage_assistants/edit_assistant')}
          >
            ✏️ Edit Assistant
          </button>
          <button
            className="dashboard-btn"
            style={{ background: 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)' }}
            onClick={() => router.push('/manage_assistants/delete_assistant')}
          >
            🗑️ Delete Assistant
          </button>
        </div>
      </div>
    </div>
  );
} 