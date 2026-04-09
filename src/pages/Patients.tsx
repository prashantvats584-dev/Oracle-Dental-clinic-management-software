import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, Activity, Search, User } from 'lucide-react';
import DentalChart from '../components/DentalChart';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export default function Patients() {
  const { user } = useAuth();
  const [patientsSnapshot, loading] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<{id: string, name: string} | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '', phone: '', age: '', gender: 'Male', address: '',
    totalAmount: 0, paidAmount: 0, pendingAmount: 0, dentitionType: 'Adult'
  });

  const handleOpenModal = (patient?: any) => {
    if (patient) {
      setEditingId(patient.id);
      setFormData({
        name: patient.name, phone: patient.phone, age: patient.age, gender: patient.gender, address: patient.address,
        totalAmount: patient.totalAmount, paidAmount: patient.paidAmount, pendingAmount: patient.pendingAmount,
        dentitionType: patient.dentitionType || 'Adult'
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', phone: '', age: '', gender: 'Male', address: '',
        totalAmount: 0, paidAmount: 0, pendingAmount: 0, dentitionType: 'Adult'
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenChart = (id: string, name: string) => {
    setActivePatient({ id, name });
    setIsChartOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const ageNum = Number(formData.age || 0);
    let dentitionType = formData.dentitionType;
    
    // Auto-calculate if not editing and dentitionType is default
    if (!editingId && dentitionType === 'Adult') {
      if (ageNum >= 0 && ageNum <= 5) {
        dentitionType = 'Child';
      } else if (ageNum >= 6 && ageNum <= 12) {
        dentitionType = 'Mixed';
      }
    }

    // Structure data properly and ensure numbers are parsed
    const data = {
      name: (formData.name || '').trim(),
      phone: (formData.phone || '').trim(),
      age: ageNum,
      gender: formData.gender || 'Male',
      address: (formData.address || '').trim(),
      totalAmount: Number(formData.totalAmount || 0),
      paidAmount: Number(formData.paidAmount || 0),
      pendingAmount: Number(formData.pendingAmount || 0),
      dentitionType,
      doctorId: user?.uid || ''
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'patients', editingId), { ...data, updatedAt: serverTimestamp() });
        alert("Patient updated successfully!");
      } else {
        await addDoc(collection(db, 'patients'), { ...data, createdAt: serverTimestamp() });
        alert("Patient added successfully!");
      }
      
      // Reset form and close modal
      setFormData({
        name: '', phone: '', age: '', gender: 'Male', address: '',
        totalAmount: 0, paidAmount: 0, pendingAmount: 0
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving patient:", error);
      alert(`Failed to save patient: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this patient?")) {
      try {
        await deleteDoc(doc(db, 'patients', id));
      } catch (error) {
        console.error("Error deleting patient:", error);
      }
    }
  };

  const filteredPatients = React.useMemo(() => {
    if (!patientsSnapshot) return [];
    const searchLower = searchQuery.toLowerCase();
    return patientsSnapshot.docs.filter(doc => {
      const patient = doc.data();
      return patient.name?.toLowerCase().includes(searchLower) || 
             patient.phone?.includes(searchQuery);
    });
  }, [patientsSnapshot, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-display text-gray-900">Patients</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Patient
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Contact</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Balance</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={4} className="px-6 py-4 text-center">Loading...</td>
                  </motion.tr>
                ) : filteredPatients?.length === 0 ? (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No patients found.</td>
                  </motion.tr>
                ) : filteredPatients?.map((doc) => {
                  const patient = doc.data();
                  return (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/patients/${doc.id}`} className="text-sm font-bold text-blue-600 hover:underline">{patient.name}</Link>
                        <div className="text-xs text-gray-500 font-medium">{patient.age} yrs, {patient.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {patient.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-bold">Total: ₹{patient.totalAmount}</div>
                        <div className="text-xs text-red-600 font-bold">Pending: ₹{patient.pendingAmount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Link to={`/patients/${doc.id}`} className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors" title="Profile">
                            <User className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleOpenChart(doc.id, patient.name)} className="p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors" title="Dental Chart">
                            <Activity className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenModal({ id: doc.id, ...patient })} className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{editingId ? 'Edit Patient' : 'Add Patient'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Age</label>
                      <input type="number" required value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Gender</label>
                      <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dentition Type</label>
                      <select value={formData.dentitionType} onChange={e => setFormData({...formData, dentitionType: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="Adult">Adult (Permanent)</option>
                        <option value="Child">Child (Primary)</option>
                        <option value="Mixed">Mixed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input type="text" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Total (₹)</label>
                      <input type="number" required value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Paid (₹)</label>
                      <input type="number" required value={formData.paidAmount} onChange={e => setFormData({...formData, paidAmount: Number(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Pending (₹)</label>
                      <input type="number" required value={formData.pendingAmount} onChange={e => setFormData({...formData, pendingAmount: Number(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                      Save
                    </button>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dental Chart Modal */}
      {isChartOpen && activePatient && (
        <DentalChart 
          patientId={activePatient.id} 
          patientName={activePatient.name} 
          initialDentitionType={activePatient.dentitionType}
          onClose={() => setIsChartOpen(false)} 
        />
      )}
    </div>
  );
}
