import { Patient } from '../types';

/**
 * Get patient ID from patient object (handles both id and patientId)
 */
export const getPatientId = (patient: Patient): string => {
  return patient.patientId?.toString() || patient.id?.toString() || '';
};

/**
 * Find patient by ID (handles both id and patientId)
 */
export const findPatientById = (patients: Patient[], id: string | number): Patient | undefined => {
  const idStr = id.toString();
  return patients.find(p => 
    p.patientId?.toString() === idStr || 
    p.id?.toString() === idStr
  );
};

