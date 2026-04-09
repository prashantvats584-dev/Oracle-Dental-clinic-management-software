import React, { useState, useEffect, useRef } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, getDoc, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, X, Download, Sparkles, Image as ImageIcon, Settings } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { suggestDiagnosis, suggestMedicines } from '../lib/ai';

import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// SVG Icon for WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function Prescriptions() {
  const { user } = useAuth();
  const [prescriptionsSnapshot, loading] = useCollection(
    user ? query(collection(db, 'prescriptions'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc')) : null
  );
  const [patientsSnapshot] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [letterheadUrl, setLetterheadUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    patientId: '', patientName: '', phone: '', 
    chiefComplaint: '', diagnosis: '', 
    investigations: '', 
    treatmentTooth: '', treatmentName: '', treatmentPrice: '',
    dietAdvice: '', hygieneAdvice: '', followUp: ''
  });
  
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', duration: '', instructions: '' }]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const location = useLocation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'clinic'));
        if (docSnap.exists() && docSnap.data().letterheadUrl) {
          setLetterheadUrl(docSnap.data().letterheadUrl);
        }
      } catch (e) {
        console.error("Error fetching settings", e);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (location.state && location.state.patientId) {
      const { patientId, patientName, tooth, diagnosis, treatment } = location.state;
      setFormData(prev => ({
        ...prev,
        patientId,
        patientName,
        treatmentTooth: tooth ? String(tooth) : '',
        diagnosis: diagnosis || '',
        treatmentName: treatment || ''
      }));
      setIsModalOpen(true);
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setLetterheadUrl(base64String);
        await setDoc(doc(db, 'settings', 'clinic'), { letterheadUrl: base64String }, { merge: true });
        alert("Letterhead uploaded successfully!");
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading letterhead:", error);
      alert("Failed to upload letterhead.");
      setUploadingImage(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ 
      patientId: '', patientName: '', phone: '', 
      chiefComplaint: '', diagnosis: '', investigations: '', 
      treatmentTooth: '', treatmentName: '', treatmentPrice: '',
      dietAdvice: '', hygieneAdvice: '', followUp: ''
    });
    setMedicines([{ name: '', dosage: '', duration: '', instructions: '' }]);
    setIsModalOpen(true);
  };

  const handlePatientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const patient = patientsSnapshot?.docs.find(d => d.id === pId)?.data();
    if (patient) {
      setFormData({ ...formData, patientId: pId, patientName: patient.name, phone: patient.phone || '' });
    }
  };

  const handleMedicineChange = (index: number, field: string, value: string) => {
    const newMedicines = [...medicines];
    newMedicines[index] = { ...newMedicines[index], [field]: value };
    setMedicines(newMedicines);
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '', instructions: '' }]);
  };

  const removeMedicineRow = (index: number) => {
    const newMedicines = [...medicines];
    newMedicines.splice(index, 1);
    setMedicines(newMedicines);
  };

  const handleAiDiagnosis = async () => {
    if (!formData.chiefComplaint) {
      alert("Please enter a chief complaint first.");
      return;
    }
    setAiLoading(true);
    const suggestion = await suggestDiagnosis("Not specified", formData.chiefComplaint);
    if (suggestion) {
      setFormData(prev => ({
        ...prev,
        diagnosis: suggestion.diagnosis || prev.diagnosis,
        treatmentName: suggestion.suggestedTreatment || prev.treatmentName
      }));
    }
    setAiLoading(false);
  };

  const handleAiMedicines = async () => {
    if (!formData.diagnosis) {
      alert("Please enter a diagnosis first.");
      return;
    }
    setAiLoading(true);
    const suggestions = await suggestMedicines(formData.diagnosis, formData.chiefComplaint);
    if (suggestions && suggestions.length > 0) {
      const formattedMeds = suggestions.map((m: any) => ({
        name: m.name || '',
        dosage: m.dosage || '',
        duration: m.duration || '',
        instructions: ''
      }));
      setMedicines(formattedMeds);
    }
    setAiLoading(false);
  };

  const generatePDF = async (prescription: any) => {
    const doc = new jsPDF();
    
    // Add Letterhead Background if available
    if (letterheadUrl) {
      try {
        // We need to load the image first
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = letterheadUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        // Assuming A4 size (210x297mm)
        doc.addImage(img, 'JPEG', 0, 0, 210, 297);
      } catch (e) {
        console.error("Failed to load letterhead image", e);
      }
    } else {
      // Default Header if no letterhead
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text('Oracle Dental Clinic', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('KTS Complex, Jaat Chowk, Chipiyana Buzurg', 105, 28, { align: 'center' });
      doc.text('Greater Noida, 201009', 105, 34, { align: 'center' });
      doc.setDrawColor(200);
      doc.line(20, 40, 190, 40);
    }

    // Start content below header (adjust Y based on letterhead design, assuming 50 is safe)
    let currentY = 50;

    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Patient Name: ${prescription.patientName}`, 20, currentY);
    const dateStr = prescription.date ? new Date(prescription.date.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, 140, currentY);
    currentY += 10;

    doc.setFont("helvetica", "normal");
    if (prescription.chiefComplaint) {
      doc.text(`Chief Complaint: ${prescription.chiefComplaint}`, 20, currentY);
      currentY += 10;
    }
    if (prescription.diagnosis) {
      doc.text(`Diagnosis: ${prescription.diagnosis}`, 20, currentY);
      currentY += 10;
    }

    if (prescription.treatmentName) {
      doc.setFont("helvetica", "bold");
      doc.text('Treatment Done:', 20, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`${prescription.treatmentName} ${prescription.treatmentTooth ? `(Tooth: ${prescription.treatmentTooth})` : ''}`, 60, currentY);
      currentY += 15;
    }

    // Medicines Table
    if (prescription.medicines && prescription.medicines.length > 0 && prescription.medicines[0].name) {
      doc.setFont("helvetica", "bold");
      doc.text('Rx (Medicines Prescribed):', 20, currentY);
      currentY += 5;
      
      const tableColumn = ["Medicine Name", "Dosage", "Duration", "Instructions"];
      const tableRows = prescription.medicines.map((m: any) => [
        m.name, m.dosage, m.duration, m.instructions
      ]);

      (doc as any).autoTable({
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 20, right: 20 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Advice Section
    if (prescription.dietAdvice || prescription.hygieneAdvice || prescription.followUp) {
      doc.setFont("helvetica", "bold");
      doc.text('Advice & Instructions:', 20, currentY);
      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      if (prescription.dietAdvice) {
        doc.text(`• Diet: ${prescription.dietAdvice}`, 25, currentY);
        currentY += 6;
      }
      if (prescription.hygieneAdvice) {
        doc.text(`• Oral Hygiene: ${prescription.hygieneAdvice}`, 25, currentY);
        currentY += 6;
      }
      if (prescription.followUp) {
        doc.text(`• Follow-up: ${prescription.followUp}`, 25, currentY);
        currentY += 6;
      }
    }

    // Doctor Signature (Bottom Right)
    doc.setFont("helvetica", "bold");
    doc.text('Dr. Signature', 160, 270);
    doc.setDrawColor(0);
    doc.line(150, 265, 190, 265);

    doc.save(`Prescription_${prescription.patientName.replace(/\s+/g, '_')}.pdf`);
  };

  const shareViaWhatsApp = (prescription: any) => {
    if (!prescription.phone) {
      alert("Patient phone number is missing.");
      return;
    }
    const medsText = prescription.medicines.map((m: any) => `${m.name} - ${m.dosage} (${m.duration})`).join('\n');
    const text = `Hello ${prescription.patientName},\n\nHere is your prescription from Oracle Dental Clinic:\n\nDiagnosis: ${prescription.diagnosis}\n\nMedicines:\n${medsText}\n\n${prescription.followUp ? `Follow-up: ${prescription.followUp}\n\n` : ''}Take care!`;
    const url = `https://wa.me/91${prescription.phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.patientName) {
      alert("Please select a patient.");
      return;
    }

    const prescriptionData = {
      patientId: formData.patientId,
      patientName: formData.patientName.trim(),
      phone: formData.phone.trim(),
      chiefComplaint: formData.chiefComplaint.trim(),
      diagnosis: formData.diagnosis.trim(),
      investigations: formData.investigations.trim(),
      treatmentTooth: formData.treatmentTooth.trim(),
      treatmentName: formData.treatmentName.trim(),
      treatmentPrice: formData.treatmentPrice.trim(),
      dietAdvice: formData.dietAdvice.trim(),
      hygieneAdvice: formData.hygieneAdvice.trim(),
      followUp: formData.followUp.trim(),
      medicines: medicines.filter(m => m.name.trim() !== ''),
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      doctorId: user?.uid || ''
    };

    try {
      await addDoc(collection(db, 'prescriptions'), prescriptionData);
      setIsModalOpen(false);
      alert("Prescription saved successfully!");
    } catch (error: any) {
      console.error("Error adding prescription: ", error);
      alert(`Failed to save prescription. Error: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        await deleteDoc(doc(db, 'prescriptions', id));
      } catch (error) {
        console.error("Error deleting prescription: ", error);
        alert("Failed to delete prescription.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </button>
          <button 
            onClick={handleOpenModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Prescription
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsSettingsOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Prescription Settings</h3>
                  <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Letterhead Background</label>
                    {letterheadUrl && (
                      <div className="mb-4 border rounded-lg p-2 bg-gray-50">
                        <img src={letterheadUrl} alt="Letterhead Preview" className="w-full h-32 object-contain" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleLetterheadUpload}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingImage ? 'Uploading...' : (letterheadUrl ? 'Change Letterhead' : 'Upload Letterhead')}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">Upload an A4 size image (JPEG/PNG) to be used as the background for PDF prescriptions.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Patient</th>
                <th className="p-4 font-semibold text-gray-600">Diagnosis</th>
                <th className="p-4 font-semibold text-gray-600">Medicines</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">Loading prescriptions...</td></tr>
              ) : prescriptionsSnapshot?.docs.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">No prescriptions found.</td></tr>
              ) : (
                prescriptionsSnapshot?.docs.map((doc) => {
                  const prescription = { id: doc.id, ...doc.data() } as any;
                  return (
                    <tr key={prescription.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-gray-600">
                        {prescription.date ? new Date(prescription.date.toDate()).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 font-medium text-gray-900">{prescription.patientName}</td>
                      <td className="p-4 text-gray-600">{prescription.diagnosis || 'N/A'}</td>
                      <td className="p-4 text-gray-600">
                        {prescription.medicines?.length || 0} prescribed
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => shareViaWhatsApp(prescription)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Share via WhatsApp"
                          >
                            <WhatsAppIcon className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => generatePDF(prescription)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(prescription.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Prescription Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
              <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
                <div className="bg-white px-6 pt-5 pb-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">Advanced Prescription</h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 bg-gray-100 rounded-full p-2">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                  <div className="space-y-8">
                    {/* Patient Selection */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">1. Patient Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                          <select 
                            required
                            value={formData.patientId}
                            onChange={handlePatientSelect}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select a patient...</option>
                            {patientsSnapshot?.docs.map(doc => (
                              <option key={doc.id} value={doc.id}>{doc.data().name} ({doc.data().phone})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                          <input 
                            type="text" 
                            value={formData.phone}
                            readOnly
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 bg-gray-50 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clinical Details */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">2. Clinical Details</h4>
                        <button 
                          type="button"
                          onClick={handleAiDiagnosis}
                          disabled={aiLoading || !formData.chiefComplaint}
                          className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100 disabled:opacity-50 font-medium"
                        >
                          <Sparkles className="w-4 h-4 mr-1" /> AI Diagnose
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
                          <textarea 
                            rows={2}
                            value={formData.chiefComplaint}
                            onChange={(e) => setFormData({...formData, chiefComplaint: e.target.value})}
                            placeholder="e.g., Pain in lower right molar since 2 days"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                          <input 
                            type="text" 
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Investigations (Notes/Links)</label>
                          <input 
                            type="text" 
                            value={formData.investigations}
                            onChange={(e) => setFormData({...formData, investigations: e.target.value})}
                            placeholder="e.g., IOPA 46 advised"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Treatment Done */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">3. Treatment Done</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tooth Number</label>
                          <input 
                            type="text" 
                            value={formData.treatmentTooth}
                            onChange={(e) => setFormData({...formData, treatmentTooth: e.target.value})}
                            placeholder="e.g., 46"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Name</label>
                          <input 
                            type="text" 
                            value={formData.treatmentName}
                            onChange={(e) => setFormData({...formData, treatmentName: e.target.value})}
                            placeholder="e.g., Root Canal Treatment"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Medicines */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">4. Rx (Medicines)</h4>
                        <button 
                          type="button"
                          onClick={handleAiMedicines}
                          disabled={aiLoading || !formData.diagnosis}
                          className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1.5 rounded-md hover:bg-purple-100 disabled:opacity-50 font-medium"
                        >
                          <Sparkles className="w-4 h-4 mr-1" /> AI Suggest Meds
                        </button>
                      </div>
                      <div className="space-y-3">
                        {medicines.map((medicine, index) => (
                          <div key={index} className="flex flex-col md:flex-row gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex-1 w-full">
                              <input 
                                type="text" 
                                placeholder="Medicine Name" 
                                value={medicine.name}
                                onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="w-full md:w-32">
                              <input 
                                type="text" 
                                placeholder="Dosage (e.g. 1-0-1)" 
                                value={medicine.dosage}
                                onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="w-full md:w-24">
                              <input 
                                type="text" 
                                placeholder="Days" 
                                value={medicine.duration}
                                onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="w-full md:w-48">
                              <input 
                                type="text" 
                                placeholder="Instructions (After meal)" 
                                value={medicine.instructions}
                                onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeMedicineRow(index)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded-md mt-1 md:mt-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={addMedicineRow}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Medicine
                        </button>
                      </div>
                    </div>

                    {/* Advice Section */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">5. Advice & Follow-up</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Diet Advice</label>
                          <input 
                            type="text" 
                            value={formData.dietAdvice}
                            onChange={(e) => setFormData({...formData, dietAdvice: e.target.value})}
                            placeholder="e.g., Soft diet, avoid hot/cold"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Oral Hygiene</label>
                          <input 
                            type="text" 
                            value={formData.hygieneAdvice}
                            onChange={(e) => setFormData({...formData, hygieneAdvice: e.target.value})}
                            placeholder="e.g., Warm saline rinses"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up</label>
                          <input 
                            type="text" 
                            value={formData.followUp}
                            onChange={(e) => setFormData({...formData, followUp: e.target.value})}
                            placeholder="e.g., After 5 days"
                            className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white px-6 py-4 border-t flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                  >
                    Save Prescription
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
