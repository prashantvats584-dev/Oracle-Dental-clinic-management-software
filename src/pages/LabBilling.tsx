import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export default function LabBilling() {
  const { user } = useAuth();
  const [labBillsSnapshot, loading] = useCollection(
    user ? query(collection(db, 'labBills'), where('doctorId', '==', user.uid), orderBy('date', 'desc')) : null
  );
  const [patientsSnapshot] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    patientId: '',
    patientName: '',
    caseType: '',
    toothNumber: '',
    labName: '',
    labCost: 0,
    patientCharge: 0,
    status: 'Sent'
  });

  const statuses = ['Sent', 'Received', 'Delivered'];

  const handleOpenModal = (bill?: any) => {
    if (bill) {
      setEditingId(bill.id);
      setFormData({
        date: bill.date,
        patientId: bill.patientId,
        patientName: bill.patientName,
        caseType: bill.caseType,
        toothNumber: bill.toothNumber,
        labName: bill.labName,
        labCost: bill.labCost,
        patientCharge: bill.patientCharge,
        status: bill.status
      });
    } else {
      setEditingId(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        patientId: '',
        patientName: '',
        caseType: '',
        toothNumber: '',
        labName: '',
        labCost: 0,
        patientCharge: 0,
        status: 'Sent'
      });
    }
    setIsModalOpen(true);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const patient = patientsSnapshot?.docs.find(d => d.id === pId)?.data();
    if (patient) {
      setFormData({ ...formData, patientId: pId, patientName: patient.name });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName) {
      alert("Patient Name is required.");
      return;
    }

    const profit = Number(formData.patientCharge) - Number(formData.labCost);

    try {
      const data = { 
        ...formData, 
        labCost: Number(formData.labCost), 
        patientCharge: Number(formData.patientCharge),
        profit,
        doctorId: user?.uid
      };
      if (editingId) {
        await updateDoc(doc(db, 'labBills', editingId), { 
          ...data, 
          updatedAt: serverTimestamp() 
        });
      } else {
        await addDoc(collection(db, 'labBills'), { 
          ...data, 
          createdAt: serverTimestamp() 
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving lab bill:", error);
      alert("Failed to save lab bill.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this lab bill?")) {
      try {
        await deleteDoc(doc(db, 'labBills', id));
      } catch (error) {
        console.error("Error deleting lab bill:", error);
      }
    }
  };

  const totalLabCost = labBillsSnapshot?.docs.reduce((sum, doc) => sum + (doc.data().labCost || 0), 0) || 0;
  const totalProfit = labBillsSnapshot?.docs.reduce((sum, doc) => sum + (doc.data().profit || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Lab Billing</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Lab Work
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-blue-100 rounded-full mr-4">
            <FlaskConical className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Lab Cost</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalLabCost.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-green-100 rounded-full mr-4">
            <FlaskConical className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Lab Profit</p>
            <p className="text-2xl font-bold text-green-600">₹{totalProfit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lab Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financials</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : labBillsSnapshot?.docs.map((doc) => {
                const bill = doc.data();
                return (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.patientName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>{bill.caseType}</div>
                      <div className="text-xs">Tooth: {bill.toothNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.labName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="text-red-600">Cost: ₹{bill.labCost}</div>
                      <div className="text-green-600">Charge: ₹{bill.patientCharge}</div>
                      <div className="text-blue-600 font-medium">Profit: ₹{bill.profit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        bill.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                        bill.status === 'Received' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleOpenModal({ id: doc.id, ...bill })} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{editingId ? 'Edit Lab Work' : 'Add Lab Work'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {!editingId && (
                    <div className="bg-blue-50 p-3 rounded-md">
                      <label className="block text-sm font-medium text-blue-800 mb-1">Select Patient</label>
                      <select onChange={handlePatientSelect} className="mt-1 block w-full border border-blue-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                        <option value="">-- Select Patient --</option>
                        {patientsSnapshot?.docs.map(p => (
                          <option key={p.id} value={p.id}>{p.data().name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patient Name *</label>
                    <input type="text" required value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Case Type</label>
                      <input type="text" required value={formData.caseType} onChange={e => setFormData({...formData, caseType: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., PFM Crown, Denture" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tooth Number</label>
                      <input type="text" value={formData.toothNumber} onChange={e => setFormData({...formData, toothNumber: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., 11, 12" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lab Name</label>
                    <input type="text" required value={formData.labName} onChange={e => setFormData({...formData, labName: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lab Cost (₹)</label>
                      <input type="number" required min="0" value={formData.labCost} onChange={e => setFormData({...formData, labCost: Number(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Patient Charge (₹)</label>
                      <input type="number" required min="0" value={formData.patientCharge} onChange={e => setFormData({...formData, patientCharge: Number(e.target.value)})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
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
    </div>
  );
}
