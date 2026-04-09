import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ChevronRight, Edit2, Phone, ChevronDown, ChevronUp, Bell, 
  Calendar, PlayCircle, Share2, Printer, Download, MoreVertical,
  Activity, X, Save
} from 'lucide-react';
import DentalChart from '../components/DentalChart';

import { useAuth } from '../contexts/AuthContext';

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Patient Overview');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  
  const [consultationForm, setConsultationForm] = useState({
    chiefComplaint: '',
    diagnosis: '',
    treatment: '',
    notes: ''
  });

  useEffect(() => {
    if (!id || !user) return;

    const fetchPatientData = async () => {
      try {
        const docRef = doc(db, 'patients', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Security check: ensure patient belongs to doctor
          if (data.doctorId === user.uid) {
            setPatient({ id: docSnap.id, ...data });
          } else {
            setPatient(null);
          }
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();

    // Listen for consultations
    const q = query(
      collection(db, 'consultations'),
      where('patientId', '==', id),
      where('doctorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setConsultations(docs);
    });

    return () => unsubscribe();
  }, [id, user]);

  const handleStartConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !patient || !user) return;

    try {
      await addDoc(collection(db, 'consultations'), {
        patientId: id,
        patientName: patient.name,
        doctorId: user.uid,
        ...consultationForm,
        createdAt: serverTimestamp()
      });
      setIsConsultationModalOpen(false);
      setConsultationForm({ chiefComplaint: '', diagnosis: '', treatment: '', notes: '' });
      alert("Consultation added successfully!");
    } catch (error) {
      console.error("Error adding consultation:", error);
      alert("Failed to add consultation.");
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>;
  }

  if (!patient) {
    return <div className="text-center text-gray-500 mt-10">Patient not found.</div>;
  }

  const tabs = [
    'Patient Overview', 'Visual Examination', 'Medications', 
    'Medical Background', 'Paperwork', 'Invoice', 'Vitals', 'Private Notes'
  ];

  return (
    <div className="min-h-screen bg-gray-50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-blue-600 font-medium mb-4">
        <Link to="/" className="hover:underline flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
          Home
        </Link>
        <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
        <span className="text-gray-600">Patient profile</span>
      </div>

      {/* Top Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        {/* Patient Header */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
                <button className="text-gray-400 hover:text-gray-600"><Edit2 className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center text-sm text-gray-500 mt-1 gap-2 divide-x divide-gray-300">
                <span className="pr-2">{patient.gender}</span>
                <span className="px-2">{patient.age} Years</span>
                <span className="px-2">{patient.phone}</span>
                <span className="px-2">
                  Dentition: <span className="font-medium text-gray-900">{patient.dentitionType || 'Adult'}</span>
                </span>
                <span className="pl-2 text-gray-400">{patient.id.substring(0, 12).toUpperCase()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex border border-blue-200 rounded-lg overflow-hidden">
              <button className="px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </button>
              <button className="px-2 py-2 bg-white border-l border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center justify-center">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <button className="px-4 py-2 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center gap-2">
              <span className="text-red-500 font-bold border border-red-200 rounded px-1 text-xs">ABHA</span>
              Add ABHA
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Expandable Dashboard Cards */}
        {isExpanded && (
          <div className="p-6 bg-gray-50/50 grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Dental Chart Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Dental Chart</h3>
                <button 
                  onClick={() => setIsChartOpen(true)}
                  className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  <Activity className="w-3 h-3" /> Open Full Chart
                </button>
              </div>
              <div 
                onClick={() => setIsChartOpen(true)}
                className="flex flex-col justify-center items-center h-32 mb-4 relative cursor-pointer group"
              >
                <div className="grid grid-cols-8 gap-1 opacity-40 group-hover:opacity-60 transition-opacity">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="w-4 h-6 bg-gray-200 rounded-sm border border-gray-300"></div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white/80 px-3 py-1 rounded-full text-xs font-bold text-blue-600 shadow-sm border border-blue-100">Click to View Chart</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex gap-3">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded-sm"></span> Exam</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Diag</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Proc</span>
                </div>
              </div>
            </div>

            {/* Dental Procedures Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Dental Procedures</h3>
                <button className="text-gray-400 hover:text-gray-600"><Activity className="w-4 h-4" /></button>
              </div>
              <div>
                <h4 className="text-sm text-gray-500 mb-2">Proposed</h4>
                <div className="flex items-start gap-2 text-sm">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5 flex-shrink-0"></span>
                  <span className="font-medium text-yellow-600 whitespace-nowrap">04 APR '26</span>
                  <span className="text-gray-700 truncate">Flouride Varnish (Caries preventive treatment) a...</span>
                </div>
              </div>
            </div>

            {/* Payment Card */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900">Payment</h3>
                <span className="text-gray-500 font-serif">₹</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4 flex-1">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Pending</div>
                  <div className="text-lg font-bold text-gray-900">₹{patient.pendingAmount || '0.00'}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Advance</div>
                  <div className="text-lg font-bold text-gray-900">₹0.00</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-400 flex items-center justify-center gap-2 bg-gray-50 cursor-not-allowed">
                  Send reminder <Bell className="w-4 h-4" />
                </button>
                <button className="py-2 px-4 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 hover:bg-blue-50">
                  Collect advance
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max px-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'Patient Overview' && (
        <div className="space-y-4">
          {/* Action Banner */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-center px-4 border-r border-gray-200">
                <div className="text-blue-600 font-bold text-sm">All</div>
                <div className="text-gray-900 font-medium">{new Date().getFullYear()}</div>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Start New Consultation or Schedule</h2>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium">
                Schedule <Calendar className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsConsultationModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Start <PlayCircle className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Timeline Items */}
          {consultations.length === 0 ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No consultations recorded yet. Click "Start" to add one.</p>
            </div>
          ) : (
            consultations.map((consultation) => (
              <div key={consultation.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
                <div className="md:w-48 flex-shrink-0">
                  <div className="text-gray-900 font-medium">
                    {consultation.createdAt?.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-blue-600 text-sm mt-1 cursor-pointer hover:underline">Case Sheet</div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-gray-900 font-bold mb-3">
                    {consultation.treatment ? `Treatment: ${consultation.treatment}` : 'General Consultation'}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {consultation.chiefComplaint && (
                      <span className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 bg-gray-50">
                        Complaint: {consultation.chiefComplaint}
                      </span>
                    )}
                    {consultation.diagnosis && (
                      <span className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 bg-gray-50">
                        Diagnosis: {consultation.diagnosis}
                      </span>
                    )}
                  </div>
                  {consultation.notes && (
                    <p className="text-sm text-gray-500 italic">Note: {consultation.notes}</p>
                  )}
                </div>

                <div className="flex items-start gap-3 text-blue-600 md:ml-auto">
                  <button className="p-1.5 hover:bg-blue-50 rounded"><Share2 className="w-5 h-5" /></button>
                  <button className="p-1.5 hover:bg-blue-50 rounded"><Printer className="w-5 h-5" /></button>
                  <button className="p-1.5 hover:bg-blue-50 rounded"><Download className="w-5 h-5" /></button>
                  <button className="p-1.5 hover:bg-blue-50 rounded"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Consultation Modal */}
      {isConsultationModalOpen && (
        <div className="fixed inset-0 z-[80] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsConsultationModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <form onSubmit={handleStartConsultation}>
                <div className="bg-white px-6 pt-5 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">New Consultation</h3>
                    <button type="button" onClick={() => setIsConsultationModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                    <textarea 
                      required
                      rows={2}
                      value={consultationForm.chiefComplaint}
                      onChange={e => setConsultationForm({...consultationForm, chiefComplaint: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Pain in upper left molar"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                    <input 
                      type="text"
                      value={consultationForm.diagnosis}
                      onChange={e => setConsultationForm({...consultationForm, diagnosis: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Dental Caries"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
                    <input 
                      type="text"
                      value={consultationForm.treatment}
                      onChange={e => setConsultationForm({...consultationForm, treatment: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Composite Filling"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea 
                      rows={2}
                      value={consultationForm.notes}
                      onChange={e => setConsultationForm({...consultationForm, notes: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsConsultationModalOpen(false)} className="px-4 py-2 text-gray-700 font-medium">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Consultation
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dental Chart Modal */}
      {isChartOpen && patient && (
        <DentalChart 
          patientId={patient.id} 
          patientName={patient.name} 
          onClose={() => setIsChartOpen(false)} 
        />
      )}
      
      {activeTab !== 'Patient Overview' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
          Content for {activeTab} will be displayed here.
        </div>
      )}
    </div>
  );
}
