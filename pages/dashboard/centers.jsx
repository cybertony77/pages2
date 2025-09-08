import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBaseUrl } from '../../config';
import Title from '../../components/Title';

// API functions
const centersAPI = {
  getCenters: async (token) => {
    const response = await axios.get(`${getApiBaseUrl()}/api/centers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.centers;
  },

  createCenter: async (name, token) => {
    const response = await axios.post(`${getApiBaseUrl()}/api/centers`, 
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  updateCenter: async (id, name, token) => {
    const response = await axios.put(`${getApiBaseUrl()}/api/centers/${id}`, 
      { name },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  deleteCenter: async (id, token) => {
    const response = await axios.delete(`${getApiBaseUrl()}/api/centers/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default function Centers() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCenterName, setNewCenterName] = useState('');
  const [editingCenter, setEditingCenter] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [centerToDelete, setCenterToDelete] = useState(null);

  // Get token from sessionStorage (consistent with rest of app)
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  
  // Debug token
  console.log('🔑 Token available:', !!token);
  if (token) {
    console.log('🔑 Token length:', token.length);
    console.log('🔑 Token preview:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ No token found in sessionStorage');
  }

  // Fetch centers
  const { data: centers = [], isLoading, error: fetchError } = useQuery({
    queryKey: ['centers'],
    queryFn: () => centersAPI.getCenters(token),
    enabled: !!token,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always consider data stale
    onError: (error) => {
      console.error('❌ Centers fetch error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
    }
  });

  // Create center mutation
  const createMutation = useMutation({
    mutationFn: (name) => centersAPI.createCenter(name, token),
    onSuccess: () => {
      console.log('🔄 Centers: Invalidating query after creating center');
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      setShowAddForm(false);
      setNewCenterName('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to create center');
    }
  });

  // Update center mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => centersAPI.updateCenter(id, name, token),
    onSuccess: () => {
      console.log('🔄 Centers: Invalidating query after updating center');
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      setEditingCenter(null);
      setEditName('');
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to update center');
    }
  });

  // Delete center mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => centersAPI.deleteCenter(id, token),
    onSuccess: () => {
      console.log('🔄 Centers: Invalidating query after deleting center');
      queryClient.invalidateQueries({ queryKey: ['centers'] });
      setError('');
    },
    onError: (error) => {
      setError(error.response?.data?.error || 'Failed to delete center');
    }
  });

  const handleAddCenter = () => {
    if (!newCenterName.trim()) {
      setError('Center name is required');
      return;
    }
    createMutation.mutate(newCenterName.trim());
  };

  const handleEditCenter = (center) => {
    setEditingCenter(center);
    setEditName(center.name);
    setError('');
  };

  const handleUpdateCenter = () => {
    if (!editName.trim()) {
      setError('Center name is required');
      return;
    }
    updateMutation.mutate({ id: editingCenter.id, name: editName.trim() });
  };

  const handleDeleteCenter = (center) => {
    setCenterToDelete(center);
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    if (centerToDelete) {
      deleteMutation.mutate(centerToDelete.id);
      setShowConfirm(false);
      setCenterToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirm(false);
    setCenterToDelete(null);
  };

  const cancelEdit = () => {
    setEditingCenter(null);
    setEditName('');
    setError('');
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setNewCenterName('');
    setError('');
  };



  if (!token) {
    router.push('/');
    return null;
  }

  if (fetchError) {
    console.error('Centers fetch error:', fetchError);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Error Loading Centers</h1>
        <p style={{ color: '#dc3545' }}>
          {typeof fetchError.response?.data?.error === 'string' 
            ? fetchError.response.data.error 
            : typeof fetchError.message === 'string'
            ? fetchError.message
            : 'Failed to load centers'}
        </p>
        {fetchError.response?.data?.details && (
          <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '8px' }}>
            Details: {typeof fetchError.response.data.details === 'string' 
              ? fetchError.response.data.details 
              : JSON.stringify(fetchError.response.data.details)}
          </p>
        )}
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1FA8DC',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      maxWidth: "800px",
      margin: "40px auto",
      padding: "20px 15px 20px 15px" 
    }}>
      <Title style={{ justifyContent: 'space-between', gap: '20px' }}>🏢 Centers Management</Title>
      
      {/* Main Container */}
      <div className="main-container" style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        width: '100%'
      }}>
        {/* Container Header with Add Button */}
        <div className="container-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>

          <div>
            <h2 style={{ 
              margin: 0, 
              color: '#333',
              fontSize: '1.8rem',
              fontWeight: 'bold'
            }}>
              Learning Centers
            </h2>
            <p style={{ 
              margin: '8px 0 0 0', 
              color: '#666',
              fontSize: '1rem'
            }}>
              Manage all learning centers
            </p>
          </div>
          
          <button
            className="add-center-btn"
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '12px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            ➕ Add Center
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #f5c6cb'
          }}>
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}

        {/* Centers List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ 
              fontSize: '1.2rem', 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #f3f3f3',
                borderTop: '2px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading centers...
            </div>
          </div>
        ) : centers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h3 style={{ color: '#666', margin: '0 0 16px 0' }}>No Centers Found</h3>
            <p style={{ color: '#999', margin: 0 }}>
              Click "Add Center" to create your first center.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {centers.map((center) => (
              <div
                key={center.id}
                className="center-card"
                style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div className="center-info" style={{ flex: 1 }}>
                  <h4 style={{ 
                    margin: '0 0 4px 0', 
                    color: '#333',
                    fontSize: '1.3rem'
                  }}>
                    {center.name}
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    Created: {new Date(center.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="center-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEditCenter(center)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ✏️ Rename
                  </button>
                  <button
                    onClick={() => handleDeleteCenter(center)}
                    disabled={deleteMutation.isLoading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deleteMutation.isLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: deleteMutation.isLoading ? 0.6 : 1
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="confirm-modal">
          <div className="confirm-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete center <strong>{centerToDelete?.name}</strong>?</p>
            <p><strong>This action cannot be undone!</strong></p>
            <div className="confirm-buttons">
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isLoading}
                className="confirm-delete-btn"
              >
                {deleteMutation.isLoading ? "Deleting..." : "Yes, Delete Center"}
              </button>
              <button
                onClick={cancelDelete}
                disabled={deleteMutation.isLoading}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Center Modal */}
      {showAddForm && (
        <div className="add-center-modal">
          <div className="add-center-content">
            <h3>Add New Center</h3>
            <div className="add-center-form">
              <input
                type="text"
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
                placeholder="Enter center name"
                className="add-center-input"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCenter()}
                autoFocus
              />
              <div className="add-center-buttons">
                <button
                  onClick={handleAddCenter}
                  disabled={createMutation.isLoading}
                  className="add-center-btn"
                >
                  {createMutation.isLoading ? 'Adding...' : 'Add Center'}
                </button>
                <button
                  onClick={cancelAdd}
                  disabled={createMutation.isLoading}
                  className="cancel-add-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Center Modal */}
      {editingCenter && (
        <div className="rename-center-modal">
          <div className="rename-center-content">
            <h3>Rename Center</h3>
            <div className="rename-center-form">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter new center name"
                className="rename-center-input"
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateCenter()}
                autoFocus
              />
              <div className="rename-center-buttons">
                <button
                  onClick={handleUpdateCenter}
                  disabled={updateMutation.isLoading}
                  className="rename-center-btn"
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={updateMutation.isLoading}
                  className="cancel-rename-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        

        
        .confirm-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .confirm-content {
          background: #fff;
          border-radius: 12px;
          padding: 32px 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .confirm-buttons {
          display: flex;
          gap: 16px;
          margin-top: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .confirm-delete-btn {
          background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .confirm-delete-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .cancel-btn {
          background: #03a9f4;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        /* Add Center Modal Styles */
        .add-center-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .add-center-content {
          background: #fff;
          border-radius: 12px;
          padding: 32px 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .add-center-content h3 {
          margin: 0 0 24px 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .add-center-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .add-center-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .add-center-input:focus {
          border-color: #007bff;
        }
        .add-center-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .add-center-btn {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .add-center-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .cancel-add-btn {
          background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        /* Rename Center Modal Styles */
        .rename-center-modal {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .rename-center-content {
          background: #fff;
          border-radius: 12px;
          padding: 32px 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .rename-center-content h3 {
          margin: 0 0 24px 0;
          color: #333;
          font-size: 1.5rem;
          font-weight: 600;
        }
        .rename-center-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .rename-center-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .rename-center-input:focus {
          border-color: #007bff;
        }
        .rename-center-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .rename-center-btn {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .rename-center-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .cancel-rename-btn {
          background: linear-gradient(135deg, #dc3545 0%, #e74c3c 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        /* Mobile Responsive Styles */
        @media (max-width: 768px) {
          .main-container {
            margin: 20px auto !important;
            padding: 15px 10px !important;
            max-width: 95% !important;
          }
          
          .container-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          
          .container-header h2 {
            font-size: 1.5rem !important;
            text-align: center !important;
          }
          
          .container-header p {
            text-align: center !important;
          }
          
          .add-center-btn {
            width: 100% !important;
            justify-content: center !important;
          }
          
          .center-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 16px !important;
          }
          
          .center-info {
            text-align: center !important;
          }
          
          .center-actions {
            display: flex !important;
            gap: 8px !important;
            justify-content: center !important;
          }
          
          .center-actions button {
            flex: 1 !important;
            min-width: 0 !important;
            justify-content: center !important;
            text-align: center !important;
          }
          
          .confirm-content {
            margin: 20px;
            padding: 24px 16px;
          }
          
          .confirm-buttons {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .confirm-buttons button {
            width: 100% !important;
          }
          
          .add-center-content {
            margin: 20px;
            padding: 24px 16px;
          }
          
          .add-center-buttons {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .add-center-buttons button {
            width: 100% !important;
          }
          
          .rename-center-content {
            margin: 20px;
            padding: 24px 16px;
          }
          
          .rename-center-buttons {
            flex-direction: column !important;
            gap: 12px !important;
          }
          
          .rename-center-buttons button {
            width: 100% !important;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            margin: 10px auto !important;
            padding: 10px 8px !important;
          }
          
          .container-header h2 {
            font-size: 1.3rem !important;
          }
          
          .center-card {
            padding: 15px !important;
          }
          
          .center-actions {
            flex-direction: column !important;
            gap: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
