export interface PatientVitals {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
  spO2: number;
  respiratoryRate: number;
  height: string;
  weight: string;
  bmi: number;
}

export interface PatientMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  status: 'active' | 'discontinued';
}

export interface PatientAllergy {
  substance: string;
  reaction: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface PatientLabResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'abnormal' | 'critical';
  date: string;
}

export interface CareTeamMember {
  name: string;
  role: string;
  contact?: string;
}

export interface Patient {
  diagnosis: any;
  clinical_notes: any;
  routine_notes?: any;
  id: string;
  name: string;
  phn: string;
  clinic_number: string;
  age?: string | number;
  gender?: string;
  bed?: string;
  bht?: string;
  admission_date?: string;
  status: string;
  
  // Comprehensive EHR Domains
  vitals?: PatientVitals;
  medications?: PatientMedication[];
  allergies?: PatientAllergy[];
  recent_labs?: PatientLabResult[];
  care_team?: CareTeamMember[];
}

export interface Admission {
  id: string;
  patient_id: string;
  bht: string;
  bed: string;
  created_at: string;
  discharge_date?: string | null;
}
