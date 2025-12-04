// Data Models based on user JSON specs

export interface User {
  id?: number; // Backend uses integer id
  userId?: string; // Frontend compatibility
  doctorId?: string | number; // Frontend compatibility
  name: string;
  email: string;
  mobile_number: string;
  address: string;
  role?: 'doctor' | 'patient';
  specialization?: string;
  avatar?: string; // Added to users table
  cover_image?: string;
  gender?: 'Male' | 'Female' | 'Other';
  lastVisitDate?: string;
  lastReminderDate?: string;
  lastAppointmentDate?: string;
  appointmentDate?: string;
}

export interface AppointmentRequest {
  id: string;
  patientName: string;
  dateTime: string;
  type: 'Consulting' | 'Video' | 'Emergency';
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed';
  doctorId: string;
}

export interface RecentPatient {
  id: string;
  name: string;
  address: string;
  doctorId: string;
  mobileNumber: string;
  avatar?: string;
}

export interface DashboardAnalytics {
  totalAppointment: string;
  totalPatient: string;
  clinicConsulting: string;
  videoConsulting: string;
  todayConsulting: string;
}

export interface DashboardData {
  analytics: DashboardAnalytics;
  appointmentRequest: AppointmentRequest[];
  recentPatient: RecentPatient[];
  patientGrowth?: Array<{ name: string; patients: number }>;
  genderGrowth?: Array<{ name: string; male: number; female: number }>;
}

export interface Message {
  patientId: string;
  doctorId: string;
  messageId: string;
  text: string;
  imageIds: string[];
  isSeen: boolean; 
  isSent: boolean;
  sender: 'doctor' | 'patient';
  timestamp: string;
}

export interface Visit {
  visitId: string;
  date: string;
  diagnosis?: string; // Now nullable
  prescription?: string; // Now nullable
  notes?: string;
}

export interface Patient {
  id?: number; // Backend uses integer id
  patientId?: string | number; // Frontend compatibility (mapped from id)
  name: string;
  mobileNumber: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  age?: number;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  lastVisitDate?: string;
  lastVisitDateTime?: string;
  lastReminderDate?: string;
  lastAppointmentDate?: string;
  appointmentDate?: string;
  visits?: Visit[];
  doctorId?: string[]; // Changed to array of strings
}

export interface Appointment {
  appointmentId: string;
  id?: string | number; // Backend uses id
  patientId?: string;
  patientName: string;
  email?: string;
  date: string; // Primary field from visits table (DATEONLY)
  dateTime?: string; // Backward compatibility
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  appointment_type?: 'Consulting' | 'Video'; // Primary field from visits table
  appointmentType?: 'Consulting' | 'Video'; // Backward compatibility
  type?: 'Consulting' | 'Video'; // Backward compatibility
  notes?: string;
  diagnosis?: string;
  prescription?: string;
  doctorId?: string;
}

export interface AvailabilitySlot {
  day: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

// Socket Events
export enum SocketEvent {
  CONNECT = 'connect',
  DASHBOARD = 'DASHBOARD',
  USER = 'USER',
  MESSAGE_LIST = 'MESSAGE_LIST',
  CREATE_MESSAGE = 'CREATE_MESSAGE',
  PATIENT_LIST = 'PATIENT_LIST',
  CREATE_PATIENT = 'CREATE_PATIENT',
  UPDATE_PATIENT = 'UPDATE_PATIENT',
  APPOINTMENT_LIST = 'APPOINTMENT_LIST',
  CREATE_APPOINTMENT = 'CREATE_APPOINTMENT',
  UPDATE_APPOINTMENT = 'UPDATE_APPOINTMENT',
  
  // Client emits
  GET_DASHBOARD = 'GET_DASHBOARD',
  GET_USER = 'GET_USER',
  GET_MESSAGES = 'GET_MESSAGES',
  SEND_MESSAGE = 'SEND_MESSAGE',
  GET_PATIENTS = 'GET_PATIENTS',
  ADD_PATIENT = 'ADD_PATIENT',
  EDIT_PATIENT = 'EDIT_PATIENT',
  GET_APPOINTMENTS = 'GET_APPOINTMENTS',
  ADD_APPOINTMENT = 'ADD_APPOINTMENT',
  EDIT_APPOINTMENT = 'EDIT_APPOINTMENT',
}