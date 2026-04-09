import React, { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Trash2, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';

// SVG Icon for WhatsApp
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function Invoices() {
  const { user } = useAuth();
  const [invoicesSnapshot, loading] = useCollection(
    user ? query(collection(db, 'invoices'), where('doctorId', '==', user.uid), orderBy('createdAt', 'desc')) : null
  );
  const [patientsSnapshot] = useCollection(
    user ? query(collection(db, 'patients'), where('doctorId', '==', user.uid)) : null
  );
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '', patientName: '', phone: '', discount: 0, paid: 0, status: 'Unpaid'
  });
  const [treatments, setTreatments] = useState([{ name: '', toothNumber: '', cost: 0 }]);

  const handleOpenModal = () => {
    setFormData({ patientId: '', patientName: '', phone: '', discount: 0, paid: 0, status: 'Unpaid' });
    setTreatments([{ name: '', toothNumber: '', cost: 0 }]);
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

  const handleTreatmentChange = (index: number, field: string, value: string | number) => {
    const newTreatments = [...treatments];
    newTreatments[index] = { ...newTreatments[index], [field]: value };
    setTreatments(newTreatments);
  };

  const addTreatmentRow = () => {
    setTreatments([...treatments, { name: '', toothNumber: '', cost: 0 }]);
  };

  const removeTreatmentRow = (index: number) => {
    const newTreatments = [...treatments];
    newTreatments.splice(index, 1);
    setTreatments(newTreatments);
  };

  const calculateSubtotal = () => {
    return treatments.reduce((sum, t) => sum + (Number(t.cost) || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - Number(formData.discount);
  };

  const calculatePending = () => {
    return calculateTotal() - Number(formData.paid);
  };

  const generatePDF = (invoice: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue-600
    doc.text('Oracle Dental Clinic', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('KTS Complex, Jaat Chowk, Chipiyana Buzurg', 105, 28, { align: 'center' });
    doc.text('Greater Noida, 201009', 105, 34, { align: 'center' });
    
    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Invoice Info
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('INVOICE', 105, 50, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 20, 60);
    const dateStr = invoice.date ? new Date(invoice.date.toDate()).toLocaleDateString() : new Date().toLocaleDateString();
    doc.text(`Date: ${dateStr}`, 140, 60);
    
    doc.text(`Patient Name: ${invoice.patientName}`, 20, 70);
    if (invoice.phone) {
      doc.text(`Phone: ${invoice.phone}`, 140, 70);
    }

    // Treatments Table
    const tableColumn = ["Treatment Details", "Tooth No.", "Cost (INR)"];
    const tableRows = invoice.treatments.map((t: any) => [
      t.name, t.toothNumber || '-', `Rs. ${t.cost}`
    ]);

    (doc as any).autoTable({
      startY: 80,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 2: { halign: 'right' } }
    });

    // Financials
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Subtotal: Rs. ${invoice.subtotal}`, 140, finalY + 10);
    doc.text(`Discount: Rs. ${invoice.discount}`, 140, finalY + 16);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount: Rs. ${invoice.totalAmount}`, 140, finalY + 24);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Amount Paid: Rs. ${invoice.paid}`, 140, finalY + 30);
    doc.text(`Pending Balance: Rs. ${invoice.pending}`, 140, finalY + 36);

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text('Authorized Signatory', 150, finalY + 60);
    doc.line(140, finalY + 55, 190, finalY + 55);

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      alert("Please select a patient");
      return;
    }
    
    const filteredTreatments = treatments.filter(t => t.name.trim() !== '' && t.cost > 0);
    if (filteredTreatments.length === 0) {
      alert("Please add at least one valid treatment with cost");
      return;
    }

    const subtotal = calculateSubtotal();
    const totalAmount = calculateTotal();
    const pending = calculatePending();
    
    let status = 'Unpaid';
    if (pending <= 0) status = 'Paid';
    else if (formData.paid > 0) status = 'Partial';
    
    // Generate Invoice Number (ODC-001 format)
    const count = invoicesSnapshot?.docs.length || 0;
    const invoiceNumber = `ODC-${String(count + 1).padStart(3, '0')}`;

    const invoiceData = {
      ...formData,
      status,
      invoiceNumber,
      treatments: filteredTreatments,
      subtotal,
      totalAmount,
      pending,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      doctorId: user?.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      setIsModalOpen(false);
      
      if (window.confirm("Invoice saved! Do you want to download the PDF now?")) {
        generatePDF({ ...invoiceData, date: { toDate: () => new Date() } });
      }
    } catch (error: any) {
      console.error("Error saving invoice:", error);
      alert(`Failed to save invoice: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        await deleteDoc(doc(db, 'invoices', id));
      } catch (error) {
        console.error("Error deleting invoice:", error);
      }
    }
  };

  const handleWhatsApp = (invoice: any) => {
    if (!invoice.phone) {
      alert('No phone number available for this patient.');
      return;
    }
    const message = `Hello ${invoice.patientName}, your invoice (${invoice.invoiceNumber}) from Oracle Dental Clinic is ready. Total: Rs.${invoice.totalAmount}, Paid: Rs.${invoice.paid}, Pending: Rs.${invoice.pending}.`;
    const url = `https://wa.me/91${invoice.phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
        <button
          onClick={handleOpenModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Financials</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center">Loading...</td></tr>
              ) : invoicesSnapshot?.docs.map((doc) => {
                const invoice = doc.data();
                const dateStr = invoice.date ? new Date(invoice.date.toDate()).toLocaleDateString() : '';
                return (
                  <tr key={doc.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dateStr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{invoice.patientName}</div>
                      <div className="text-xs text-gray-500">{invoice.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-gray-900">Total: ₹{invoice.totalAmount}</div>
                      <div className="text-green-600">Paid: ₹{invoice.paid}</div>
                      <div className="text-red-600">Pending: ₹{invoice.pending}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 
                        invoice.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleWhatsApp(invoice)} className="text-green-600 hover:text-green-900 mr-4" title="Send via WhatsApp">
                        <WhatsAppIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => generatePDF(invoice)} className="text-blue-600 hover:text-blue-900 mr-4" title="Download PDF">
                        <Download className="w-4 h-4" />
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
            <div className="relative z-10 inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Create Invoice</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Patient</label>
                      <select required value={formData.patientId} onChange={handlePatientSelect} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        <option value="" disabled>Select a patient</option>
                        {patientsSnapshot?.docs.map(p => (
                          <option key={p.id} value={p.id}>{p.data().name} ({p.data().phone})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input type="text" readOnly value={formData.phone} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 sm:text-sm" />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Treatments</h4>
                      <button type="button" onClick={addTreatmentRow} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                        <Plus className="w-4 h-4 mr-1" /> Add Row
                      </button>
                    </div>
                    {treatments.map((treatment, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-start">
                        <input type="text" placeholder="Treatment Details" value={treatment.name} onChange={e => handleTreatmentChange(index, 'name', e.target.value)} className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        <input type="text" placeholder="Tooth No." value={treatment.toothNumber} onChange={e => handleTreatmentChange(index, 'toothNumber', e.target.value)} className="w-24 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        <div className="relative w-32">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                          </div>
                          <input type="number" placeholder="0" value={treatment.cost} onChange={e => handleTreatmentChange(index, 'cost', Number(e.target.value))} className="pl-7 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        {treatments.length > 1 && (
                          <button type="button" onClick={() => removeTreatmentRow(index)} className="p-2 text-red-600 hover:text-red-800">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4 mt-6">
                    <div className="grid grid-cols-2 gap-4 max-w-md ml-auto">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{calculateSubtotal()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Discount:</span>
                        <div className="relative w-24">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                          </div>
                          <input type="number" min="0" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} className="pl-6 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center col-span-2 border-t pt-2">
                        <span className="text-base font-bold text-gray-900">Total Amount:</span>
                        <span className="text-base font-bold text-gray-900">₹{calculateTotal()}</span>
                      </div>
                      <div className="flex justify-between items-center col-span-2">
                        <span className="text-sm text-gray-600">Amount Paid:</span>
                        <div className="relative w-32">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₹</span>
                          </div>
                          <input type="number" min="0" value={formData.paid} onChange={e => setFormData({...formData, paid: Number(e.target.value)})} className="pl-6 block w-full border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center col-span-2 border-t pt-2">
                        <span className="text-sm font-medium text-red-600">Pending Balance:</span>
                        <span className="text-sm font-medium text-red-600">₹{calculatePending()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                      Save Invoice
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
