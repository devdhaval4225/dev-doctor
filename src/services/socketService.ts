import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token?: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket.IO disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinDoctorRoom = (doctorId: string | number) => {
  if (socket) {
    socket.emit('join-doctor-room', doctorId.toString());
    console.log(`Joined doctor room: doctor-${doctorId}`);
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const onDashboardUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('dashboard-update', callback);
    return () => {
      socket?.off('dashboard-update', callback);
    };
  }
  return () => {};
};

export const onAppointmentsUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('appointments-update', callback);
    return () => {
      socket?.off('appointments-update', callback);
    };
  }
  return () => {};
};

export const onAppointmentCreated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('appointment-created', callback);
    return () => {
      socket?.off('appointment-created', callback);
    };
  }
  return () => {};
};

export const onAppointmentUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('appointment-updated', callback);
    return () => {
      socket?.off('appointment-updated', callback);
    };
  }
  return () => {};
};

export const onPatientsUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('patients-update', callback);
    return () => {
      socket?.off('patients-update', callback);
    };
  }
  return () => {};
};

export const onPatientCreated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('patient-created', callback);
    return () => {
      socket?.off('patient-created', callback);
    };
  }
  return () => {};
};

export const onPatientUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('patient-updated', callback);
    return () => {
      socket?.off('patient-updated', callback);
    };
  }
  return () => {};
};

export const onLoginActivitiesUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('login-activities-update', callback);
    return () => {
      socket?.off('login-activities-update', callback);
    };
  }
  return () => {};
};