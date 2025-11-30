
import { User, DashboardData, Patient, Appointment, Message } from '../types';
import api from '../api/axios';
import { store } from '../redux/store';
import { addNotification } from '../redux/store';
import { USE_MOCK_DATA } from '../App';

// ============================================================================
// CONFIGURATION
// ============================================================================
// USE_MOCK_DATA flag is now imported from App.tsx
// Change the flag in App.tsx to switch between mock data and real API 

// Helper to simulate network delay for mock mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to show error notifications
const handleError = (error: any, defaultMessage: string = 'An error occurred') => {
  const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || defaultMessage;
  store.dispatch(addNotification({
    id: `error-${Date.now()}`,
    title: 'Error',
    message: errorMessage,
    type: 'error',
    timestamp: new Date().toISOString()
  }));
  throw error;
};

// Helper to show success notifications
const showSuccess = (message: string) => {
  store.dispatch(addNotification({
    id: `success-${Date.now()}`,
    title: 'Success',
    message,
    type: 'success',
    timestamp: new Date().toISOString()
  }));
};

// ============================================================================
// MOCK DATA STORE (Dummy Data)
// ============================================================================

const MOCK_USER: User = {
  userId: "DOC-001",
  name: "Dr. Alex Sterling",
  email: "alex@medinexus.com",
  mobileNumber: "+1 (555) 012-3456",
  address: "123 Medical Plaza, New York, NY 10001",
  specialization: "Cardiology",
  avatar: "https://picsum.photos/id/1012/200/200",
  coverImage: "https://picsum.photos/id/1015/1000/300"
};

const MOCK_DASHBOARD: DashboardData = {
  analytics: {
    totalAppointment: "1,240",
    totalPatient: "856",
    clinicConsulting: "450",
    videoConsulting: "230",
  },
  appointmentRequest: [
    { id: "APT-1", patientName: "Sarah Jenkins", dateTime: "2023-10-24T10:00:00", type: "Consulting", status: "Pending", doctorId: "DOC-001" },
    { id: "APT-2", patientName: "Mike Ross", dateTime: "2023-10-24T11:30:00", type: "Video", status: "Confirmed", doctorId: "DOC-001" },
    { id: "APT-3", patientName: "Jessica Pearson", dateTime: "2023-10-25T09:00:00", type: "Consulting", status: "Confirmed", doctorId: "DOC-001" },
  ],
  recentPatient: [
    { id: "P-1", name: "Louis Litt", address: "New York", doctorId: "DOC-001", mobileNumber: "555-1111", avatar: "https://picsum.photos/id/1011/100/100" },
  ]
};

const MOCK_PATIENTS: Patient[] = [
    { 
        patientId: "P-1", 
        name: "Louis Litt", 
        mobileNumber: "555-1111", 
        email: "louis@firm.com", 
        gender: "Male", 
        dateOfBirth: "1975-06-12",
        address: "NYC", 
        lastVisitDate: "2023-10-01", 
        lastReminderDate: "2023-10-15", 
        lastAppointmentDate: "2023-10-01", 
        appointmentDate: "2023-11-01",
        visits: [
            { visitId: 'V1', date: '2023-10-01', diagnosis: 'Hypertension', prescription: 'Lisinopril 10mg', notes: 'Blood pressure slightly elevated.' },
            { visitId: 'V2', date: '2023-09-15', diagnosis: 'Routine Checkup', prescription: '-', notes: 'All vitals normal.' }
        ]
    },
     { 
        patientId: "P-2", 
        name: "Harvey Specter", 
        mobileNumber: "555-2222", 
        email: "harvey@firm.com", 
        gender: "Male", 
        dateOfBirth: "1972-02-04",
        address: "Manhattan", 
        lastVisitDate: "2023-09-20", 
        lastReminderDate: "2023-10-20", 
        lastAppointmentDate: "2023-09-20", 
        appointmentDate: "2023-12-01",
        visits: []
    }
];

const MOCK_APPOINTMENTS: Appointment[] = [
  { appointmentId: "APT-101", patientId: "P-1", patientName: "Louis Litt", email: "louis@firm.com", dateTime: "2023-10-26T09:00:00", status: "Confirmed", type: "Consulting" },
  { appointmentId: "APT-102", patientId: "P-2", patientName: "Harvey Specter", email: "harvey@firm.com", dateTime: "2023-10-26T10:30:00", status: "Pending", type: "Video" },
  { appointmentId: "APT-103", patientId: "P-3", patientName: "Donna Paulsen", email: "donna@firm.com", dateTime: "2023-10-27T14:00:00", status: "Completed", type: "Consulting" },
];

const MOCK_MESSAGES: Message[] = [
    { patientId: "P-1", doctorId: "DOC-001", messageId: "M-1", text: "Hello Doctor, I have a question.", imageIds: [], isSeen: true, isSent: true, sender: 'patient', timestamp: "10:00 AM" },
    { patientId: "P-1", doctorId: "DOC-001", messageId: "M-2", text: "Hi Louis, how can I help?", imageIds: [], isSeen: true, isSent: true, sender: 'doctor', timestamp: "10:05 AM" }
];

// ============================================================================
// API SERVICE IMPLEMENTATION
// ============================================================================

export const apiService = {
  auth: {
    login: async (email: string, password?: string): Promise<{ token: string; user: User }> => {
      if (USE_MOCK_DATA) {
        // --- MOCK RESPONSE ---
        console.log("Using Mock Login", email);
        await delay(800);
        return { 
          token: "mock-jwt-token-12345",
          user: { ...MOCK_USER }
        }; 
      } else {
        // --- REAL API CALL ---
        // POST /api/auth/login
        try {
          const response = await api.post('/auth/login', { email, password });
          // The API returns { token, user, message }
          return {
            token: response.data.token,
            user: response.data.user
          };
        } catch (error: any) {
          handleError(error, 'Login failed. Please check your credentials.');
          throw error;
        }
      }
    },
    logout: async (): Promise<boolean> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(200);
        return true;
      } else {
         // --- REAL API CALL ---
         // POST /api/auth/logout
         try {
           await api.post('/auth/logout');
           return true;
         } catch (error: any) {
           // Even if logout fails on server, we should still logout locally
           console.error('Logout error:', error);
           return true;
         }
      }
    }
  },
  
  dashboard: {
    getStats: async (): Promise<DashboardData> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(600);
        return { ...MOCK_DASHBOARD };
      } else {
        // --- REAL API CALL ---
        // GET /api/dashboard/stats
        try {
          const response = await api.get('/dashboard/stats');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load dashboard data.');
          throw error;
        }
      }
    }
  },

  user: {
    getProfile: async (): Promise<User> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(400);
        return { ...MOCK_USER };
      } else {
        // --- REAL API CALL ---
        // GET /api/user/profile
        try {
          const response = await api.get('/user/profile');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load user profile.');
          throw error;
        }
      }
    },
    updateProfile: async (data: Partial<User>): Promise<User> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(800);
        Object.assign(MOCK_USER, data);
        showSuccess('Profile updated successfully');
        return { ...MOCK_USER };
      } else {
        // --- REAL API CALL ---
        // PUT /api/user/profile
        try {
          const response = await api.put('/user/profile', data);
          showSuccess('Profile updated successfully');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to update profile.');
          throw error;
        }
      }
    }
  },

  patients: {
    getAll: async (): Promise<Patient[]> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(500);
        return [...MOCK_PATIENTS];
      } else {
        // --- REAL API CALL ---
        // GET /api/patients
        try {
          const response = await api.get('/patients');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load patients.');
          throw error;
        }
      }
    },
    getById: async (id: string): Promise<Patient> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(300);
        const patient = MOCK_PATIENTS.find(p => p.patientId === id);
        if (!patient) throw new Error("Patient not found");
        return patient;
      } else {
        // --- REAL API CALL ---
        // GET /api/patients/:id
        try {
          const response = await api.get(`/patients/${id}`);
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load patient.');
          throw error;
        }
      }
    },
    create: async (patient: Partial<Patient>): Promise<Patient> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(700);
        const newPatient = { 
            ...patient, 
            patientId: `P-${Date.now()}`,
            visits: [],
            lastVisitDate: new Date().toISOString().split('T')[0],
            dateOfBirth: patient.dateOfBirth || undefined
        } as Patient;
        MOCK_PATIENTS.push(newPatient);
        showSuccess('Patient created successfully');
        return newPatient;
      } else {
        // --- REAL API CALL ---
        // POST /api/patients
        try {
          const response = await api.post('/patients', patient);
          showSuccess('Patient created successfully');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to create patient.');
          throw error;
        }
      }
    },
    update: async (patient: Patient): Promise<Patient> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(600);
        const patientId = patient.patientId || patient.id?.toString() || '';
        const idx = MOCK_PATIENTS.findIndex(p => (p.patientId || p.id?.toString()) === patientId);
        if(idx === -1) throw new Error("Patient not found");
        MOCK_PATIENTS[idx] = { ...MOCK_PATIENTS[idx], ...patient };
        showSuccess('Patient updated successfully');
        return MOCK_PATIENTS[idx];
      } else {
        // --- REAL API CALL ---
        // PUT /api/patients/:id
        try {
          const patientId = patient.patientId || patient.id?.toString() || '';
          const response = await api.put(`/patients/${patientId}`, patient);
          showSuccess('Patient updated successfully');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to update patient.');
          throw error;
        }
      }
    },
    delete: async (id: string | number): Promise<void> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(400);
        const idStr = id.toString();
        const idx = MOCK_PATIENTS.findIndex(p => (p.patientId || p.id?.toString()) === idStr);
        if(idx === -1) throw new Error("Patient not found");
        MOCK_PATIENTS.splice(idx, 1);
        showSuccess('Patient deleted successfully');
      } else {
        // --- REAL API CALL ---
        // DELETE /api/patients/:id
        try {
          await api.delete(`/patients/${id}`);
          showSuccess('Patient deleted successfully');
        } catch (error: any) {
          handleError(error, 'Failed to delete patient.');
          throw error;
        }
      }
    }
  },

  appointments: {
    getAll: async (): Promise<Appointment[]> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(500);
        return [...MOCK_APPOINTMENTS];
      } else {
        // --- REAL API CALL ---
        // GET /api/appointments
        try {
          const response = await api.get('/appointments');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load appointments.');
          throw error;
        }
      }
    },
    getById: async (id: string): Promise<Appointment> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(300);
        const appointment = MOCK_APPOINTMENTS.find(a => a.appointmentId === id);
        if (!appointment) throw new Error("Appointment not found");
        return appointment;
      } else {
        // --- REAL API CALL ---
        // GET /api/appointments/:id
        try {
          const response = await api.get(`/appointments/${id}`);
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load appointment.');
          throw error;
        }
      }
    },
    create: async (apt: Partial<Appointment>): Promise<Appointment> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(700);
        const newApt = { 
            ...apt, 
            appointmentId: `APT-${Date.now()}`,
            status: apt.status || 'Pending'
        } as Appointment;
        MOCK_APPOINTMENTS.push(newApt);
        showSuccess('Appointment created successfully');
        return newApt;
      } else {
        // --- REAL API CALL ---
        // POST /api/appointments
        try {
          const response = await api.post('/appointments', apt);
          showSuccess('Appointment created successfully');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to create appointment.');
          throw error;
        }
      }
    },
    update: async (apt: Appointment): Promise<Appointment> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(600);
        const idx = MOCK_APPOINTMENTS.findIndex(a => a.appointmentId === apt.appointmentId);
        if(idx === -1) throw new Error("Appointment not found");
        MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...apt };
        showSuccess('Appointment updated successfully');
        return MOCK_APPOINTMENTS[idx];
      } else {
        // --- REAL API CALL ---
        // PUT /api/appointments/:id
        try {
          const response = await api.put(`/appointments/${apt.appointmentId}`, apt);
          showSuccess('Appointment updated successfully');
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to update appointment.');
          throw error;
        }
      }
    },
    delete: async (id: string): Promise<void> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(400);
        const idx = MOCK_APPOINTMENTS.findIndex(a => a.appointmentId === id);
        if(idx === -1) throw new Error("Appointment not found");
        MOCK_APPOINTMENTS.splice(idx, 1);
        showSuccess('Appointment deleted successfully');
      } else {
        // --- REAL API CALL ---
        // DELETE /api/appointments/:id
        try {
          await api.delete(`/appointments/${id}`);
          showSuccess('Appointment deleted successfully');
        } catch (error: any) {
          handleError(error, 'Failed to delete appointment.');
          throw error;
        }
      }
    }
  },

  messages: {
    getAll: async (patientId?: string): Promise<Message[]> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(400);
        let messages = [...MOCK_MESSAGES];
        if (patientId) {
          messages = messages.filter(m => m.patientId === patientId);
        }
        return messages;
      } else {
        // --- REAL API CALL ---
        // GET /api/messages?patientId=xxx (optional)
        try {
          const params = patientId ? { patientId } : {};
          const response = await api.get('/messages', { params });
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load messages.');
          throw error;
        }
      }
    },
    getById: async (id: string): Promise<Message> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(300);
        const message = MOCK_MESSAGES.find(m => m.messageId === id);
        if (!message) throw new Error("Message not found");
        return message;
      } else {
        // --- REAL API CALL ---
        // GET /api/messages/:id
        try {
          const response = await api.get(`/messages/${id}`);
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to load message.');
          throw error;
        }
      }
    },
    send: async (msg: Partial<Message>): Promise<Message> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(300);
        const newMsg = { 
            ...msg, 
            messageId: `M-${Date.now()}`, 
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isSent: true,
            isSeen: false,
            doctorId: "DOC-001"
        } as Message;
        MOCK_MESSAGES.push(newMsg);
        return newMsg;
      } else {
        // --- REAL API CALL ---
        // POST /api/messages
        try {
          const response = await api.post('/messages', {
            patientId: msg.patientId,
            text: msg.text,
            sender: msg.sender || 'doctor',
            imageIds: msg.imageIds || []
          });
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to send message.');
          throw error;
        }
      }
    },
    markAsSeen: async (id: string): Promise<Message> => {
      if (USE_MOCK_DATA) {
         // --- MOCK RESPONSE ---
        await delay(200);
        const message = MOCK_MESSAGES.find(m => m.messageId === id);
        if (!message) throw new Error("Message not found");
        message.isSeen = true;
        return message;
      } else {
        // --- REAL API CALL ---
        // PUT /api/messages/:id/seen
        try {
          const response = await api.put(`/messages/${id}/seen`);
          return response.data;
        } catch (error: any) {
          handleError(error, 'Failed to mark message as seen.');
          throw error;
        }
      }
    }
  }
};
