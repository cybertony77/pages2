import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Title from "../../components/Title";
import { useProfile, useUpdateProfile } from '../../lib/api/auth';

export default function EditMyProfile() {
  const [form, setForm] = useState({ name: "", id: "", phone: "", password: "" });
  const [originalForm, setOriginalForm] = useState(null); // Store original data for comparison
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // React Query hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile();
  const updateProfileMutation = useUpdateProfile();

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

  useEffect(() => {
    if (profile) {
      // Do not set password from backend, always keep it empty
      const formData = { ...profile, password: "" };
      setForm(formData);
      setOriginalForm({ ...formData }); // Store original data for comparison
    }
  }, [profile]);

  // Handle profile error
  useEffect(() => {
    if (profileError) {
      setError("❌ Failed to fetch profile");
    }
  }, [profileError]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Helper function to get only changed fields
  const getChangedFields = () => {
    if (!form || !originalForm) return {};
    
    const changes = {};
    Object.keys(form).forEach(key => {
      // Special handling for password field
      if (key === 'password') {
        // Only include password if user actually typed something new
        if (form[key] && form[key].trim() !== '') {
          changes[key] = form[key];
        }
      } else {
        // For other fields, include if they have actually changed and are not undefined/null
        if (form[key] !== originalForm[key] && 
            form[key] !== undefined && 
            form[key] !== null && 
            form[key] !== '') {
          changes[key] = form[key];
        }
      }
    });
    return changes;
  };

  // Helper function to check if any fields have changed
  const hasChanges = () => {
    if (!form || !originalForm) return false;
    
    return Object.keys(form).some(key => {
      if (key === 'password') {
        // Password has changes if user typed something new
        return form[key] && form[key].trim() !== '';
      } else {
        // Other fields have changes if they differ from original
        return form[key] !== originalForm[key];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if there are any changes
    if (!hasChanges()) {
      setError("❌ No changes detected. Please modify at least one field before saving.");
      return;
    }
    
    setError("");
    setSuccess(false);
    
    const changedFields = getChangedFields();
    
    // Validate phone number if it was changed
    if (changedFields.phone) {
      if (changedFields.phone.length !== 11) {
        setError("❌ Phone number must be exactly 11 digits");
        return;
      }
    }
    
    // Only send changed fields
    const submitForm = { ...changedFields };
    
    // Handle password separately - only include if it was changed and not empty
    if (changedFields.password && changedFields.password.trim() !== "") {
      // Send the raw password - backend will hash it
      submitForm.password = changedFields.password;
    } else if (changedFields.password !== undefined) {
      // If password field was cleared, don't send it
      delete submitForm.password;
    }
    
    updateProfileMutation.mutate(submitForm, {
      onSuccess: () => {
        setSuccess(true);
        // Update original data to reflect the new state
        setOriginalForm({ ...form });
        // Clear password field after successful update
        setForm(prev => ({ ...prev, password: "" }));
      },
      onError: () => {
        setError("❌ Failed to update profile");
      }
    });
  };

  return (
    <div style={{ minHeight: "100vh", padding: "20px 5px 20px 5px"}}>
      <div style={{ maxWidth: 600, margin: "40px auto", padding: 24 }}>
        <style jsx>{`
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
            border-color: #667eea;
            background: white;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
            opacity: 0.7;
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
                 <Title style={{ '--button-width': '180px' }}>Edit My Profile</Title>
        <div className="form-container">
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
              <label>Name</label>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                className="form-input"
                name="id"
                value={form.id}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                className="form-input"
                name="phone"
                type="tel"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Enter phone number (11 digits)"
                value={form.phone}
                maxLength={11}
                onChange={(e) => {
                  // Only allow numbers and limit to 11 digits
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                  handleChange({ target: { name: 'phone', value } });
                }}
              />
              <small style={{ color: '#6c757d', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                Must be exactly 11 digits (e.g., 01234567890)
              </small>
            </div>
            <div className="form-group">
              <label>New Password (leave blank to keep current)</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password or leave blank"
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
            <button type="submit" className="submit-btn" disabled={updateProfileMutation.isPending || !hasChanges()}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
          </form>
          {success && <div className="success-message">✅ Profile updated successfully!</div>}
          {error && <div className="error-message">❌ {error}</div>}
        </div>
      </div>
    </div>
  );
} 