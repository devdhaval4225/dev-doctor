
import { User, DashboardData, Patient, Appointment, Message } from '../types';
import api from '../api/axios';
import { store } from '../redux/store';
import { addNotification } from '../redux/store';

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
// API SERVICE IMPLEMENTATION
// ============================================================================

export const apiService = {
  auth: {
    login: async (email: string, password?: string): Promise<{ token: string; user: User }> => {
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
    },
    logout: async (): Promise<boolean> => {
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
  },
  
  dashboard: {
    getStats: async (): Promise<DashboardData> => {
      // GET /api/dashboard/stats
      try {
        const response = await api.get('/dashboard/stats');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load dashboard data.');
        throw error;
      }
    }
  },

  user: {
    getProfile: async (): Promise<User> => {
      // GET /api/user/profile
      try {
        const response = await api.get('/user/profile');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load user profile.');
        throw error;
      }
    },
    updateProfile: async (data: Partial<User>): Promise<User> => {
      // PUT /api/user/profile
      try {
        const response = await api.put('/user/profile', data);
        showSuccess('Profile updated successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to update profile.');
        throw error;
      }
    },
    uploadProfileImage: async (file: File, imageType: 'avatar' | 'cover_image'): Promise<{ user: User; image: { url: string; fileId: string } }> => {
      // POST /api/images/upload-profile
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('imageType', imageType);
        
        const response = await api.post('/images/upload-profile', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        showSuccess(response.data.message || `${imageType === 'avatar' ? 'Avatar' : 'Cover image'} uploaded successfully`);
        return response.data.data;
      } catch (error: any) {
        handleError(error, `Failed to upload ${imageType === 'avatar' ? 'avatar' : 'cover image'}.`);
        throw error;
      }
    },
    removeProfileImage: async (imageType: 'avatar' | 'cover_image'): Promise<User> => {
      // DELETE /api/images/profile/:imageType
      try {
        const response = await api.delete(`/images/profile/${imageType}`);
        showSuccess(response.data.message || `${imageType === 'avatar' ? 'Avatar' : 'Cover image'} removed successfully`);
        return response.data.data.user;
      } catch (error: any) {
        handleError(error, `Failed to remove ${imageType === 'avatar' ? 'avatar' : 'cover image'}.`);
        throw error;
      }
    }
  },

  patients: {
    getAll: async (): Promise<Patient[]> => {
      // GET /api/patients
      try {
        const response = await api.get('/patients');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load patients.');
        throw error;
      }
    },
    getById: async (id: string): Promise<Patient> => {
      // GET /api/patients/:id
      try {
        const response = await api.get(`/patients/${id}`);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load patient.');
        throw error;
      }
    },
    create: async (patient: Partial<Patient>): Promise<Patient> => {
      // POST /api/patients
      try {
        const response = await api.post('/patients', patient);
        showSuccess('Patient created successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to create patient.');
        throw error;
      }
    },
    bulkImport: async (patients: Partial<Patient>[]): Promise<{ 
      message: string;
      summary: { total: number; successful: number; failed: number };
      successful: Patient[];
      failed: Array<{ row: number; data: any; error: string }>;
    }> => {
      // POST /api/patients/bulk-import
      try {
        const response = await api.post('/patients/bulk-import', { patients });
        showSuccess(`Successfully imported ${response.data.summary.successful} patients`);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to bulk import patients.');
        throw error;
      }
    },
    update: async (patient: Patient): Promise<Patient> => {
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
    },
    delete: async (id: string | number): Promise<void> => {
      // DELETE /api/patients/:id
      try {
        await api.delete(`/patients/${id}`);
        showSuccess('Patient deleted successfully');
      } catch (error: any) {
        handleError(error, 'Failed to delete patient.');
        throw error;
      }
    }
  },

  appointments: {
    getAll: async (): Promise<Appointment[]> => {
      // GET /api/appointments
      try {
        const response = await api.get('/appointments');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load appointments.');
        throw error;
      }
    },
    getById: async (id: string): Promise<Appointment> => {
      // GET /api/appointments/:id
      try {
        const response = await api.get(`/appointments/${id}`);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load appointment.');
        throw error;
      }
    },
    create: async (apt: Partial<Appointment>): Promise<Appointment> => {
      // POST /api/appointments
      try {
        const response = await api.post('/appointments', apt);
        showSuccess('Appointment created successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to create appointment.');
        throw error;
      }
    },
    update: async (apt: Appointment): Promise<Appointment> => {
      // PUT /api/appointments/:id
      try {
        const response = await api.put(`/appointments/${apt.appointmentId}`, apt);
        showSuccess('Appointment updated successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to update appointment.');
        throw error;
      }
    },
    delete: async (id: string): Promise<void> => {
      // DELETE /api/appointments/:id
      try {
        await api.delete(`/appointments/${id}`);
        showSuccess('Appointment deleted successfully');
      } catch (error: any) {
        handleError(error, 'Failed to delete appointment.');
        throw error;
      }
    }
  },

  messages: {
    getAll: async (patientId?: string): Promise<Message[]> => {
      // GET /api/messages?patientId=xxx (optional)
      try {
        const params = patientId ? { patientId } : {};
        const response = await api.get('/messages', { params });
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load messages.');
        throw error;
      }
    },
    getById: async (id: string): Promise<Message> => {
      // GET /api/messages/:id
      try {
        const response = await api.get(`/messages/${id}`);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load message.');
        throw error;
      }
    },
    send: async (msg: Partial<Message>): Promise<Message> => {
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
    },
    markAsSeen: async (id: string): Promise<Message> => {
      // PUT /api/messages/:id/seen
      try {
        const response = await api.put(`/messages/${id}/seen`);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to mark message as seen.');
        throw error;
      }
    }
  },

  diagnoses: {
    getAll: async (): Promise<Array<{ id: number; name: string; description?: string }>> => {
      try {
        const response = await api.get('/diagnoses');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load diagnoses.');
        throw error;
      }
    },
    create: async (diagnosis: { name: string; description?: string }): Promise<{ id: number; name: string; description?: string }> => {
      try {
        const response = await api.post('/diagnoses', diagnosis);
        showSuccess('Diagnosis created successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to create diagnosis.');
        throw error;
      }
    },
    update: async (id: number, diagnosis: { name?: string; description?: string }): Promise<{ id: number; name: string; description?: string }> => {
      try {
        const response = await api.put(`/diagnoses/${id}`, diagnosis);
        showSuccess('Diagnosis updated successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to update diagnosis.');
        throw error;
      }
    },
    delete: async (id: number): Promise<void> => {
      try {
        await api.delete(`/diagnoses/${id}`);
        showSuccess('Diagnosis deleted successfully');
      } catch (error: any) {
        handleError(error, 'Failed to delete diagnosis.');
        throw error;
      }
    },
  },

  prescriptions: {
    getAll: async (diagnosisId?: number): Promise<Array<{ id: number; name: string; description?: string; count?: string; timing?: string; diagnosis_id: number; diagnosis?: { id: number; name: string } }>> => {
      try {
        const url = diagnosisId ? `/prescriptions?diagnosisId=${diagnosisId}` : '/prescriptions';
        const response = await api.get(url);
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to load prescriptions.');
        throw error;
      }
    },
    create: async (prescription: { name: string; description?: string; count?: string; timing?: string; diagnosisId: number }): Promise<{ id: number; name: string; description?: string; count?: string; timing?: string; diagnosis_id: number }> => {
      try {
        const response = await api.post('/prescriptions', prescription);
        showSuccess('Prescription created successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to create prescription.');
        throw error;
      }
    },
    update: async (id: number, prescription: { name?: string; description?: string; diagnosisId?: number }): Promise<{ id: number; name: string; description?: string; diagnosis_id: number }> => {
      try {
        const response = await api.put(`/prescriptions/${id}`, prescription);
        showSuccess('Prescription updated successfully');
        return response.data;
      } catch (error: any) {
        handleError(error, 'Failed to update prescription.');
        throw error;
      }
    },
    delete: async (id: number): Promise<void> => {
      try {
        await api.delete(`/prescriptions/${id}`);
        showSuccess('Prescription deleted successfully');
      } catch (error: any) {
        handleError(error, 'Failed to delete prescription.');
        throw error;
      }
    },
  },
};
