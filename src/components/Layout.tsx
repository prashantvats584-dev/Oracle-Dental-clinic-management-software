import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Calendar, FileText, Receipt, LogOut, Menu, Wallet, FlaskConical, Shield } from 'lucide-react';
import { logout } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
          <h1 className="text-xl font-bold text-blue-600 truncate">Oracle Dental Clinic</h1>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
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
              className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === '/doctors'
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className={`w-5 h-5 mr-3 ${location.pathname === '/doctors' ? 'text-purple-700' : 'text-gray-400'}`} />
              Manage Doctors
            </Link>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {doctor?.name?.charAt(0) || user?.displayName?.charAt(0) || 'D'}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">Dr. {doctor?.name || user?.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{doctor?.role || 'Doctor'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-gray-500 rounded-md hover:bg-gray-100 focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-blue-600">Oracle Dental Clinic</h1>
          <div className="w-6"></div> {/* Spacer for centering */}
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
