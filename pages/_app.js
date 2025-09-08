import "@/styles/globals.css";
import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { useRouter } from "next/router";
import { useEffect, useState, useMemo } from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getApiBaseUrl } from "../config";
import axios from "axios";
import Image from "next/image";
import ErrorBoundary from "../components/ErrorBoundary";

// PWA Service Worker Registration handled by next-pwa

// Preloader Component
function Preloader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(380deg, #1FA8DC 0%, #FEB954 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s ease-in-out'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          position: 'relative',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <Image 
            src="/logo.png" 
            alt="TopPhysics Logo" 
            width={150}
            height={150}
            style={{
              objectFit: 'cover',
              background: 'transparent'
            }}
          />
        </div>
        
        {/* Loading ring */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTop: '4px solid #1FA8DC',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.05); 
            opacity: 0.8; 
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Access Denied Preloader Component
function AccessDeniedPreloader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #1FA8DC',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div>🔒 Access Denied</div>
      <div style={{ fontSize: '1rem', opacity: 0.8 }}>Redirecting to login...</div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Redirect to Login Preloader Component
function RedirectToLoginPreloader() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #1FA8DC',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div>🔒 Redirecting to login...</div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function App({ Component, pageProps }) {
  // Create a new QueryClient instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
    },
  }));

  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [isCheckingAdminAccess, setIsCheckingAdminAccess] = useState(false);
  const [isRouteChanging, setIsRouteChanging] = useState(false);
  const [showRedirectToLogin, setShowRedirectToLogin] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  // Define public pages using useMemo to prevent recreation on every render
  const publicPages = useMemo(() => ["/", "/404", "/contact_developer"], []);
  
  // Define admin-only pages
  const adminPages = useMemo(() => [
    "/manage_assistants", 
    "/manage_assistants/add_assistant", 
    "/manage_assistants/edit_assistant", 
    "/manage_assistants/delete_assistant", 
    "/manage_assistants/all_assistants"
  ], []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem("token");
        
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Validate token with server
        const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
          setIsAuthenticated(true);
          
          // Check if user is trying to access admin pages but is not admin
          if (adminPages.includes(router.pathname) && response.data.role !== 'admin') {
            setShowAccessDenied(true);
            // Redirect to dashboard after showing preloader
            setTimeout(() => {
              setShowAccessDenied(false);
              router.push("/dashboard");
            }, 1000);
          }
        } else {
          // Token invalid, remove it
          sessionStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Token invalid or expired, remove it
        sessionStorage.removeItem("token");
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router.pathname, adminPages, router]);

  // Handle route changes for main preloader
  useEffect(() => {
    const handleRouteStart = () => {
      setIsRouteChanging(true);
    };

    const handleRouteComplete = () => {
      setIsRouteChanging(false); // Hide preloader immediately when page loads
    };

    const handleRouteError = () => {
      setIsRouteChanging(false);
    };

    router.events.on('routeChangeStart', handleRouteStart);
    router.events.on('routeChangeComplete', handleRouteComplete);
    router.events.on('routeChangeError', handleRouteError);

    return () => {
      router.events.off('routeChangeStart', handleRouteStart);
      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router]);

  // Redirect to login if not authenticated and trying to access protected page
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !publicPages.includes(router.pathname)) {
      // Show redirect to login preloader before redirect
      setShowRedirectToLogin(true);
      
      // Save the current path for redirect after login (except dashboard)
      if (router.pathname !== "/dashboard") {
        sessionStorage.setItem("redirectAfterLogin", router.pathname);
      }
      
      // Redirect after showing preloader for 1 second
      setTimeout(() => {
        setShowRedirectToLogin(false); // Reset the state
        router.push("/");
      }, 1000); // Show preloader for 1 second
    }
  }, [isLoading, isAuthenticated, router.pathname, publicPages, router]);

  // Check admin access for current route
  useEffect(() => {
    const checkAdminAccess = async () => {
      // Only check if user is authenticated and trying to access admin pages
      if (isAuthenticated && adminPages.includes(router.pathname)) {
        try {
          const token = sessionStorage.getItem("token");
          const response = await axios.get(`${getApiBaseUrl()}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.role !== 'admin') {
            setShowAccessDenied(true);
            // Redirect to dashboard after showing preloader
            setTimeout(() => {
              setShowAccessDenied(false);
              router.push("/dashboard");
            }, 1000);
          }
        } catch (error) {
          console.error("❌ Error checking admin access:", error);
          // If token validation fails, redirect to login
          sessionStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      }
    };

    // Only check admin access when route changes to an admin page
    if (isAuthenticated && adminPages.includes(router.pathname)) {
      checkAdminAccess();
    }
  }, [router.pathname, isAuthenticated, adminPages, router]);

  // Reset Access Denied state when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      setShowAccessDenied(false);
    }
  }, [isAuthenticated]);

  // Check token expiry and show warning 1 minute before expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) return;

        // Decode JWT token to get expiry time
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expiryTime - currentTime;
        
        // Show warning 1 minute (60000ms) before expiry
        if (timeUntilExpiry <= 60000 && timeUntilExpiry > 0) {
          setShowExpiryWarning(true);
        } else if (timeUntilExpiry <= 0) {
          // Token has expired, redirect to login
          sessionStorage.removeItem("token");
          setIsAuthenticated(false);
          setShowExpiryWarning(false);
        } else {
          setShowExpiryWarning(false);
        }
      } catch (error) {
        console.error("Error checking token expiry:", error);
      }
    };

    // Check immediately
    checkTokenExpiry();
    
    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Show loading while checking authentication or during route changes
  if (isLoading || isRouteChanging) {
    return <Preloader />;
  }

  // Show redirect to login preloader if redirecting due to unauthorized access
  if (showRedirectToLogin) {
    return <RedirectToLoginPreloader />;
  }

  // Show access denied preloader if redirecting due to admin access denied
  if (showAccessDenied) {
    return <AccessDeniedPreloader />;
  }

  // For unauthorized users on protected pages, show loading (will redirect)
  if (!isAuthenticated && !publicPages.includes(router.pathname)) {
    return <Preloader />;
  }

  // Only show Header/Footer if user is authenticated
  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <MantineProvider>
            <Component {...pageProps} />
            <ReactQueryDevtools initialIsOpen={true} />
          </MantineProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <MantineProvider>
          <div className="page-container" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '100vh' 
          }}>
            <Header />
            
            {/* Session Expiry Warning */}
            {showExpiryWarning && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#ff6b6b',
                color: 'white',
                padding: '10px',
                textAlign: 'center',
                zIndex: 9999,
                fontWeight: 'bold'
              }}>
                ⚠️ Your session will expire soon. Please save your work and log in again.
              </div>
            )}
            
            <div className="content" style={{ flex: 1 }}>
              <Component {...pageProps} />
            </div>
            <Footer />
          </div>
          <ReactQueryDevtools initialIsOpen={false} />
        </MantineProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
