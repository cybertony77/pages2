import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Title from "../../components/Title";
import RoleSelect from "../../components/RoleSelect";
import { useAssistant, useAssistants, useUpdateAssistant } from '../../lib/api/assistants';

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export default function EditAssistant() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [id, setId] = useState("");
  const [searchId, setSearchId] = useState(""); // Separate state for search
  const [form, setForm] = useState({ id: "", name: "", phone: "", password: "", role: "" });
  const [originalForm, setOriginalForm] = useState(null); // Store original data for comparison
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [searchResults, setSearchResults] = useState([]); // Store multiple search results
  const [showSearchResults, setShowSearchResults] = useState(false); // Show/hide search results

  // React Query hooks
  const { data: assistant, isLoading: assistantLoading, error: assistantError } = useAssistant(searchId, { enabled: !!searchId });
  const { data: allAssistants } = useAssistants(); // Get all assistants for name search
  const updateAssistantMutation = useUpdateAssistant();

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

  // Handle assistant data when it loads
  useEffect(() => {
    if (assistant) {
      const formData = { 
        id: assistant.id, 
        name: assistant.name, 
        phone: assistant.phone, 
        password: "", 
        role: assistant.role || "assistant" 
      };
      setForm(formData);
      setOriginalForm({ ...formData });
      setStep(2);
    }
  }, [assistant]);

  // Handle assistant error
  useEffect(() => {
    if (assistantError) {
      setError("❌ Assistant not found.");
    }
  }, [assistantError]);

  const handleIdSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSearchResults([]);
    setShowSearchResults(false);
    
    const searchTerm = id.trim();
    
    // Check if trying to edit "tony" - prevent this
    if (searchTerm.toLowerCase() === "tony") {
      setError("❌ You can't Edit Tony");
      return;
    }
    
    // Check if it's a numeric ID
    if (/^\d+$/.test(searchTerm)) {
      // It's a numeric ID, search directly
      setSearchId(searchTerm);
    } else {
      // It's a name or username, search through all assistants (case-insensitive, includes)
      if (allAssistants) {
        const matchingAssistants = allAssistants.filter(assistant => 
          (assistant.name && assistant.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (assistant.id && assistant.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        if (matchingAssistants.length === 1) {
          // Single match, use it directly
          const foundAssistant = matchingAssistants[0];
          setSearchId(foundAssistant.id.toString());
          setId(foundAssistant.id.toString());
        } else if (matchingAssistants.length > 1) {
          // Multiple matches, show selection
          setSearchResults(matchingAssistants);
          setShowSearchResults(true);
          setError(`❌ Found ${matchingAssistants.length} assistants. Please select one.`);
        } else {
          setError(`❌ No assistant found with name or username starting with "${searchTerm}"`);
          setSearchId("");
        }
      } else {
        setError("❌ Assistant data not loaded. Please try again.");
      }
    }
  };

  // Clear assistant data when ID input is emptied
  const handleIdChange = (e) => {
    const value = e.target.value;
    setId(value);
    setSearchId(""); // Clear search ID to prevent auto-fetch
    if (!value.trim()) {
      const emptyForm = { id: "", name: "", phone: "", password: "", role: "assistant" };
      setForm(emptyForm);
      setOriginalForm(null);
      setStep(1);
      setError("");
      setSuccess(false);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle assistant selection from search results
  const handleAssistantSelect = (selectedAssistant) => {
    setSearchId(selectedAssistant.id.toString());
    setId(selectedAssistant.id.toString());
    setSearchResults([]);
    setShowSearchResults(false);
    setError("");
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Helper function to get only changed fields
  const getChangedFields = () => {
    if (!form || !originalForm) return {};
    
    const changes = {};
    Object.keys(form).forEach(key => {
      // Only include fields that have actually changed and are not undefined/null
      if (form[key] !== originalForm[key] && 
          form[key] !== undefined && 
          form[key] !== null && 
          form[key] !== '') {
        changes[key] = form[key];
      }
    });
    return changes;
  };

  // Helper function to check if any fields have changed
  const hasChanges = () => {
    if (!form || !originalForm) return false;
    
    return Object.keys(form).some(key => form[key] !== originalForm[key]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if trying to edit "tony" - prevent this
    if (assistant && assistant.name && assistant.name.toLowerCase() === "tony") {
      setError("❌ You can't Edit Tony");
      return;
    }
    
    // Check if there are any changes
    if (!hasChanges()) {
      setError("❌ No changes detected. Please modify at least one field before saving.");
      return;
    }
    
    setError("");
    setSuccess(false);
    
    const changedFields = getChangedFields();
    
    // Only send changed fields
    let payload = { ...changedFields };
    
    // Validate phone number if it was changed
    if (changedFields.phone) {
      const assistantPhone = changedFields.phone.toString();
      if (assistantPhone.length !== 11) {
        setError("❌ Assistant phone number must be exactly 11 digits");
        return;
      }
      payload.phone = assistantPhone; // Keep as string to preserve leading zeros exactly
    }
    
    // Handle password separately - only include if it was changed and not empty
    if (changedFields.password && changedFields.password.trim() !== "") {
      // Send the raw password - backend will hash it
      payload.password = changedFields.password;
    } else if (changedFields.password !== undefined) {
      // If password field was cleared, don't send it
      delete payload.password;
    }
    
    updateAssistantMutation.mutate(
      { id, updateData: payload },
      {
        onSuccess: () => {
          setSuccess(true);
          // Update original data to reflect the new state
          setOriginalForm({ ...form });
        },
        onError: (err) => {
          if (err.response?.status === 409) {
            setError("❌ Assistant ID already exists.");
          } else {
            setError(err.response?.data?.error || "❌ Failed to update assistant.");
          }
        }
      }
    );
  };

  return (
    <div style={{ padding: "20px 5px 20px 5px" }}>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
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
          @media (max-width: 768px) {
            .form-container {
              padding: 24px;
            }
            .form-group {
              margin-bottom: 20px;
            }
            .form-input, .fetch-input {
              padding: 14px 16px;
            }
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
          }
          @media (max-width: 480px) {
            .form-container {
              padding: 20px;
            }
            .form-group label {
              font-size: 0.9rem;
            }
            .form-input, .fetch-input {
              padding: 12px 14px;
              font-size: 0.95rem;
            }
            .submit-btn {
              padding: 16px;
              font-size: 1rem;
            }
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
          .submit-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(135, 206, 235, 0.4);
          }
          .submit-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
            box-shadow: 0 2px 8px rgba(135, 206, 235, 0.2);
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
          .changes-indicator {
            background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%);
            color: white;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(23, 162, 184, 0.3);
          }
          .no-changes {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            color: white;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            text-align: center;
            font-weight: 600;
            box-shadow: 0 4px 16px rgba(108, 117, 125, 0.3);
          }
        `}</style>
                 <Title backText="Back to Manage Assistants" href="/manage_assistants" style={{ '--button-width': '180px' }}>Edit Assistant</Title>
        
          <div className="form-container">
            
            <form onSubmit={handleIdSubmit} className="fetch-form">
              <input
                className="fetch-input"
                name="id"
                placeholder="Enter assistant Username, Name"
                value={id}
                onChange={handleIdChange}
              />
              <button type="submit" disabled={assistantLoading} className="fetch-btn">
                {assistantLoading ? "Loading..." : "🔍 Search"}
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
                  Select an assistant:
                </div>
                {searchResults.map((assistant) => (
                  <button
                    key={assistant.id}
                    onClick={() => handleAssistantSelect(assistant)}
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
                      {assistant.name} (ID: {assistant.id})
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                      {assistant.role} • {assistant.phone}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        
        {step === 2 && (
          <div className="form-container" style={{ marginTop: "20px" }}>
            {/* Show changes indicator */}
            {hasChanges() ? (
              <div className="changes-indicator">
                ✏️ Changes detected - Only modified fields will be sent to server
              </div>
            ) : (
              <div className="no-changes">
                ℹ️ No changes detected - Modify at least one field to enable save
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  name="id"
                  placeholder="Edit assistant username"
                  value={form.id}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  className="form-input"
                  name="name"
                  placeholder="Edit assistant's name"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  className="form-input"
                  name="phone"
                  type="tel"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Edit assistant's phone number (11 digits)"
                  value={form.phone}
                  maxLength={11}
                  onChange={(e) => {
                    // Only allow numbers and limit to 11 digits
                    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                    handleChange({ target: { name: 'phone', value } });
                  }}

                />
                <small style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Must be exactly 11 digits (e.g., 12345678901)
                </small>
              </div>
              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={form.password}
                    onChange={handleChange}
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
                <label>Role</label>
                <RoleSelect 
                  selectedRole={form.role}
                  onRoleChange={(role) => setForm({ ...form, role })}
                />
              </div>
              <button type="submit" disabled={updateAssistantMutation.isPending || !hasChanges()} className="submit-btn">
                {updateAssistantMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
            </form>
          </div>
        )}
        {success && <div className="success-message">✅ Assistant updated successfully!</div>}
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
} 