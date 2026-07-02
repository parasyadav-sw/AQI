import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ChatBot } from './components/ChatBot';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { GovDashboard } from './pages/GovDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

// Route Guard for Authenticated Users
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-semibold">
        🛡️ Verification in progress...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized roles back to their default dashboards
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'government') return <Navigate to="/government" replace />;
    return <Navigate to="/citizen" replace />;
  }

  return <>{children}</>;
};

const DashboardRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/citizen" 
          element={
            <ProtectedRoute allowedRoles={['citizen', 'government', 'admin']}>
              <Layout>
                <CitizenDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/government" 
          element={
            <ProtectedRoute allowedRoles={['government', 'admin']}>
              <Layout>
                <GovDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />

        {/* Fallback Catch-All Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Render Floating AI Chatbot overlay if logged in */}
      {isAuthenticated && <ChatBot />}
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DashboardRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
