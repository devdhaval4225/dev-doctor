
import React from 'react';
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
export const USE_MOCK_DATA = true;

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
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <BrowserRouter>
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
