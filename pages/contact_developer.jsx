import Image from "next/image";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Title from "../components/Title";

export default function ContactDeveloperPage() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    setHasToken(!!token);
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "20px",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
        animation: "float 20s ease-in-out infinite"
      }} />
      
      <div style={{
        position: "absolute",
        top: "20%",
        right: "10%",
        width: "200px",
        height: "200px",
        background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "pulse 15s ease-in-out infinite"
      }} />
      
      <div style={{
        position: "absolute",
        bottom: "20%",
        left: "10%",
        width: "150px",
        height: "150px",
        background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
        borderRadius: "50%",
        animation: "float 25s ease-in-out infinite reverse"
      }} />

      {/* Main content */}
      <div style={{ 
        maxWidth: 700, 
        margin: "0 auto", 
        position: "relative",
        zIndex: 2
      }}>
        {/* Show Title component only if user has token */}
        {hasToken && <Title backText="Back" href={null}>Contact Developer</Title>}
        
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "50px 40px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          textAlign: "center",
          position: "relative"
        }}>
          <style jsx>{`
            @media (max-width: 768px) {
              div[style*="padding: 50px 40px"] {
                padding: 40px 30px !important;
              }
            }
            
            @media (max-width: 480px) {
              div[style*="padding: 50px 40px"] {
                padding: 30px 20px !important;
              }
            }
            
            @media (max-width: 360px) {
              div[style*="padding: 50px 40px"] {
                padding: 25px 15px !important;
              }
            }
            
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            .profile-container {
              animation: slideInUp 0.8s ease-out;
            }
            
            .contact-info {
              animation: slideInUp 0.8s ease-out 0.2s both;
            }
            
            .contact-methods {
              animation: slideInUp 0.8s ease-out 0.4s both;
            }
            
            .description {
              animation: slideInUp 0.8s ease-out 0.6s both;
            }
            
            .contact-item {
              background: linear-gradient(135deg, rgba(31, 168, 220, 0.1) 0%, rgba(254, 185, 84, 0.1) 100%);
              border: 2px solid rgba(31, 168, 220, 0.2);
              border-radius: 16px;
              padding: 20px;
              margin: 16px 0;
              transition: all 0.3s ease;
              position: relative;
              overflow: hidden;
            }
            
            .contact-item::before {
              content: '';
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
              transition: left 0.5s;
            }
            
            .contact-item:hover::before {
              left: 100%;
            }
            
            .contact-item:hover {
              transform: translateY(-3px);
              box-shadow: 0 8px 25px rgba(31, 168, 220, 0.2);
              border-color: rgba(31, 168, 220, 0.4);
            }
            
            .contact-icon {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              margin: 0 auto 16px auto;
              transition: transform 0.3s ease;
            }
            
            .contact-item:hover .contact-icon {
              transform: scale(1.1);
            }
            
            .phone-icon {
              background: linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%);
              color: white;
            }
            
            .email-icon {
              background: linear-gradient(135deg, #1FA8DC 0%, #87CEEB 100%);
              color: white;
            }
            
            .contact-link {
              color: inherit;
              text-decoration: none;
              font-weight: 700;
              transition: all 0.3s ease;
              display: inline-block;
              padding: 8px 16px;
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.8);
              border: 1px solid rgba(31, 168, 220, 0.2);
            }
            
            .contact-link:hover {
              background: rgba(255, 255, 255, 1);
              transform: translateY(-2px);
              box-shadow: 0 4px 16px rgba(31, 168, 220, 0.3);
            }
            
            .profile-image {
              border-radius: 50%;
              box-shadow: 0 12px 32px rgba(31, 168, 220, 0.25);
              transition: transform 0.3s ease;
              border: 4px solid rgba(255, 255, 255, 0.8);
            }
            
            .profile-image:hover {
              transform: scale(1.05);
            }
            
            @media (max-width: 768px) {
              .contact-item {
                padding: 16px;
                margin: 12px 0;
              }
              
              .contact-icon {
                width: 50px;
                height: 50px;
                font-size: 20px;
              }
              
              .contact-link {
                font-size: 0.9rem;
                padding: 6px 12px;
                word-break: break-word;
                max-width: 100%;
                display: inline-block;
              }
            }
            
            @media (max-width: 480px) {
              .contact-item {
                padding: 14px;
                margin: 10px 0;
              }
              
              .contact-icon {
                width: 45px;
                height: 45px;
                font-size: 18px;
              }
              
              .contact-link {
                font-size: 0.85rem;
                padding: 5px 10px;
                word-break: break-word;
                max-width: 100%;
                display: inline-block;
              }
              
              .profile-container h1 {
                font-size: 2rem !important;
              }
              
              .profile-container div {
                font-size: 1.1rem !important;
                padding: 6px 16px !important;
              }
            }
            
            @media (max-width: 360px) {
              .contact-link {
                font-size: 0.8rem;
                padding: 4px 8px;
                word-break: break-all;
              }
              
              .profile-container h1 {
                font-size: 1.8rem !important;
              }
              
              .profile-container div {
                font-size: 1rem !important;
                padding: 5px 12px !important;
              }
            }
          `}</style>

          {/* Profile Section */}
          <div className="profile-container">
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              overflow: "hidden",
              margin: "0 auto 24px auto",
              boxShadow: "0 8px 24px rgba(31,168,220,0.15)",
              background: "#e9ecef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}>
              <Image 
                src="/tony_joseph.png" 
                alt="Tony Joseph" 
                width={120} 
                height={120} 
                className="profile-image"
                style={{ objectFit: "cover" }} 
              />
            </div>
            
            <h1 style={{ 
              color: "#1FA8DC", 
              fontWeight: 900, 
              marginBottom: 8, 
              fontSize: "2.5rem", 
              letterSpacing: 1,
              textShadow: "0 2px 8px rgba(31,168,220,0.1)"
            }}>
              Tony Joseph
            </h1>
            
            <div style={{ 
              color: "#FEB954", 
              fontWeight: 700, 
              fontSize: "1.3rem", 
              marginBottom: 32, 
              letterSpacing: 0.5,
              background: "rgba(254, 185, 84, 0.1)",
              padding: "8px 20px",
              borderRadius: "20px",
              border: "2px solid rgba(254, 185, 84, 0.2)"
            }}>
              🚀 Senior Software Developer
            </div>
          </div>

          {/* Contact Methods */}
          <div className="contact-methods">
            {/* Phone Section */}
            <div className="contact-item">
              <div className="contact-icon phone-icon">
                📞
              </div>
              <h3 style={{ 
                color: "#dc3545", 
                fontWeight: 800, 
                marginBottom: 16, 
                fontSize: "1.4rem" 
              }}>
                Phone Numbers
              </h3>
              <div>
                <a 
                  href="tel:01211172756" 
                  className="contact-link"
                  style={{ color: "#dc3545" }}
                >
                  📱 01211172756
                </a>
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="contact-item">
              <div className="contact-icon" style={{
                background: "linear-gradient(135deg, #25d366 0%, #0ee8cf 100%)",
                color: "white"
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
              </div>
              <h3 style={{ 
                color: "#25d366", 
                fontWeight: 800, 
                marginBottom: 16, 
                fontSize: "1.4rem" 
              }}>
                WhatsApp
              </h3>
              <div>
                <a 
                  href="https://wa.me/201211172756?text=Hello%20Tony,%20I%20need%20help%20in%20TopPhysics%20Attendance%20System" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-link"
                  style={{ color: "#25d366" }}
                >
                  📱 Message me on WhatsApp
                </a>
              </div>
            </div>
              
            {/* Email Section */}
            <div className="contact-item">
              <div className="contact-icon email-icon">
                ✉️
              </div>
              <h3 style={{ 
                color: "#1FA8DC", 
                fontWeight: 800, 
                marginBottom: 16, 
                fontSize: "1.4rem" 
              }}>
                Email Address
              </h3>
              <div>
                <a 
                  href="mailto:tony.joseph.business1717@gmail.com" 
                  className="contact-link"
                  style={{ color: "#1FA8DC" }}
                >
                  📧 tony.joseph.business1717@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="description" style={{ 
            marginTop: 32, 
            color: "#6c757d", 
            fontSize: "1.1rem", 
            fontWeight: 500,
            lineHeight: 1.6,
            background: "rgba(31, 168, 220, 0.05)",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid rgba(31, 168, 220, 0.1)"
          }}>
            💡 Feel free to contact me for any technical support, bug reports, feature requests, or urgent issues regarding the TopPhysics Attendance System. I'm here to help ensure the system runs smoothly for all users.
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "12px", 
            marginTop: "24px",
            flexDirection: "column"
          }}>
            {/* Show Login and Go Back buttons only if user doesn't have token */}
            {!hasToken && (
              <>
                {/* Login Button */}
                <button 
                  onClick={() => router.push('/')}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
                    border: "none",
                    borderRadius: "16px",
                    height: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(40, 167, 69, 0.3)",
                    transition: "all 0.3s ease",
                    fontSize: "1.1rem",
                    color: "white",
                    fontWeight: "600",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 16px rgba(40, 167, 69, 0.3)";
                  }}
                >
                  <span style={{ marginRight: "8px" }}>🔐</span>
                  Go to Login
                </button>

                {/* Back Button */}
                <button 
                  onClick={() => router.back()}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #1FA8DC 0%, #87CEEB 100%)",
                    border: "none",
                    borderRadius: "16px",
                    height: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(31, 168, 220, 0.3)",
                    transition: "all 0.3s ease",
                    fontSize: "1.1rem",
                    color: "white",
                    fontWeight: "600",
                    position: "relative",
                    overflow: "hidden"
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow = "0 6px 20px rgba(31, 168, 220, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 16px rgba(31, 168, 220, 0.3)";
                  }}
                >
                  <span style={{ marginRight: "8px" }}>⬅️</span>
                  Go Back
                </button>
              </>
            )}


          </div>
        </div>
      </div>
    </div>
  );
} 