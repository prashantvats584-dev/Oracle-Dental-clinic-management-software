import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

// SVG Icon for WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function Appointments() {
  const { user } = useAuth();
  const [appointmentsSnapshot, loading] = useCollection(
    user ? query(collection(db, 'appointments'), where('doctorId', '==', user.uid), orderBy('date', 'desc'), orderBy('time', 'asc')) : null
  );
  const [patientsSnapshot] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{title: string, message: string, action?: {label: string, onClick: () => void}} | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [formData, setFormData] = useState({
    patientId: '', patientName: '', phone: '', chiefComplaint: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', status: 'Scheduled', notes: ''
  });

  const handleOpenModal = (appointment?: any) => {
    if (appointment) {
      setEditingId(appointment.id);
      setFormData({
        patientId: appointment.patientId || '', 
        patientName: appointment.patientName, 
        phone: appointment.phone || '',
        chiefComplaint: appointment.chiefComplaint || '',
        date: appointment.date, 
        time: appointment.time, 
        status: appointment.status, 
        notes: appointment.notes || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        patientId: '', patientName: '', phone: '', chiefComplaint: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', status: 'Scheduled', notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const patient = patientsSnapshot?.docs.find(d => d.id === pId)?.data();
    if (patient) {
      setFormData({ ...formData, patientId: pId, patientName: patient.name || '', phone: patient.phone || '' });
    }
  };

  const handleWhatsApp = (appt: any) => {
    if (!appt.phone) {
      setAlertMessage({ title: 'Error', message: 'No phone number available for this patient.' });
      return;
    }
    const message = `Hello ${appt.patientName}, your appointment at Oracle Dental Clinic is confirmed for ${appt.date} at ${appt.time}.`;
    const url = `https://wa.me/91${appt.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const appointmentData = {
      patientId: formData.patientId || '',
      patientName: (formData.patientName || '').trim(),
      phone: (formData.phone || '').trim(),
      chiefComplaint: (formData.chiefComplaint || '').trim(),
      date: formData.date || '',
      time: formData.time || '',
      status: formData.status || 'Scheduled',
      notes: (formData.notes || '').trim(),
      doctorId: user?.uid || ''
    };

    if (!appointmentData.patientName || !appointmentData.phone || !appointmentData.chiefComplaint) {
      setAlertMessage({ title: 'Validation Error', message: 'Patient Name, Phone Number, and Chief Complaint are required.' });
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'appointments', editingId), { ...appointmentData, updatedAt: serverTimestamp() });
        setAlertMessage({ title: 'Success', message: 'Appointment updated successfully!' });
      } else {
        await addDoc(collection(db, 'appointments'), { ...appointmentData, createdAt: serverTimestamp() });
        setAlertMessage({ 
          title: 'Success', 
          message: 'Appointment booked successfully!',
          action: {
            label: 'Send WhatsApp Confirmation',
            onClick: () => handleWhatsApp(appointmentData)
          }
        });
      }
      
      // Reset form and close modal
      setFormData({
        patientId: '', patientName: '', phone: '', chiefComplaint: '', date: format(new Date(), 'yyyy-MM-dd'), time: '10:00', status: 'Scheduled', notes: ''
      });
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving appointment:", error);
      setAlertMessage({ title: 'Error', message: `Failed to save appointment: ${error.message}` });
    }
  };

  const handleDelete = async () => {
    if (confirmDeleteId) {
      try {
        await deleteDoc(doc(db, 'appointments', confirmDeleteId));
        setConfirmDeleteId(null);
      } catch (error) {
        console.error("Error deleting appointment:", error);
        setAlertMessage({ title: 'Error', message: 'Failed to delete appointment.' });
      }
    }
  };

  const filteredAppointments = React.useMemo(() => {
    if (!appointmentsSnapshot) return [];
    return appointmentsSnapshot.docs.filter(doc => {
      if (!filterDate) return true;
      return doc.data().date === filterDate;
    });
  }, [appointmentsSnapshot, filterDate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter Date:</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-sm text-gray-500 hover:text-gray-700">Clear</button>
            )}
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" /> Book Appointment
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredAppointments?.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No appointments found.</td></tr>
              ) : filteredAppointments?.map((doc) => {
                const appt = doc.data();
                return (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appt.date}</div>
                      <div className="text-sm text-gray-500">{appt.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{appt.patientName}</div>
                      <div className="text-sm text-gray-500">{appt.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appt.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        appt.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleWhatsApp(appt)} className="text-green-600 hover:text-green-900 mr-4" title="Send WhatsApp Confirmation">
                        <WhatsAppIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleOpenModal({ id: doc.id, ...appt })} className="text-blue-600 hover:text-blue-900 mr-4">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(doc.id)} className="text-red-600 hover:text-red-900">
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{editingId ? 'Edit Appointment' : 'Book Appointment'}</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {!editingId && (
                    <div className="bg-blue-50 p-3 rounded-md mb-4">
                      <label className="block text-sm font-medium text-blue-800 mb-1">Auto-fill from existing patient (Optional)</label>
                      <select onChange={handlePatientSelect} className="mt-1 block w-full border border-blue-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                        <option value="">-- Select Patient --</option>
                        {patientsSnapshot?.docs.map(p => (
                          <option key={p.id} value={p.id}>{p.data().name} ({p.data().phone})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Patient Name *</label>
                      <input type="text" required value={formData.patientName} onChange={e => setFormData({...formData, patientName: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                      <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="9876543210" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chief Complaint *</label>
                    <input type="text" required value={formData.chiefComplaint} onChange={e => setFormData({...formData, chiefComplaint: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="e.g., Toothache, Cleaning" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date</label>
                      <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Time</label>
                      <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                      <option>Scheduled</option>
                      <option>Completed</option>
                      <option>Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
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
      {/* Alert Modal */}
      {alertMessage && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setAlertMessage(null)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{alertMessage.title}</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 whitespace-pre-wrap">{alertMessage.message}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                {alertMessage.action && (
                  <button 
                    type="button" 
                    onClick={() => {
                      alertMessage.action!.onClick();
                      setAlertMessage(null);
                    }} 
                    className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:w-auto sm:text-sm"
                  >
                    <WhatsAppIcon className="w-4 h-4 mr-2" />
                    {alertMessage.action.label}
                  </button>
                )}
                <button type="button" onClick={() => setAlertMessage(null)} className="mt-3 sm:mt-0 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setConfirmDeleteId(null)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Appointment</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Are you sure you want to delete this appointment? This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button type="button" onClick={handleDelete} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDeleteId(null)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
