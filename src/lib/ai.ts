import { GoogleGenAI } from '@google/genai';

// Initialize the Gemini API client
// Note: process.env.GEMINI_API_KEY is automatically provided in the environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function suggestDiagnosis(toothNumber: string, chiefComplaint: string) {
  try {
    const prompt = `You are an expert dentist. Based on the following information, suggest a possible diagnosis and a suggested treatment.
    
Tooth Number: ${toothNumber}
Chief Complaint: ${chiefComplaint}

Provide the output in JSON format with the following keys:
- diagnosis: A short string for the diagnosis.
- suggestedTreatment: A short string for the suggested treatment.

Example:
{
  "diagnosis": "Dental caries",
  "suggestedTreatment": "RCT or filling"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return null;
  } catch (error) {
    console.error("Error suggesting diagnosis:", error);
    return null;
  }
}

export async function suggestMedicines(diagnosis: string, patientCondition: string) {
  try {
    const prompt = `You are an expert dentist. Based on the following diagnosis and patient condition, suggest a list of medicines, dosage, and duration.
    
Diagnosis: ${diagnosis}
Patient Condition/History: ${patientCondition || 'None'}

Provide the output in JSON format as an array of objects, where each object has:
- name: Name of the medicine
- dosage: Dosage instructions (e.g., "1 tablet twice a day")
- duration: Duration (e.g., "5 days")

Example:
[
  {
    "name": "Amoxicillin 500mg",
    "dosage": "1 tablet 3 times a day",
    "duration": "5 days"
  },
  {
    "name": "Ibuprofen 400mg",
    "dosage": "1 tablet as needed for pain",
    "duration": "3 days"
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Error suggesting medicines:", error);
    return [];
  }
}
