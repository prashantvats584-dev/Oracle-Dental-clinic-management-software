import React from 'react';
import { Users, Calendar, DollarSign, Clock, Wallet, TrendingUp, Plus } from 'lucide-react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user, doctor } = useAuth();
  const [patientsSnapshot] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  const [expensesSnapshot] = useCollection(
    user ? query(collection(db, 'expenses'), where('doctorId', '==', user.uid)) : null
  );
  const [labBillsSnapshot] = useCollection(
    user ? query(collection(db, 'labBills'), where('doctorId', '==', user.uid)) : null
  );

  const today = format(new Date(), 'yyyy-MM-dd');
  const [todayAppointmentsSnapshot] = useCollection(
    user ? query(collection(db, 'appointments'), where('date', '==', today), where('doctorId', '==', user.uid)) : null
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const doctorName = doctor?.name || user?.displayName || 'Doctor';

  const totalPatients = patientsSnapshot?.docs.length || 0;
  const todayAppointments = todayAppointmentsSnapshot?.docs.length || 0;
  
  const { totalRevenue, pendingPayments, totalExpenses, totalLabCost, netProfit } = React.useMemo(() => {
    let rev = 0;
    let pend = 0;
    patientsSnapshot?.docs.forEach(doc => {
      const data = doc.data();
      rev += data.paidAmount || 0;
      pend += data.pendingAmount || 0;
    });

    const exp = expensesSnapshot?.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0) || 0;
    const lab = labBillsSnapshot?.docs.reduce((sum, doc) => sum + (doc.data().labCost || 0), 0) || 0;
    
    return {
      totalRevenue: rev,
      pendingPayments: pend,
      totalExpenses: exp,
      totalLabCost: lab,
      netProfit: rev - (exp + lab)
    };
  }, [patientsSnapshot, expensesSnapshot, labBillsSnapshot]);

  const stats = [
    { name: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-blue-500' },
    { name: "Today's Appointments", value: todayAppointments, icon: Calendar, color: 'bg-green-500' },
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
    { name: 'Pending Payments', value: `₹${pendingPayments.toLocaleString()}`, icon: Clock, color: 'bg-orange-500' },
    { name: 'Total Expenses', value: `₹${(totalExpenses + totalLabCost).toLocaleString()}`, icon: Wallet, color: 'bg-red-500' },
    { name: 'Net Profit', value: `₹${netProfit.toLocaleString()}`, icon: TrendingUp, color: netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-display text-gray-900">{getGreeting()}, Dr. {doctorName}</h1>
        <p className="mt-2 text-base text-gray-500 font-light">Here is what's happening at your clinic today.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">Overview</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/patients" className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Add Patient
          </Link>
          <Link to="/appointments" className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" /> Book Appt
          </Link>
          <Link to="/expenses" className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-1" /> Add Expense
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.name}
              whileHover={{ y: -4 }}
              className="bg-white overflow-hidden shadow-sm rounded-xl border border-gray-100 transition-all hover:shadow-md"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`p-3 rounded-lg ${item.color} bg-opacity-10`}>
                      <Icon className={`h-6 w-6 ${item.color.replace('bg-', 'text-')}`} />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-widest truncate">{item.name}</dt>
                      <dd className="text-2xl font-medium text-gray-900 mt-0.5">{item.value}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Appointments</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {todayAppointmentsSnapshot?.docs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">No appointments today</td>
                </tr>
              ) : (
                todayAppointmentsSnapshot?.docs.map((doc) => {
                  const appt = doc.data();
                  return (
                    <tr key={doc.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appt.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{appt.patientName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          appt.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          appt.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
