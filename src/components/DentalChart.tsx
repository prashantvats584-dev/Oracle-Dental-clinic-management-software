import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Save, Sparkles, FileText } from 'lucide-react';
import { adultTeeth, childTeeth } from '../lib/toothData';
import { suggestDiagnosis } from '../lib/ai';
import { useNavigate } from 'react-router-dom';

interface DentalChartProps {
  patientId: string;
  patientName: string;
  initialDentitionType?: 'Adult' | 'Child' | 'Mixed';
  onClose: () => void;
}

type DentitionType = 'Adult' | 'Child' | 'Mixed';

interface ToothRecord {
  fdi: number;
  uni: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  status: 'Planned' | 'In-progress' | 'Completed' | '';
}

export default function DentalChart({ patientId, patientName, initialDentitionType, onClose }: DentalChartProps) {
  const [dentitionType, setDentitionType] = useState<DentitionType>(initialDentitionType || 'Adult');
  const [records, setRecords] = useState<Record<number, ToothRecord>>({});
  const [selectedTooth, setSelectedTooth] = useState<{fdi: number, uni: string, name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();

  // Form state for selected tooth
  const [formData, setFormData] = useState<ToothRecord>({
    fdi: 0, uni: '', diagnosis: '', treatment: '', notes: '', status: ''
  });

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const docRef = doc(db, 'dentalCharts', patientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRecords(docSnap.data().records || {});
          setDentitionType(docSnap.data().dentitionType || initialDentitionType || 'Adult');
        } else if (initialDentitionType) {
          setDentitionType(initialDentitionType);
        }
      } catch (error) {
        console.error("Error fetching dental chart:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChart();
  }, [patientId, initialDentitionType]);

  const handleToothClick = (tooth: {fdi: number, uni: string, name: string}) => {
    setSelectedTooth(tooth);
    const existing = records[tooth.fdi];
    setFormData(existing || {
      fdi: tooth.fdi, uni: tooth.uni, diagnosis: '', treatment: '', notes: '', status: ''
    });
  };

  const handleSaveTooth = () => {
    if (selectedTooth) {
      setRecords(prev => ({ ...prev, [selectedTooth.fdi]: formData }));
      setSelectedTooth(null);
    }
  };

  const saveChart = async () => {
    try {
      await setDoc(doc(db, 'dentalCharts', patientId), { 
        records, 
        dentitionType,
        updatedAt: serverTimestamp() 
      });
      alert("Dental chart saved successfully!");
      onClose();
    } catch (error) {
      console.error("Error saving chart:", error);
      alert("Failed to save dental chart.");
    }
  };

  const handleAiSuggest = async () => {
    if (!selectedTooth) return;
    setAiLoading(true);
    const suggestion = await suggestDiagnosis(`FDI ${selectedTooth.fdi} (${selectedTooth.name})`, chiefComplaint);
    if (suggestion) {
      setFormData(prev => ({
        ...prev,
        diagnosis: suggestion.diagnosis || prev.diagnosis,
        treatment: suggestion.suggestedTreatment || prev.treatment
      }));
    } else {
      alert("AI suggestion failed. Please try again.");
    }
    setAiLoading(false);
  };

  const renderTooth = (tooth: {fdi: number, uni: string, name: string}) => {
    const record = records[tooth.fdi];
    const isSelected = selectedTooth?.fdi === tooth.fdi;
    
    let fillColor = '#e5e7eb'; // default gray-200
    if (record?.status === 'Completed') fillColor = '#22c55e'; // green-500
    else if (record?.status === 'In-progress') fillColor = '#eab308'; // yellow-500
    else if (record?.status === 'Planned') fillColor = '#ef4444'; // red-500
    else if (record?.diagnosis) fillColor = '#fca5a5'; // red-300 for diagnosis without status

    return (
      <div 
        key={tooth.fdi}
        onClick={() => handleToothClick(tooth)}
        className={`flex flex-col items-center cursor-pointer p-1 rounded-lg transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-100'}`}
        title={`${tooth.name} (FDI: ${tooth.fdi}, Uni: ${tooth.uni})`}
      >
        <svg width="28" height="36" viewBox="0 0 24 32" className="drop-shadow-sm">
          {/* Improved Tooth Shape */}
          <path 
            d="M4,10 C4,2 20,2 20,10 C20,18 17,22 16,28 C15.5,30 8.5,30 8,28 C7,22 4,18 4,10 Z" 
            fill={fillColor} 
            stroke={isSelected ? '#2563eb' : '#6b7280'} 
            strokeWidth="2"
          />
          {/* Root line for more detail */}
          <path 
            d="M12,18 L12,26" 
            stroke={isSelected ? '#2563eb' : '#9ca3af'} 
            strokeWidth="1" 
            strokeDasharray="2,2"
            opacity="0.5"
          />
        </svg>
        <span className="text-[10px] font-bold mt-1 text-gray-700">{tooth.fdi}</span>
        <span className="text-[8px] text-gray-400 leading-none">{tooth.uni}</span>
      </div>
    );
  };

  const renderArch = (right: any[], left: any[], title: string) => (
    <div className="mb-6">
      <h4 className="text-sm font-medium text-gray-500 mb-2 text-center uppercase tracking-wider">{title}</h4>
      <div className="flex justify-center gap-2">
        <div className="flex gap-1 border-r-2 border-gray-300 pr-2">
          {right.map(renderTooth)}
        </div>
        <div className="flex gap-1 pl-2">
          {left.map(renderTooth)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Dental Chart</h3>
                <p className="text-sm text-gray-500">Patient: {patientName}</p>
              </div>
              <div className="flex items-center gap-4">
                <select 
                  value={dentitionType} 
                  onChange={(e) => setDentitionType(e.target.value as DentitionType)}
                  className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Adult">Adult Dentition</option>
                  <option value="Child">Child Dentition</option>
                  <option value="Mixed">Mixed Dentition</option>
                </select>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-500 bg-gray-100 rounded-full p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 text-gray-500">Loading chart data...</div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Chart Area */}
                <div className="flex-1 bg-gray-50 p-6 rounded-xl border border-gray-200 overflow-x-auto">
                  {(dentitionType === 'Adult' || dentitionType === 'Mixed') && (
                    <>
                      {renderArch(adultTeeth.upperRight, adultTeeth.upperLeft, 'Upper Permanent')}
                      {renderArch(adultTeeth.lowerRight, adultTeeth.lowerLeft, 'Lower Permanent')}
                    </>
                  )}
                  
                  {(dentitionType === 'Child' || dentitionType === 'Mixed') && (
                    <div className={dentitionType === 'Mixed' ? 'mt-8 pt-8 border-t border-gray-300' : ''}>
                      {renderArch(childTeeth.upperRight, childTeeth.upperLeft, 'Upper Primary')}
                      {renderArch(childTeeth.lowerRight, childTeeth.lowerLeft, 'Lower Primary')}
                    </div>
                  )}
                  
                  <div className="mt-6 flex justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#ef4444] rounded-sm"></div> Planned</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#eab308] rounded-sm"></div> In-progress</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#22c55e] rounded-sm"></div> Completed</div>
                  </div>
                </div>

                {/* Action Panel */}
                <div className="w-full lg:w-80 flex flex-col">
                  {selectedTooth ? (
                    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Tooth {selectedTooth.fdi}</h4>
                          <p className="text-xs text-gray-500">{selectedTooth.name} (Uni: {selectedTooth.uni})</p>
                        </div>
                        <button onClick={() => setSelectedTooth(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Chief Complaint (for AI)</label>
                          <input 
                            type="text" 
                            value={chiefComplaint}
                            onChange={(e) => setChiefComplaint(e.target.value)}
                            placeholder="e.g., Pain, sensitivity..."
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <button 
                          onClick={handleAiSuggest}
                          disabled={aiLoading || !chiefComplaint}
                          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4" />
                          {aiLoading ? 'Analyzing...' : 'AI Suggest Diagnosis'}
                        </button>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Diagnosis</label>
                          <input 
                            type="text" 
                            list="diagnoses"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                          <datalist id="diagnoses">
                            <option value="Dental Caries" />
                            <option value="Pulpitis" />
                            <option value="Fracture" />
                            <option value="Missing" />
                            <option value="Impacted" />
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Treatment</label>
                          <input 
                            type="text" 
                            value={formData.treatment}
                            onChange={(e) => setFormData({...formData, treatment: e.target.value})}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                          <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">None</option>
                            <option value="Planned">Planned</option>
                            <option value="In-progress">In-progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            rows={2}
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className="w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <button 
                          onClick={handleSaveTooth} 
                          className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Update Tooth
                        </button>

                        <button 
                          onClick={() => {
                            onClose();
                            navigate('/prescriptions', { 
                              state: { 
                                patientId, 
                                patientName, 
                                tooth: selectedTooth.fdi,
                                diagnosis: formData.diagnosis,
                                treatment: formData.treatment
                              } 
                            });
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-sm font-medium hover:bg-indigo-100"
                        >
                          <FileText className="w-4 h-4" />
                          Create Prescription
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50">
                      <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <p className="text-sm">Select a tooth from the chart to add diagnosis and treatment.</p>
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button onClick={saveChart} className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 shadow-sm">
                      <Save className="w-5 h-5 mr-2" /> Save Full Chart
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
