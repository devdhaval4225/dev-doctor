

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardData, User, Message, Patient, Appointment, Notification } from '../types';

// --- Slices ---

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { isAuthenticated: false, token: null } as AuthState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.token = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
    },
  },
});

interface DataState {
  user: User | null;
  dashboard: DashboardData | null;
  messages: Message[];
  patients: Patient[];
  appointments: Appointment[];
  notifications: Notification[];
}

const initialState: DataState = {
  user: null,
  dashboard: null,
  messages: [],
  patients: [],
  appointments: [],
  notifications: [],
};

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setDashboardData: (state, action: PayloadAction<DashboardData>) => {
      state.dashboard = action.payload;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setPatients: (state, action: PayloadAction<Patient[]>) => {
      state.patients = action.payload;
    },
    addPatient: (state, action: PayloadAction<Patient>) => {
      state.patients.push(action.payload);
    },
    updatePatient: (state, action: PayloadAction<Patient>) => {
      const payloadId = action.payload.patientId || action.payload.id?.toString() || '';
      const index = state.patients.findIndex(p => {
        const pId = p.patientId || p.id?.toString() || '';
        return pId === payloadId;
      });
      if (index !== -1) {
        state.patients[index] = action.payload;
      }
    },
    removePatient: (state, action: PayloadAction<string | number>) => {
      const idStr = action.payload.toString();
      state.patients = state.patients.filter(p => {
        const pId = p.patientId || p.id?.toString() || '';
        return pId !== idStr;
      });
    },
    setAppointments: (state, action: PayloadAction<Appointment[]>) => {
      state.appointments = action.payload;
    },
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.appointments.push(action.payload);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const index = state.appointments.findIndex(a => a.appointmentId === action.payload.appointmentId);
      if (index !== -1) {
        state.appointments[index] = action.payload;
      }
    },
    removeAppointment: (state, action: PayloadAction<string>) => {
      state.appointments = state.appointments.filter(a => a.appointmentId !== action.payload);
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
  },
});

// --- Store ---

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    data: dataSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const { login, logout } = authSlice.actions;
export const { 
  setDashboardData, setUser, setMessages, addMessage, 
  setPatients, addPatient, updatePatient, removePatient,
  setAppointments, addAppointment, updateAppointment, removeAppointment,
  addNotification, removeNotification
} = dataSlice.actions;

