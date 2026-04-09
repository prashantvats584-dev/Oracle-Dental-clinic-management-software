import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, FileText, Receipt, LogOut, Menu, Wallet, FlaskConical, Shield, X } from 'lucide-react';
import { logout } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Patients', path: '/patients', icon: Users },
  { name: 'Appointments', path: '/appointments', icon: Calendar },
  { name: 'Prescriptions', path: '/prescriptions', icon: FileText },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Lab Billing', path: '/lab-billing', icon: FlaskConical },
  { name: 'Expenses', path: '/expenses', icon: Wallet },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, doctor, isAdmin } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 border-b border-gray-200 px-4">
          <h1 className="text-2xl font-display text-blue-600 truncate">Oracle Dental</h1>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-16rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/doctors"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all active:scale-[0.98] ${
                location.pathname === '/doctors'
                  ? 'bg-purple-50 text-purple-700 shadow-sm shadow-purple-100'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className={`w-5 h-5 mr-3 ${location.pathname === '/doctors' ? 'text-purple-700' : 'text-gray-400'}`} />
              Manage Doctors
            </Link>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center px-2">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg shadow-blue-100">
              {doctor?.name?.charAt(0) || 'D'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{doctor?.name || 'Clinic Admin'}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Public Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden sticky top-0 z-10">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-display text-blue-600">Oracle Dental</h1>
          <div className="w-10 h-10" /> {/* Spacer */}
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
