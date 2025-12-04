
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './redux/store';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
// import NotificationToast from './components/NotificationToast';
// import AIChat from './components/AIChat'; 
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Messages from './pages/Messages';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import Login from './pages/Login';
import Support from './pages/Support';
import { Loader2 } from 'lucide-react';

// ============================================================================
// APPLICATION CONFIGURATION FLAG
// ============================================================================
/**
 * Flag to control whether to use dummy/mock data or real API endpoints
 * 
 * true  = Use local dummy/mock data (No backend required)
 * false = Use real API endpoints from backend
 * 
 * Change this flag to switch between mock data and real API
 */
export const USE_MOCK_DATA = false;

const Layout = ({ children }: { children?: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {/* Global AI Chat Assistant - Commented out per request */}
        {/* <AIChat /> */}
      </div>
    </div>
  );
};

const App = () => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure auth state is loaded from localStorage before rendering routes
  useEffect(() => {
    // Check if we're in browser environment and store is ready
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame to ensure DOM is ready
      const initCheck = () => {
        // Store should be initialized synchronously, but give it a moment
        // to ensure localStorage access is complete
        setIsInitialized(true);
      };
      
      // Use requestAnimationFrame for better timing in production
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(initCheck);
      } else {
        setTimeout(initCheck, 10);
      }
    } else {
      setIsInitialized(true);
    }
  }, []);

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Get base path from environment or use default
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter
      basename={basePath}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        
        <Route path="/" element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/settings" element={isAuthenticated ? <Layout><Settings /></Layout> : <Navigate to="/login" />} />
        <Route path="/messages" element={isAuthenticated ? <Layout><Messages /></Layout> : <Navigate to="/login" />} />
        <Route path="/patients" element={isAuthenticated ? <Layout><Patients /></Layout> : <Navigate to="/login" />} />
        <Route path="/appointments" element={isAuthenticated ? <Layout><Appointments /></Layout> : <Navigate to="/login" />} />
        <Route path="/support" element={isAuthenticated ? <Layout><Support /></Layout> : <Navigate to="/login" />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
