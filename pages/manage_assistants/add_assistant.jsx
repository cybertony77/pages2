import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import bcrypt from "bcryptjs";
import Title from "../../components/Title";
import RoleSelect from "../../components/RoleSelect";
import { useCreateAssistant, useCheckUsername } from '../../lib/api/assistants';

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function AddAssistant() {
  const router = useRouter();
  const [form, setForm] = useState({ id: "", name: "", phone: "", password: "", role: "assistant" });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [newId, setNewId] = useState(""); // Added for success message
  const [showPassword, setShowPassword] = useState(false);

  // React Query hooks
  const createAssistantMutation = useCreateAssistant();
  const usernameCheck = useCheckUsername(form.id);

  useEffect(() => {
    // Only allow admin
    const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
    if (!token) {
      // Use window.location to avoid router conflicts
      window.location.href = "/";
      return;
    }
    const decoded = token ? decodeJWT(token) : null;
    if (!decoded || decoded.role !== "admin") {
      console.log("🚫 Access denied: User is not admin, redirecting to dashboard");
      // Use window.location to avoid router conflicts
      window.location.href = "/dashboard";
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);





  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    // Check if username already exists
    if (usernameCheck.data && usernameCheck.data.exists) {
      setError("Assistant username already exists. Please choose a different ID.");
      return;
    }
    
    // Validate phone number
    const assistantPhone = form.phone;
    
    // Check if phone number is exactly 11 digits
    if (assistantPhone.length !== 11) {
      setError("Assistant phone number must be exactly 11 digits");
      return;
    }
    
    // Convert phone to string before sending - preserve leading zeros exactly
    const payload = { ...form, phone: assistantPhone };
    
    createAssistantMutation.mutate(payload, {
      onSuccess: (data) => {
        setSuccess(true);
        setForm({ id: "", name: "", phone: "", password: "", role: "assistant" });
        setNewId(data.assistant_id);
      },
      onError: (err) => {
        if (err.response?.status === 409) {
          setError("Assistant username already exists.");
        } else {
          setError(err.response?.data?.error || "Failed to add assistant.");
        }
      }
    });
  };

  const handleCreateQR = () => {
    if (newId) {
      router.push(`/qr_code?id=${newId}`);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 5px 20px 5px" }}>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <style jsx>{`
          .title {
            font-size: 2rem;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 32px;
          }
          .form-container {
            background: white;
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
          }
          .form-group {
            margin-bottom: 24px;
          }
          .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
            font-size: 0.95rem;
          }
          .form-input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 1rem;
            transition: all 0.3s ease;
            box-sizing: border-box;
            background: #ffffff;
            color: #000000;
          }
          .form-input:focus {
            outline: none;
            border-color: #87CEEB;
            background: white;
            box-shadow: 0 0 0 3px rgba(135, 206, 235, 0.1);
          }
          .form-input.error-border:focus {
            outline: none;
            border-color: #dc3545;
            background: white;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
          }
          .form-input::placeholder {
            color: #adb5bd;
          }
          .submit-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 16px rgba(135, 206, 235, 0.3);
            margin-top: 8px;
          }
          .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(135, 206, 235, 0.4);
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
          .username-feedback {
            margin-top: 8px;
            font-size: 0.9rem;
            padding: 8px 12px;
            border-radius: 6px;
            font-weight: 500;
          }
          .username-feedback.checking {
            background: #f8f9fa;
            color: #6c757d;
            border: 1px solid #dee2e6;
          }
          .username-feedback.taken {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .username-feedback.available {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .error-border {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1) !important;
          }
          .small-error-message {
            color: #dc3545;
            font-size: 0.8rem;
            margin-top: 4px;
            font-weight: 500;
          }
        `}</style>
                 <Title backText="Back to Manage Assistants" href="/manage_assistants" style={{ '--button-width': '180px' }}>Add Assistant</Title>
        <div className="form-container">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username <span style={{color: 'red'}}>*</span></label>
              <input
                className={`form-input ${!usernameCheck.isLoading && usernameCheck.data && usernameCheck.data.exists ? 'error-border' : ''}`}
                name="id"
                placeholder="Enter assistant username"
                value={form.id}
                onChange={handleChange}
                required
              />
              {/* Username availability feedback */}
              {form.id && (
                <div>
                  {usernameCheck.isLoading && (
                    <div className="username-feedback checking">
                      🔍 Checking availability...
                    </div>
                  )}
                  {!usernameCheck.isLoading && usernameCheck.data && usernameCheck.data.exists && (
                    <div className="username-feedback taken">
                      ❌ This username is already taken, use anther one
                    </div>
                  )}
                  {!usernameCheck.isLoading && usernameCheck.data && !usernameCheck.data.exists && (
                    <div className="username-feedback available">
                      ✅ This username is available
                    </div>
                  )}
                </div>
              )}

            </div>
            <div className="form-group">
              <label>Name <span style={{color: 'red'}}>*</span></label>
              <input
                className="form-input"
                name="name"
                placeholder="Enter assistant's name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Phone <span style={{color: 'red'}}>*</span></label>
              <input
                className="form-input"
                name="phone"
                type="tel"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Enter assistant's phone number (11 digits)"
                value={form.phone}
                maxLength={11}
                onChange={(e) => {
                  // Only allow numbers and limit to 11 digits
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                  setForm({ ...form, phone: value });
                }}
                required
              />
              <small style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                Must be exactly 11 digits (e.g., 12345678901)
              </small>
            </div>
            <div className="form-group">
              <label>Password <span style={{color: 'red'}}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ paddingRight: '50px' }}
                />
                                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <img 
                      src={showPassword ? "/hide.svg" : "/show.svg"} 
                      alt={showPassword ? "Hide password" : "Show password"}
                      style={{ width: '20px', height: '20px' }}
                    />
                  </button>
              </div>
            </div>
            <div className="form-group">
              <label>Role <span style={{color: 'red'}}>*</span></label>
              <RoleSelect 
                selectedRole={form.role}
                onRoleChange={(role) => setForm({ ...form, role })}
                required={true}
              />
            </div>
            <button 
              type="submit" 
              disabled={createAssistantMutation.isPending || (!usernameCheck.isLoading && usernameCheck.data && usernameCheck.data.exists)} 
              className="submit-btn"
            >
              {createAssistantMutation.isPending ? "Adding..." : "Add Assistant"}
            </button>
          </form>
          {success && (
            <div className="success-message">✅ Assistant added successfully!</div>
          )}
          {error && (
            <div className="error-message">❌ {error}</div>
          )}
        </div>
      </div>
    </div>
  );
} 