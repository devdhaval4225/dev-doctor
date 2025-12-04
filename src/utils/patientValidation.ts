/**
 * Patient Validation Utilities
 */

export interface ValidationError {
  field: string;
  message: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_GENDERS = ['Male', 'Female', 'Other'] as const;
const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validate gender
 */
export const isValidGender = (gender: string): boolean => {
  return VALID_GENDERS.includes(gender as typeof VALID_GENDERS[number]);
};

/**
 * Validate blood group
 */
export const isValidBloodGroup = (bloodGroup: string): boolean => {
  return VALID_BLOOD_GROUPS.includes(bloodGroup as typeof VALID_BLOOD_GROUPS[number]);
};

/**
 * Validate age (0-150)
 */
export const isValidAge = (age: number | undefined): boolean => {
  if (age === undefined) return true; // Optional field
  return Number.isInteger(age) && age >= 0 && age <= 150;
};

/**
 * Validate patient data and return errors
 */
export const validatePatientData = (patient: {
  name?: string;
  email?: string;
  mobileNumber?: string;
  gender?: string;
  bloodGroup?: string;
  age?: number;
  city?: string;
  state?: string;
}): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!patient.name?.trim()) {
    errors.push({ field: 'name', message: 'Name is required' });
  }
  
  if (!patient.email?.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(patient.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  if (!patient.mobileNumber?.trim()) {
    errors.push({ field: 'mobileNumber', message: 'Mobile number is required' });
  }
  
  if (patient.gender && !isValidGender(patient.gender)) {
    errors.push({ field: 'gender', message: 'Gender must be Male, Female, or Other' });
  }
  
  if (patient.bloodGroup && !isValidBloodGroup(patient.bloodGroup)) {
    errors.push({ field: 'bloodGroup', message: 'Invalid blood group' });
  }
  
  if (patient.age !== undefined && !isValidAge(patient.age)) {
    errors.push({ field: 'age', message: 'Age must be between 0 and 150' });
  }
  
  if (!patient.city?.trim()) {
    errors.push({ field: 'city', message: 'City is required' });
  }
  
  if (!patient.state?.trim()) {
    errors.push({ field: 'state', message: 'State is required' });
  }
  
  return errors;
};

/**
 * Validate CSV row data
 */
export const validateCSVRow = (
  row: Record<string, string>,
  fieldMapping: Record<string, string>,
  rowIndex: number
): string[] => {
  const errors: string[] = [];
  
  // Find mapped fields
  const nameHeader = Object.keys(fieldMapping).find(h => fieldMapping[h] === 'name');
  const emailHeader = Object.keys(fieldMapping).find(h => fieldMapping[h] === 'email');
  const mobileHeader = Object.keys(fieldMapping).find(h => fieldMapping[h] === 'mobileNumber');
  const cityHeader = Object.keys(fieldMapping).find(h => fieldMapping[h] === 'city');
  const stateHeader = Object.keys(fieldMapping).find(h => fieldMapping[h] === 'state');
  
  const nameValue = nameHeader ? (row[nameHeader] || '').trim() : '';
  const emailValue = emailHeader ? (row[emailHeader] || '').trim() : '';
  const mobileValue = mobileHeader ? (row[mobileHeader] || '').trim() : '';
  const cityValue = cityHeader ? (row[cityHeader] || '').trim() : '';
  const stateValue = stateHeader ? (row[stateHeader] || '').trim() : '';
  
  if (!nameValue) errors.push('Name is required');
  if (!emailValue) {
    errors.push('Email is required');
  } else if (!isValidEmail(emailValue)) {
    errors.push('Invalid email format');
  }
  if (!mobileValue) errors.push('Mobile number is required');
  if (!cityValue) errors.push('City is required');
  if (!stateValue) errors.push('State is required');
  
  return errors;
};

