/**
 * Constants for Patients Page
 */

// Pagination Options
export const PAGINATION_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_ITEMS_PER_PAGE = 10;
export const DEFAULT_CURRENT_PAGE = 1;

// Sort Options
export const SORT_FIELDS = {
  NAME: 'name',
  EMAIL: 'email',
  LAST_VISIT_DATE: 'lastVisitDate',
  PATIENT_ID: 'patientId',
} as const;

export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const DEFAULT_SORT_FIELD: keyof import('../types').Patient = 'lastVisitDate';
export const DEFAULT_SORT_ORDER = SORT_ORDERS.DESC;

// Gender Options
export const GENDER_OPTIONS = [
  { value: 'Male', icon: '👨', color: 'blue' },
  { value: 'Female', icon: '👩', color: 'pink' },
  { value: 'Other', icon: '👤', color: 'purple' },
] as const;

// Blood Group Options
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

// CSV Import Settings
export const CSV_PREVIEW_ROWS = 10;
export const CSV_MAX_ERROR_DISPLAY = 50;

// Table Columns
export const TABLE_COLUMNS = {
  PATIENT_ID: 'Patient ID',
  NAME: 'Name',
  CONTACT_INFO: 'Contact Info',
  GENDER: 'Gender',
  AGE: 'Age',
  BLOOD_GROUP: 'Blood Group',
  LAST_VISIT: 'Last Visit',
  ACTIONS: 'Actions',
} as const;

