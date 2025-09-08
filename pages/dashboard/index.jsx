import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from 'next/image';

// Manual JWT decode function
function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    
    const decoded = decodeJWT(token);
    if (!decoded) {
      sessionStorage.removeItem("token");
      router.push("/");
      return;
    }
    
    // Set user role for conditional rendering
    setUserRole(decoded.role);
  }, [router]);

  return (
    <div style={{ 
      // height: "calc(100dvh - 10rem)",
      padding: "10px 10px 5px 10px",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <div className="main-container" style={{ maxWidth: 600, margin: "10px auto", textAlign: "center" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "16px",
          marginBottom: "15px"
        }}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={70}
            height={70}
            style={{
              borderRadius: "50%",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
              objectFit: "cover",
              background: "transparent"
            }}
          />
              <h1 style={{ margin: 0, color: "#ffffff" }}>TopPhysics Dashboard</h1>
        </div>
        
        {/* Access Denied Message */}
        {/* Removed access denied message rendering */}
      <style jsx>{`
        .dashboard-btn {
          width: 100%;
          margin-bottom: 10px;
          padding: 16px 0;
          background: linear-gradient(90deg, #87CEEB 0%, #B0E0E6 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 1px;
          box-shadow: 0 4px 16px rgba(31, 168, 220, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .dashboard-btn:hover {
          background: linear-gradient(90deg, #5F9EA0 0%, #87CEEB 100%);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(31, 168, 220, 0.4);
        }
        
        @media (max-width: 768px) {
          .dashboard-btn {
            padding: 16px 0;
            font-size: 1.1rem;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 1.8rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            max-width: 600px;
            margin: 20px auto !important;
            text-align: center;
          }
          .dashboard-btn {
            padding: 14px 0;
            font-size: 1.1rem;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 1.5rem !important;
          }
        }
      `}</style>
          <div style={{ marginTop: 30 }}>
        <button 
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/scan_page")}
        >
          📱 QR Code Scanner
        </button>

        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/all_students")}
        >
          👥 All Students
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/student_info")}
        >
          📋 Student Info
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/add_student")}
        >
              ➕ Add Student
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/edit_student")}
        >
              ✏️ Edit Student
        </button>
        <button 
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/delete_student")}
          style={{ background: "linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)" }}
        >
          🗑️ Delete Student
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/qr_generator")}
        >
          🏷️ Create QR Code
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/centers")}
        >
          🏢 Centers
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push('/dashboard/session_info')}
        >
          📊 Session Info
        </button>
        <button
          className="dashboard-btn"
          onClick={() => router.push("/dashboard/history")}
        >
          📋 History
        </button>
      </div>
      </div>
    </div>
  );
}