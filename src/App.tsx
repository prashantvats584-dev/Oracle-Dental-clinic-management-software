/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function AppContent({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<AppContent><PageWrapper><Dashboard /></PageWrapper></AppContent>} />
            <Route path="/patients" element={<AppContent><PageWrapper><Patients /></PageWrapper></AppContent>} />
            <Route path="/patients/:id" element={<AppContent><PageWrapper><PatientProfile /></PageWrapper></AppContent>} />
            <Route path="/appointments" element={<AppContent><PageWrapper><Appointments /></PageWrapper></AppContent>} />
            <Route path="/prescriptions" element={<AppContent><PageWrapper><Prescriptions /></PageWrapper></AppContent>} />
            <Route path="/invoices" element={<AppContent><PageWrapper><Invoices /></PageWrapper></AppContent>} />
            <Route path="/lab-billing" element={<AppContent><PageWrapper><LabBilling /></PageWrapper></AppContent>} />
            <Route path="/expenses" element={<AppContent><PageWrapper><Expenses /></PageWrapper></AppContent>} />
            <Route path="/doctors" element={<AppContent><PageWrapper><Doctors /></PageWrapper></AppContent>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
