/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import { motion, AnimatePresence } from 'motion/react';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Prescriptions = lazy(() => import('./pages/Prescriptions'));
const Invoices = lazy(() => import('./pages/Invoices'));
const LabBilling = lazy(() => import('./pages/LabBilling'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Doctors = lazy(() => import('./pages/Doctors'));

// Page wrapper for smooth transitions
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium font-display">Loading...</p>
    </div>
  </div>
);

function PrivateRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { user, loading, isAuthorized, isAdmin } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAuthorized) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4 text-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 font-display">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              Your email address ({user.email}) is not authorized. Access is restricted exclusively to <strong>oracledentalunit@gmail.com</strong> and <strong>prashantvats584@gmail.com</strong>.
            </p>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              Sign out and try another account
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />;
  }

  return <Layout>{children}</Layout>;
}

function Login() {
  const { user, loading, isAuthorized } = useAuth();

  if (loading) return <PageLoader />;
  if (user && isAuthorized) return <Navigate to="/" />;

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.594 15.12a2 2 0 00-1.022.547l-2.387 2.387a2 2 0 000 2.828l.596.596a2 2 0 002.828 0l2.387-2.387a2 2 0 011.022-.547l2.387-.477a6 6 0 013.86-.517l.318-.158a6 6 0 003.86-.517l2.387.477a2 2 0 011.022.547l2.387 2.387a2 2 0 002.828 0l.596-.596a2 2 0 000-2.828l-2.387-2.387z" />
              </svg>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 font-display">
            Oracle Dental Clinic
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Restricted access for authorized clinic administrators only
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 mr-3" alt="Google" />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><PageWrapper><Dashboard /></PageWrapper></PrivateRoute>} />
            <Route path="/patients" element={<PrivateRoute><PageWrapper><Patients /></PageWrapper></PrivateRoute>} />
            <Route path="/patients/:id" element={<PrivateRoute><PageWrapper><PatientProfile /></PageWrapper></PrivateRoute>} />
            <Route path="/appointments" element={<PrivateRoute><PageWrapper><Appointments /></PageWrapper></PrivateRoute>} />
            <Route path="/prescriptions" element={<PrivateRoute><PageWrapper><Prescriptions /></PageWrapper></PrivateRoute>} />
            <Route path="/invoices" element={<PrivateRoute><PageWrapper><Invoices /></PageWrapper></PrivateRoute>} />
            <Route path="/lab-billing" element={<PrivateRoute><PageWrapper><LabBilling /></PageWrapper></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><PageWrapper><Expenses /></PageWrapper></PrivateRoute>} />
            <Route path="/doctors" element={<PrivateRoute requireAdmin={true}><PageWrapper><Doctors /></PageWrapper></PrivateRoute>} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
