
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setUser, addNotification } from '../redux/store';
import { apiService } from '../services/api';
import { User as UserIcon, Clock, Shield, Bell, Camera, Upload, Smartphone, Mail, Monitor, LogOut, Copy, Trash2, Plus, RefreshCw, Save, X, Activity, Lock, ChevronLeft, ChevronRight, Calendar, FileText, Info, CheckCircle } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { parsePhoneNumber, isValidPhoneNumber, isPossiblePhoneNumber } from 'react-phone-number-input';
import { connectSocket, joinDoctorRoom, onLoginActivitiesUpdate, disconnectSocket } from '../services/socketService';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button 
    onClick={onChange}
    type="button"
    className={`w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${checked ? 'bg-blue-600' : 'bg-gray-200'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const Settings = () => {
  const { user } = useSelector((state: RootState) => state.data);
  const { token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'security' | 'about'>('profile');
  
  // Image upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  
  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(user?.mobile_number);
  const [phoneError, setPhoneError] = useState<string>('');
  
  // About state - initialize with empty string, will be loaded from API
  const [about, setAbout] = useState<string>('');
  
  // Clinic information state
  const [clinicName, setClinicName] = useState<string>(user?.clinic_name || '');
  const [clinicAddress, setClinicAddress] = useState<string>(user?.clinic_address || '');

  // --- Availability State (Advanced) ---
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week'); // 'day' or 'week'
  
  // Week and Year Selection
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (currentDate.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  });
  
  // Store slots as time range pairs [start, end] - organized by week/year
  // Format: schedule[year][week][day] = [string, string][]
  // Example: [["09:00 AM", "09:30 AM"], ["09:31 AM", "10:00 AM"]]
  const [schedule, setSchedule] = useState<Record<number, Record<number, Record<string, [string, string][]>>>>(() => {
    const defaultSlots: [string, string][] = Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      const startTime = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
      
      // Calculate end time (30 minutes later)
      const endMinutes = totalMinutes + 30;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      const endAmpm = endH >= 12 ? 'PM' : 'AM';
      const endH12 = endH > 12 ? endH - 12 : (endH === 0 ? 12 : endH);
      const endTime = `${endH12.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} ${endAmpm}`;
      
      return [startTime, endTime];
    });
    
    const initial: Record<number, Record<number, Record<string, [string, string][]>>> = {};
    initial[selectedYear] = {};
    initial[selectedYear][selectedWeek] = {
      'Monday': [...defaultSlots],
      'Tuesday': [...defaultSlots],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': [['09:00 AM', '09:30 AM'], ['09:30 AM', '10:00 AM'], ['10:00 AM', '10:30 AM'], ['10:30 AM', '11:00 AM']],
    'Sunday': [],
    };
    return initial;
  });

  // Generator Config
  const [genConfig, setGenConfig] = useState({
      start: '09:00',
      end: '17:00',
      interval: '30'
  });
  
  // Single Add Config
  const [manualStartTime, setManualStartTime] = useState('09:00');
  const [manualEndTime, setManualEndTime] = useState('09:30');
  
  // Helper to get current week's schedule
  const getCurrentWeekSchedule = (): Record<string, [string, string][]> => {
    if (!schedule[selectedYear] || !schedule[selectedYear][selectedWeek]) {
      return {
        'Monday': [],
        'Tuesday': [],
        'Wednesday': [],
        'Thursday': [],
        'Friday': [],
        'Saturday': [],
        'Sunday': [],
      };
    }
    return schedule[selectedYear][selectedWeek];
  };
  
  // Helper to get week dates
  const getWeekDates = () => {
    const jan1 = new Date(selectedYear, 0, 1);
    const daysOffset = (selectedWeek - 1) * 7;
    const weekStart = new Date(jan1);
    weekStart.setDate(jan1.getDate() + daysOffset - jan1.getDay() + 1); // Monday
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  
  // Get max weeks in year
  const getMaxWeeksInYear = (year: number) => {
    const dec31 = new Date(year, 11, 31);
    const jan1 = new Date(year, 0, 1);
    const days = Math.floor((dec31.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + jan1.getDay() + 1) / 7);
  };

  // Notification Preferences State
  // const [notificationPrefs, setNotificationPrefs] = useState({
  //     emailAlerts: true,
  //     smsAlerts: false,
  //     appointmentReminders: true,
  //     marketingEmails: false,
  //     securityAlerts: true
  // });

  // Security State
  const [twoFactor, setTwoFactor] = useState(false);
  
  // Login Activities State
  const [loginActivities, setLoginActivities] = useState<Array<{
    id: string;
    deviceType: string;
    location: string;
    ipAddress: string;
    userAgent: string;
    timezone: string;
    token: string;
    time: string;
  }>>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
        try {
            const data = await apiService.user.getProfile();
            dispatch(setUser(data));
            setPhoneNumber(data.mobile_number);
            // Set about field - ensure it's properly loaded
            if (data.about !== undefined && data.about !== null) {
              setAbout(String(data.about));
            } else {
              setAbout('');
            }
            // Set clinic information
            if (data.clinic_name !== undefined && data.clinic_name !== null) {
              setClinicName(String(data.clinic_name));
            } else {
              setClinicName('');
            }
            if (data.clinic_address !== undefined && data.clinic_address !== null) {
              setClinicAddress(String(data.clinic_address));
            } else {
              setClinicAddress('');
            }
        } catch(e) {
            console.error("Failed to load user profile", e);
        }
    };
    loadProfile();
  }, [dispatch]);

  // Load login activities and setup Socket.IO for real-time updates
  useEffect(() => {
    const loadLoginActivities = async () => {
      if (activeTab === 'security') {
        setLoadingActivities(true);
        try {
          const activities = await apiService.loginActivities.getAll();
          setLoginActivities(activities);
        } catch (e) {
          console.error("Failed to load login activities", e);
          dispatch(addNotification({
            id: `error-${Date.now()}`,
            title: 'Error',
            message: 'Failed to load login activities',
            type: 'error',
            timestamp: new Date().toISOString()
          }));
        } finally {
          setLoadingActivities(false);
        }
      }
    };
    
    loadLoginActivities();
    
    // Setup Socket.IO for real-time updates
    if (token && user?.id) {
      const socket = connectSocket(token);
      const doctorId = user?.userId || user?.doctorId || user?.id;
      
      if (doctorId) {
        joinDoctorRoom(doctorId.toString());
      }
      
      // Listen for real-time login activities updates
      const unsubscribeLoginActivities = onLoginActivitiesUpdate((activities) => {
        console.log('🔐 Login activities update received:', activities);
        if (activeTab === 'security') {
          setLoginActivities(activities);
        }
      });
      
      return () => {
        unsubscribeLoginActivities();
      };
    }
  }, [activeTab, token, user?.id, user?.userId, user?.doctorId, dispatch]);

  // Update phone number and about when user changes
  useEffect(() => {
    if (user?.mobile_number) {
      setPhoneNumber(user.mobile_number);
      // Clear error when phone number is loaded
      setPhoneError('');
    } else {
      setPhoneNumber(undefined);
    }
    // Update about field when user data changes
    if (user?.about !== undefined && user?.about !== null) {
      setAbout(String(user.about));
    } else if (user && (user.about === null || user.about === undefined)) {
      setAbout('');
    }
  }, [user?.mobile_number, user?.about]);

  if (!user) return <div className="p-6 flex items-center justify-center h-full"><span className="text-gray-500">Loading settings...</span></div>;

  const handleSaveProfile = async () => {
      // Validate phone number before saving
      if (!phoneNumber || phoneNumber.trim() === '') {
          setPhoneError('Phone number is required');
          dispatch(addNotification({
            id: `warning-${Date.now()}`,
            title: 'Warning',
            message: 'Please enter a phone number',
            type: 'warning',
            timestamp: new Date().toISOString()
          }));
          return;
      }
      
      // Use stricter validation - check if number is both valid and complete
      try {
          const parsed = parsePhoneNumber(phoneNumber);
          if (!parsed || !isValidPhoneNumber(phoneNumber)) {
              setPhoneError('Please enter a valid mobile number');
              dispatch(addNotification({
                id: `warning-${Date.now()}`,
                title: 'Warning',
                message: 'Please enter a valid mobile number',
                type: 'warning',
                timestamp: new Date().toISOString()
              }));
              return;
          }
          // Additional check for Indian numbers - must be 10 digits
          if (parsed.country === 'IN') {
              const nationalNumber = parsed.nationalNumber;
              if (!nationalNumber || nationalNumber.length !== 10) {
                  setPhoneError('Please enter a complete 10-digit mobile number');
                  dispatch(addNotification({
                    id: `warning-${Date.now()}`,
                    title: 'Warning',
                    message: 'Please enter a complete 10-digit mobile number',
                    type: 'warning',
                    timestamp: new Date().toISOString()
                  }));
                  return;
              }
          }
      } catch (e) {
          setPhoneError('Please enter a valid mobile number');
          dispatch(addNotification({
            id: `warning-${Date.now()}`,
            title: 'Warning',
            message: 'Please enter a valid mobile number',
            type: 'warning',
            timestamp: new Date().toISOString()
          }));
          return;
      }
      
      // Clear any errors if validation passes
      setPhoneError('');
      
      try {
          // Update profile with phone number, about, and clinic information
          const updatedUser = await apiService.user.updateProfile({
              mobile_number: phoneNumber,
              about: about || undefined,
              clinic_name: clinicName || undefined,
              clinic_address: clinicAddress || undefined,
          });
          dispatch(setUser(updatedUser));
          // Update local state with the returned value
          if (updatedUser.mobile_number) {
            setPhoneNumber(updatedUser.mobile_number);
            setPhoneError('');
          }
      dispatch(addNotification({
        id: `success-${Date.now()}`,
        title: 'Success',
        message: 'Profile saved successfully!',
        type: 'success',
        timestamp: new Date().toISOString()
      }));
      } catch (error) {
          console.error('Failed to save profile:', error);
          dispatch(addNotification({
            id: `error-${Date.now()}`,
            title: 'Error',
            message: 'Failed to save profile. Please try again.',
            type: 'error',
            timestamp: new Date().toISOString()
          }));
      }
  };

  const handleSaveAbout = async () => {
      try {
          const updatedUser = await apiService.user.updateProfile({
              about: about || undefined,
          });
          dispatch(setUser(updatedUser));
          dispatch(addNotification({
            id: `success-${Date.now()}`,
            title: 'Success',
            message: 'About section saved successfully!',
            type: 'success',
            timestamp: new Date().toISOString()
          }));
      } catch (error) {
          console.error('Failed to save about:', error);
          dispatch(addNotification({
            id: `error-${Date.now()}`,
            title: 'Error',
            message: 'Failed to save about section. Please try again.',
            type: 'error',
            timestamp: new Date().toISOString()
          }));
      }
  };

  // Image upload handlers
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      dispatch(addNotification({
        id: `warning-${Date.now()}`,
        title: 'Warning',
        message: 'Please select an image file',
        type: 'warning',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(addNotification({
        id: `warning-${Date.now()}`,
        title: 'Warning',
        message: 'Image size must be less than 5MB',
        type: 'warning',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    setUploadingAvatar(true);
    try {
      const result = await apiService.user.uploadProfileImage(file, 'avatar');
      dispatch(setUser(result.user));
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    } finally {
      setUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      dispatch(addNotification({
        id: `warning-${Date.now()}`,
        title: 'Warning',
        message: 'Please select an image file',
        type: 'warning',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(addNotification({
        id: `warning-${Date.now()}`,
        title: 'Warning',
        message: 'Image size must be less than 5MB',
        type: 'warning',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    setUploadingCover(true);
    try {
      const result = await apiService.user.uploadProfileImage(file, 'cover_image');
      dispatch(setUser(result.user));
    } catch (error) {
      console.error('Failed to upload cover image:', error);
    } finally {
      setUploadingCover(false);
      // Reset input
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  // Availability Helpers
  const formatTime12 = (time24: string) => {
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // Helper to add 30 minutes to a time string (24h format)
  const add30Minutes = (time24: string): string => {
      const [h, m] = time24.split(':').map(Number);
      let newH = h;
      let newM = m + 30;
      if (newM >= 60) {
          newH += 1;
          newM -= 60;
      }
      if (newH >= 24) {
          newH -= 24;
      }
      return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  // Convert 12h time string to 24h format for calculations
  const time12To24 = (time12: string): string => {
      const [timePart, ampm] = time12.split(' ');
      const [h, m] = timePart.split(':').map(Number);
      let hour24 = h;
      if (ampm === 'PM' && h !== 12) hour24 = h + 12;
      if (ampm === 'AM' && h === 12) hour24 = 0;
      return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Format slot as range (for display)
  const formatSlotAsRange = (slot: [string, string]): string => {
      return `${slot[0]} to ${slot[1]}`;
  };

  const generateSlots = () => {
      const slots: [string, string][] = [];
      let current = new Date(`2000-01-01T${genConfig.start}`);
      const end = new Date(`2000-01-01T${genConfig.end}`);
      const interval = parseInt(genConfig.interval);

      while (current < end) {
          const h = current.getHours();
          const m = current.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
          const startTime = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
          
          // Calculate end time
          const endTimeDate = new Date(current);
          endTimeDate.setMinutes(endTimeDate.getMinutes() + interval);
          const endH = endTimeDate.getHours();
          const endM = endTimeDate.getMinutes();
          const endAmpm = endH >= 12 ? 'PM' : 'AM';
          const endH12 = endH > 12 ? endH - 12 : (endH === 0 ? 12 : endH);
          const endTime = `${endH12.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')} ${endAmpm}`;
          
          slots.push([startTime, endTime]);
          current.setMinutes(current.getMinutes() + interval);
      }
      
      setSchedule(prev => {
          const newSchedule = { ...prev };
          if (!newSchedule[selectedYear]) newSchedule[selectedYear] = {};
          if (!newSchedule[selectedYear][selectedWeek]) {
              newSchedule[selectedYear][selectedWeek] = {
                  'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [],
                  'Friday': [], 'Saturday': [], 'Sunday': []
              };
          }
          newSchedule[selectedYear][selectedWeek][selectedDay] = slots;
          return newSchedule;
      });
  };

  const addSingleSlot = () => {
      // Validate that end time is after start time
      const start24 = manualStartTime;
      const end24 = manualEndTime;
      
      // Convert to minutes for comparison
      const [startH, startM] = start24.split(':').map(Number);
      const [endH, endM] = end24.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      
      if (endMinutes <= startMinutes) {
          dispatch(addNotification({
              id: `error-${Date.now()}`,
              title: 'Error',
              message: 'End time must be after start time',
              type: 'error',
              timestamp: new Date().toISOString()
          }));
          return;
      }
      
      // Create slot as [start, end] pair
      const startTimeStr = formatTime12(manualStartTime);
      const endTimeStr = formatTime12(manualEndTime);
      const newSlot: [string, string] = [startTimeStr, endTimeStr];
      
      const currentSchedule = getCurrentWeekSchedule();
      
      // Check if this exact slot already exists
      const slotExists = currentSchedule[selectedDay].some(slot => 
          slot[0] === startTimeStr && slot[1] === endTimeStr
      );
      
      if (!slotExists) {
          setSchedule(prev => {
              const newSchedule = { ...prev };
              if (!newSchedule[selectedYear]) newSchedule[selectedYear] = {};
              if (!newSchedule[selectedYear][selectedWeek]) {
                  newSchedule[selectedYear][selectedWeek] = {
                      'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [],
                      'Friday': [], 'Saturday': [], 'Sunday': []
                  };
              }
              const allSlots = [...newSchedule[selectedYear][selectedWeek][selectedDay], newSlot].sort((a, b) => {
                  // Sort by start time
                  return new Date(`2000/01/01 ${a[0]}`).getTime() - new Date(`2000/01/01 ${b[0]}`).getTime();
          });
              newSchedule[selectedYear][selectedWeek][selectedDay] = allSlots;
              return newSchedule;
          });
          
          // Auto-update end time to be 30 minutes after start for next slot
          const nextEndTime = add30Minutes(manualStartTime);
          setManualEndTime(nextEndTime);
      } else {
          dispatch(addNotification({
              id: `warning-${Date.now()}`,
              title: 'Warning',
              message: 'This time slot already exists',
              type: 'warning',
              timestamp: new Date().toISOString()
          }));
      }
  };

  const removeSlot = (slotToRemove: [string, string], day?: string) => {
      const dayToUse = day || selectedDay;
      setSchedule(prev => {
          const newSchedule = { ...prev };
          if (newSchedule[selectedYear] && newSchedule[selectedYear][selectedWeek]) {
              newSchedule[selectedYear][selectedWeek][dayToUse] = 
                  newSchedule[selectedYear][selectedWeek][dayToUse].filter(s => 
                      !(s[0] === slotToRemove[0] && s[1] === slotToRemove[1])
                  );
          }
          return newSchedule;
      });
  };

  const clearDay = (day: string) => {
      if(window.confirm(`Clear all slots for ${day}?`)) {
          setSchedule(prev => {
              const newSchedule = { ...prev };
              if (!newSchedule[selectedYear]) newSchedule[selectedYear] = {};
              if (!newSchedule[selectedYear][selectedWeek]) {
                  newSchedule[selectedYear][selectedWeek] = {
                      'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [],
                      'Friday': [], 'Saturday': [], 'Sunday': []
                  };
              }
              newSchedule[selectedYear][selectedWeek][day] = [];
              return newSchedule;
          });
      }
  };

  const copyToWeekdays = () => {
      const currentSchedule = getCurrentWeekSchedule();
      const sourceSlots = currentSchedule[selectedDay];
      setSchedule(prev => {
          const newSchedule = { ...prev };
          if (!newSchedule[selectedYear]) newSchedule[selectedYear] = {};
          if (!newSchedule[selectedYear][selectedWeek]) {
              newSchedule[selectedYear][selectedWeek] = {
                  'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [],
                  'Friday': [], 'Saturday': [], 'Sunday': []
              };
          }
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => {
              if (d !== selectedDay) newSchedule[selectedYear][selectedWeek][d] = [...sourceSlots];
      });
          return newSchedule;
      });
      dispatch(addNotification({
        id: `success-${Date.now()}`,
        title: 'Success',
        message: `Copied ${selectedDay}'s schedule to Mon-Fri`,
        type: 'success',
        timestamp: new Date().toISOString()
      }));
  };
  
  const navigateWeek = (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
          if (selectedWeek > 1) {
              setSelectedWeek(selectedWeek - 1);
          } else {
              setSelectedYear(selectedYear - 1);
              setSelectedWeek(getMaxWeeksInYear(selectedYear - 1));
          }
      } else {
          const maxWeeks = getMaxWeeksInYear(selectedYear);
          if (selectedWeek < maxWeeks) {
              setSelectedWeek(selectedWeek + 1);
          } else {
              setSelectedYear(selectedYear + 1);
              setSelectedWeek(1);
          }
      }
  };
  
  const goToCurrentWeek = () => {
      const now = new Date();
      setSelectedYear(now.getFullYear());
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
      setSelectedWeek(Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7));
  };

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
            activeTab === id 
            ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' 
            : 'text-gray-600 hover:bg-gray-50 font-medium'
        }`}
    >
        <Icon className={`w-5 h-5 ${activeTab === id ? 'text-blue-600' : 'text-gray-400'}`} />
        {label}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-50/50">
       {/* Settings Sidebar */}
       <div className="w-full md:w-72 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex md:flex flex-col flex-shrink-0">
            <div className="p-4 sm:p-6 border-b border-gray-50">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage your account preferences</p>
            </div>
            
            {/* Mini User Profile in Sidebar */}
            <div className="p-4 sm:p-6 flex items-center gap-3 mb-2">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200" />
                <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{user.name}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{user.email}</p>
                </div>
            </div>

            <div className="flex flex-row md:flex-col gap-1 px-2 sm:px-4 overflow-x-auto md:overflow-x-visible">
                <TabButton id="profile" icon={UserIcon} label="My Profile" />
                <TabButton id="about" icon={Info} label="About" />
                {/* <TabButton id="availability" icon={Clock} label="Availability" /> */}
                {/* <TabButton id="notifications" icon={Bell} label="Notifications" /> */}
                <TabButton id="security" icon={Shield} label="Security" />
            </div>
       </div>

       {/* Settings Content Area */}
       <div className="flex-1 overflow-y-auto">
            {activeTab === 'profile' && (
                <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h2>
                        <button onClick={handleSaveProfile} className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium text-sm sm:text-base">Save Changes</button>
                    </div>
                    
                    {/* Cover & Profile Image */}
                    <div className="relative mb-16 sm:mb-20 md:mb-24 group">
                        {/* Hidden file inputs */}
                        <input
                            type="file"
                            ref={coverInputRef}
                            onChange={handleCoverUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />
                        
                        <div className="h-40 sm:h-48 md:h-56 w-full bg-gray-100 rounded-xl sm:rounded-2xl overflow-hidden relative border border-gray-200">
                             {user.cover_image ? (
                                <img src={user.cover_image} alt="Cover" className="w-full h-full object-cover" />
                             ) : (
                                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                             )}
                             {uploadingCover && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="text-white flex items-center gap-2">
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Uploading...</span>
                                    </div>
                                </div>
                             )}
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                             <button 
                                onClick={handleCoverClick}
                                disabled={uploadingCover}
                                className="absolute top-4 right-4 bg-white/90 text-gray-700 hover:text-blue-600 px-4 py-2 rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all shadow-sm flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                <Upload className="w-4 h-4" /> {uploadingCover ? 'Uploading...' : 'Edit Cover'}
                             </button>
                        </div>
                        
                        <div className="absolute -bottom-12 sm:-bottom-14 md:-bottom-16 left-4 sm:left-6 md:left-8">
                            <div className="relative group/avatar">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-2 sm:border-4 border-white shadow-xl overflow-hidden bg-white">
                                    {user.avatar ? (
                                    <img 
                                        src={user.avatar} 
                                        alt="Profile" 
                                        className="w-full h-full object-cover"
                                    />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                            <UserIcon className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                {uploadingAvatar && (
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                        <RefreshCw className="w-6 h-6 text-white animate-spin" />
                                </div>
                                )}
                                <button
                                    onClick={handleAvatarClick}
                                    disabled={uploadingAvatar}
                                    className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Camera className="w-8 h-8" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                    <input type="text" defaultValue={user.name} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                        <input type="email" defaultValue={user.email} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <PhoneInput
                                        value={phoneNumber}
                                        onChange={(value) => {
                                            setPhoneNumber(value);
                                            // Clear error and validation message when user starts typing
                                            setPhoneError('');
                                            }}
                                            onBlur={() => {
                                                // Validate on blur only
                                                if (!phoneNumber || (typeof phoneNumber === 'string' && phoneNumber.trim() === '')) {
                                                    setPhoneError('Phone number is required');
                                            } else if (phoneNumber) {
                                                // Strict validation: check if number is valid and complete
                                                try {
                                                    const parsed = parsePhoneNumber(phoneNumber);
                                                    // Check if the number is valid and complete
                                                    // For Indian numbers, national number should be 10 digits
                                                    if (parsed && isValidPhoneNumber(phoneNumber)) {
                                                        // Additional check: ensure the number is complete
                                                        // isValidPhoneNumber should already check this, but we verify
                                                        const nationalNumber = parsed.nationalNumber;
                                                        if (parsed.country === 'IN' && nationalNumber && nationalNumber.length === 10) {
                                                            setPhoneError('');
                                                        } else if (parsed.country !== 'IN') {
                                                            // For other countries, just check if valid
                                                            setPhoneError('');
                                                        } else {
                                                            setPhoneError('Please enter a complete 10-digit mobile number');
                                                        }
                                                    } else {
                                                    setPhoneError('Please enter a valid mobile number');
                                                    }
                                                } catch (e) {
                                                    setPhoneError('Please enter a valid mobile number');
                                                }
                                                } else {
                                                        setPhoneError('');
                                            }
                                        }}
                                        defaultCountry="IN"
                                        placeholder="Enter mobile number"
                                            className={phoneError ? 'border-red-400 focus:border-red-500 bg-red-50/50' : ''}
                                    />
                                    {phoneError && (
                                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1.5">
                                            <X className="w-4 h-4" />
                                            {phoneError}
                                        </p>
                                    )}
                                    {phoneNumber && !phoneError && (() => {
                                        try {
                                            const parsed = parsePhoneNumber(phoneNumber);
                                            if (parsed && isValidPhoneNumber(phoneNumber)) {
                                                // For Indian numbers, ensure it's 10 digits
                                                if (parsed.country === 'IN') {
                                                    return parsed.nationalNumber && parsed.nationalNumber.length === 10;
                                                }
                                                // For other countries, just check if valid
                                                return true;
                                            }
                                            return false;
                                        } catch {
                                            return false;
                                        }
                                    })() && (
                                        <p className="mt-1 text-sm text-green-600 flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4" />
                                            Valid mobile number
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                                    <input type="text" defaultValue={user.specialization} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Name</label>
                                    <input 
                                        type="text" 
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                        placeholder="Enter clinic name"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Address</label>
                                    <textarea 
                                        value={clinicAddress}
                                        onChange={(e) => setClinicAddress(e.target.value)}
                                        placeholder="Enter clinic address"
                                        rows={4} 
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all text-gray-900" 
                                    />
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'about' && (
                <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">About</h2>
                            <p className="text-sm text-gray-500 mt-1">Tell patients about yourself, your experience, and your practice</p>
                        </div>
                        <button 
                            onClick={handleSaveAbout} 
                            className="w-full sm:w-auto bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium text-sm sm:text-base"
                        >
                            Save Changes
                         </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                About You
                            </label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
                                <textarea 
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    placeholder="Tell us about yourself, your experience, qualifications, and your practice. This information will be visible to your patients..."
                                    rows={12}
                                    maxLength={1000}
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all text-gray-900 placeholder-gray-400 text-sm leading-relaxed" 
                                />
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-xs text-gray-500">
                                    Share your professional background, expertise, and what makes your practice unique
                                </p>
                                <p className="text-xs text-gray-500 font-medium">
                                    {about.length}/1000 characters
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'availability' && (
                <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header Section */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <div>
                                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manage Availability</h2>
                                <p className="text-sm sm:text-base text-gray-500">Set your weekly schedule and time slots for appointments</p>
                            </div>
                            <button className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base transform hover:scale-[1.02] active:scale-[0.98]">
                                <Save className="w-5 h-5" /> Save Changes
                            </button>
                        </div>
                    </div>

                    {/* Week and Year Navigation */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border-2 border-gray-100 p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
                        <div className="flex flex-col gap-4 sm:gap-5">
                            {/* Navigation Controls */}
                            <div className="flex items-center justify-between gap-2 sm:gap-3">
                                <button
                                    onClick={() => navigateWeek('prev')}
                                    className="p-2.5 sm:p-3 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0 border-2 border-transparent hover:border-blue-200"
                                >
                                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </button>
                                
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center bg-white rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-200 shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                                        <select
                                            value={selectedYear}
                                            onChange={(e) => {
                                                setSelectedYear(parseInt(e.target.value));
                                                const maxWeeks = getMaxWeeksInYear(parseInt(e.target.value));
                                                if (selectedWeek > maxWeeks) {
                                                    setSelectedWeek(maxWeeks);
                                                }
                                            }}
                                            className="px-2 sm:px-3 py-1.5 sm:py-2 border-0 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900 text-sm sm:text-base cursor-pointer"
                                        >
                                            {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i).map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <span className="text-gray-400 font-medium text-xs sm:text-sm">•</span>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 font-semibold text-xs sm:text-sm whitespace-nowrap">Week</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={getMaxWeeksInYear(selectedYear)}
                                            value={selectedWeek}
                                            onChange={(e) => {
                                                const week = parseInt(e.target.value);
                                                const maxWeeks = getMaxWeeksInYear(selectedYear);
                                                if (week >= 1 && week <= maxWeeks) {
                                                    setSelectedWeek(week);
                                                }
                                            }}
                                            className="w-16 sm:w-20 px-2 sm:px-3 py-1.5 sm:py-2 border-0 bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-900 text-center text-sm sm:text-base"
                                        />
                                        <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">/ {getMaxWeeksInYear(selectedYear)}</span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => navigateWeek('next')}
                                    className="p-2.5 sm:p-3 hover:bg-blue-50 rounded-xl transition-colors flex-shrink-0 border-2 border-transparent hover:border-blue-200"
                                >
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                                </button>
                            </div>
                            
                            {/* Week Date Range Display */}
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                    <span className="text-sm sm:text-base font-semibold text-gray-700">
                                        {getWeekDates()[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                                        {getWeekDates()[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                                
                                <button
                                    onClick={goToCurrentWeek}
                                    className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 text-gray-700 rounded-xl transition-all text-sm font-semibold border-2 border-gray-200 shadow-sm"
                                >
                                    Go to Current Week
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Week Grid View */}
                    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border-2 border-gray-100 p-4 sm:p-5 md:p-6 mb-4 sm:mb-6">
                        <div className="flex items-center justify-between mb-4 sm:mb-5">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-1">Week Overview</h3>
                                <p className="text-xs sm:text-sm text-gray-500">Week {selectedWeek}, {selectedYear}</p>
                            </div>
                            <div className="px-3 py-1.5 bg-blue-100 rounded-lg">
                                <span className="text-xs sm:text-sm font-bold text-blue-700">
                                    {Object.values(getCurrentWeekSchedule()).reduce((sum, slots) => sum + slots.length, 0)} Total Slots
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
                            {daysOfWeek.map((day, idx) => {
                                const currentSchedule = getCurrentWeekSchedule();
                                const slots = currentSchedule[day] || [];
                                const weekDate = getWeekDates()[idx];
                                const isSelected = selectedDay === day;
                                
                                return (
                                    <div
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer transform hover:scale-[1.02] ${
                                            isSelected
                                                ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg shadow-blue-500/20'
                                                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2 sm:mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold text-sm sm:text-base truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                                                    {day.substring(0, 3)}
                                                </h4>
                                                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 font-medium">
                                                    {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            <span className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full flex-shrink-0 ml-2 font-bold ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {slots.length}
                                            </span>
                                        </div>
                                        <div className="mt-2 sm:mt-3 space-y-1 max-h-28 sm:max-h-36 overflow-y-auto">
                                            {slots.length > 0 ? (
                                                slots.slice(0, 2).map((slot, slotIdx) => (
                                                    <div
                                                        key={slotIdx}
                                                        className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg truncate font-medium ${
                                                            isSelected
                                                                ? 'bg-blue-200 text-blue-800'
                                                                : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                        title={formatSlotAsRange(slot)}
                                                    >
                                                        {formatSlotAsRange(slot)}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] sm:text-xs text-gray-400 italic text-center py-1">No slots</p>
                                            )}
                                            {slots.length > 2 && (
                                                <p className={`text-[10px] sm:text-xs font-semibold text-center ${
                                                    isSelected ? 'text-blue-600' : 'text-gray-500'
                                                }`}>
                                                    +{slots.length - 2} more
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 lg:gap-8">
                        {/* Left Column: Days List */}
                        <div className="w-full lg:w-72 flex flex-col gap-3 sm:gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 mb-1 px-1 text-base sm:text-lg">Select Day</h3>
                                <div className="px-2 py-1 bg-blue-50 rounded-lg">
                                    <span className="text-xs font-bold text-blue-700">
                                        {getCurrentWeekSchedule()[selectedDay]?.length || 0} slots
                                    </span>
                                </div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md border-2 border-gray-100 overflow-hidden">
                                {daysOfWeek.map((day, idx) => {
                                    const currentSchedule = getCurrentWeekSchedule();
                                    const count = currentSchedule[day]?.length || 0;
                                    const isActive = selectedDay === day;
                                    const weekDate = getWeekDates()[idx];
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`w-full flex justify-between items-center px-4 sm:px-5 py-3 sm:py-3.5 transition-all border-l-4 ${
                                                isActive 
                                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-800 shadow-lg' 
                                                : 'bg-white text-gray-600 hover:bg-gray-50 border-transparent hover:border-gray-200'
                                            }`}
                                        >
                                            <div className="flex flex-col items-start">
                                                <span className="font-bold text-sm sm:text-base">{day}</span>
                                                <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-white/90' : 'text-gray-400'}`}>
                                                    {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                            <span className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full flex-shrink-0 font-bold ${
                                                isActive 
                                                    ? 'bg-white/20 text-white shadow-sm' 
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {count}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                             {/* Bulk Actions */}
                             <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-100 p-4 sm:p-5 mt-3 sm:mt-4">
                                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <Copy className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">Bulk Actions</h3>
                                </div>
                                <div className="space-y-2 sm:space-y-3">
                                    <button 
                                        onClick={copyToWeekdays}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-xs sm:text-sm font-semibold shadow-sm"
                                    >
                                        <Copy className="w-4 h-4" /> <span className="truncate">Copy {selectedDay.substring(0, 3)} to Mon-Fri</span>
                                    </button>
                                    <button 
                                        onClick={() => clearDay(selectedDay)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition text-xs sm:text-sm font-semibold shadow-lg shadow-red-500/30 transform hover:scale-[1.02]"
                                    >
                                        <Trash2 className="w-4 h-4" /> <span className="truncate">Clear {selectedDay.substring(0, 3)}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Config */}
                        <div className="flex-1 space-y-4 sm:space-y-5 md:space-y-6">
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-5 border-2 border-blue-100">
                                <h3 className="font-bold text-gray-900 text-lg sm:text-xl mb-1">Configure {selectedDay}</h3>
                                <p className="text-xs sm:text-sm text-gray-600">Week {selectedWeek}, {selectedYear}</p>
                            </div>
                            
                            {/* Quick Generate */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-100 p-4 sm:p-5 md:p-6">
                                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <RefreshCw className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base sm:text-lg">Quick Generate</h4>
                                        <p className="text-xs text-gray-500">Generate multiple slots at once</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-end">
                                    <div>
                                        <label className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">Start</label>
                                        <div className="relative">
                                            <input 
                                                type="time" 
                                                className="w-full bg-[#374151] text-white rounded-lg px-3 py-2 sm:py-2.5 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                                value={genConfig.start}
                                                onChange={e => setGenConfig({...genConfig, start: e.target.value})}
                                            />
                                            <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">End</label>
                                        <div className="relative">
                                             <input 
                                                type="time" 
                                                className="w-full bg-[#374151] text-white rounded-lg px-3 py-2 sm:py-2.5 border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm sm:text-base"
                                                value={genConfig.end}
                                                onChange={e => setGenConfig({...genConfig, end: e.target.value})}
                                            />
                                            <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">Interval (min)</label>
                                        <select 
                                            className="w-full bg-[#374151] text-white rounded-lg px-3 py-2 sm:py-2.5 border-none focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm sm:text-base"
                                            value={genConfig.interval}
                                            onChange={e => setGenConfig({...genConfig, interval: e.target.value})}
                                        >
                                            <option value="15">15 Minutes</option>
                                            <option value="30">30 Minutes</option>
                                            <option value="45">45 Minutes</option>
                                            <option value="60">60 Minutes</option>
                                        </select>
                                    </div>
                                </div>
                                <button 
                                    onClick={generateSlots}
                                    className="mt-3 sm:mt-4 w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                                >
                                    Generate Slots
                                </button>
                            </div>

                            {/* Add Single Slot */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl sm:rounded-2xl shadow-md border-2 border-gray-100 p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow">
                                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 md:mb-6">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-gray-900 text-base sm:text-lg truncate">Add Single Slot</h4>
                                        <p className="text-[10px] sm:text-xs text-gray-500">Create a custom time slot</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 sm:space-y-5">
                                    {/* Time Inputs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5 sm:gap-2">
                                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                                Start Time
                                            </label>
                                            <div className="relative group">
                                        <input 
                                            type="time" 
                                                    className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 pr-10 sm:pr-12 font-medium text-sm sm:text-base focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/20 outline-none transition-all hover:border-gray-300 shadow-sm"
                                                    value={manualStartTime}
                                                    onChange={e => {
                                                        setManualStartTime(e.target.value);
                                                        // Auto-update end time to be 30 minutes after start
                                                        const nextEndTime = add30Minutes(e.target.value);
                                                        setManualEndTime(nextEndTime);
                                                    }}
                                        />
                                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                    </div>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                                {formatTime12(manualStartTime)}
                                            </p>
                                        </div>
                                        
                                        <div className="space-y-1.5 sm:space-y-2">
                                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-1.5 sm:gap-2">
                                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                                End Time
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="time" 
                                                    className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 md:py-3.5 pr-10 sm:pr-12 font-medium text-sm sm:text-base focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-500/20 outline-none transition-all hover:border-gray-300 shadow-sm"
                                                    value={manualEndTime}
                                                    onChange={e => setManualEndTime(e.target.value)}
                                                />
                                                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                                                </div>
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                                                {formatTime12(manualEndTime)}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Preview Card */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                        <div className="flex items-center justify-between gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Slot Preview</p>
                                                    <p className="text-sm sm:text-base font-bold text-gray-900 mt-0.5 truncate">
                                                        {formatTime12(manualStartTime)} <span className="text-gray-400 font-normal">to</span> {formatTime12(manualEndTime)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                                                <span className="text-[10px] sm:text-xs font-bold text-blue-700">
                                                    {(() => {
                                                        const [startH, startM] = manualStartTime.split(':').map(Number);
                                                        const [endH, endM] = manualEndTime.split(':').map(Number);
                                                        const startMinutes = startH * 60 + startM;
                                                        const endMinutes = endH * 60 + endM;
                                                        const duration = endMinutes - startMinutes;
                                                        return `${duration} min`;
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Add Button */}
                                    <button 
                                        onClick={addSingleSlot}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Add This Slot
                                    </button>
                                </div>
                            </div>

                            {/* Current Slots List */}
                            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-100 p-4 sm:p-5 md:p-6">
                                <div className="flex items-center justify-between mb-4 sm:mb-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-green-600" />
                                        </div>
                            <div>
                                            <h4 className="font-bold text-gray-900 text-base sm:text-lg">Current Slots</h4>
                                            <p className="text-xs text-gray-500">{getCurrentWeekSchedule()[selectedDay]?.length || 0} time slots configured</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1.5 bg-green-100 rounded-lg">
                                        <span className="text-xs sm:text-sm font-bold text-green-700">
                                            {getCurrentWeekSchedule()[selectedDay]?.length || 0}
                                        </span>
                                    </div>
                                </div>
                                {getCurrentWeekSchedule()[selectedDay]?.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                        {getCurrentWeekSchedule()[selectedDay].map((slot, idx) => {
                                            // Show range format for slots
                                            const slotDisplay = formatSlotAsRange(slot);
                                            return (
                                                <div key={idx} className="bg-white border-2 border-gray-200 text-gray-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl shadow-sm flex items-center justify-between group hover:border-red-300 hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                                                        <span className="text-xs sm:text-sm font-semibold truncate">{slotDisplay}</span>
                                                    </div>
                                                <button 
                                                        onClick={() => removeSlot(slot)}
                                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all ml-2 flex-shrink-0"
                                                >
                                                        <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 sm:p-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 text-center">
                                        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm sm:text-base text-gray-400 font-medium">No slots set for this day.</p>
                                        <p className="text-xs text-gray-400 mt-1">Use "Quick Generate" or "Add Single Slot" to create time slots.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* {activeTab === 'notifications' && (
                <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                        <p className="text-gray-500 mt-1">Manage how and when you receive alerts.</p>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-blue-600" /> Email Notifications
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">Appointment Updates</p>
                                        <p className="text-sm text-gray-500">Receive emails when appointments are booked or cancelled.</p>
                                    </div>
                                    <Toggle checked={notificationPrefs.emailAlerts} onChange={() => setNotificationPrefs(p => ({...p, emailAlerts: !p.emailAlerts}))} />
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">Marketing & News</p>
                                        <p className="text-sm text-gray-500">Receive updates about new features and promotions.</p>
                                    </div>
                                    <Toggle checked={notificationPrefs.marketingEmails} onChange={() => setNotificationPrefs(p => ({...p, marketingEmails: !p.marketingEmails}))} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-purple-600" /> Mobile Alerts
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">SMS Notifications</p>
                                        <p className="text-sm text-gray-500">Receive text messages for urgent alerts.</p>
                                    </div>
                                    <Toggle checked={notificationPrefs.smsAlerts} onChange={() => setNotificationPrefs(p => ({...p, smsAlerts: !p.smsAlerts}))} />
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">Appointment Reminders</p>
                                        <p className="text-sm text-gray-500">Receive SMS reminders 1 hour before appointments.</p>
                                    </div>
                                    <Toggle checked={notificationPrefs.appointmentReminders} onChange={() => setNotificationPrefs(p => ({...p, appointmentReminders: !p.appointmentReminders}))} />
                                </div>
                            </div>
                        </div>
                     </div>
                </div>
            )} */}

            {activeTab === 'security' && (
                <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Security Settings</h2>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">Protect your account and data.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                        {/* Password Change */}
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-blue-600" /> Change Password
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                    <input type="password" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input type="password" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition font-medium">Update Password</button>
                            </div>
                        </div>

                        {/* 2FA */}
                        {/* <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-600" /> Two-Factor Authentication
                            </h3>
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="font-medium text-gray-900">Enable 2FA</p>
                                    <p className="text-sm text-gray-500 max-w-xs">Secure your account with an additional code sent to your phone.</p>
                                </div>
                                <Toggle checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} />
                            </div>
                            {twoFactor && (
                                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100">
                                    2FA is currently enabled via SMS to {user.mobile_number}.
                                </div>
                            )}
                        </div> */}

                        {/* Login Activity */}
                        <div className="md:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-orange-500" /> Recent Login Activity
                            </h3>
                            {loadingActivities ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                                </div>
                            ) : loginActivities.length > 0 ? (
                            <div className="space-y-4">
                                    {loginActivities.map((activity) => {
                                        const getDeviceIcon = (deviceType: string) => {
                                            const lowerType = deviceType?.toLowerCase() || '';
                                            if (lowerType.includes('mobile') || lowerType.includes('phone')) {
                                                return Smartphone;
                                            }
                                            return Monitor;
                                        };
                                        
                                        const formatTime = (timeString: string) => {
                                            const time = new Date(timeString);
                                            const now = new Date();
                                            const diffMs = now.getTime() - time.getTime();
                                            const diffMins = Math.floor(diffMs / 60000);
                                            const diffHours = Math.floor(diffMs / 3600000);
                                            const diffDays = Math.floor(diffMs / 86400000);
                                            
                                            if (diffMins < 1) return 'Active now';
                                            if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
                                            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                                            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                                            return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        };
                                        
                                        const DeviceIcon = getDeviceIcon(activity.deviceType);
                                        
                                        return (
                                            <div key={activity.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                                        <DeviceIcon className="w-5 h-5" />
                                            </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-sm capitalize">
                                                            {activity.deviceType || 'Unknown Device'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {activity.ipAddress && <span className="font-medium">{activity.ipAddress}</span>}
                                                            {activity.ipAddress && activity.location && <span> • </span>}
                                                            {activity.location && <span>{activity.location}</span>}
                                                            {(activity.ipAddress || activity.location) && <span> • </span>}
                                                            <span>{formatTime(activity.time)}</span>
                                                        </p>
                                                        {activity.timezone && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Timezone: {activity.timezone}
                                                            </p>
                                                        )}
                                                        {activity.userAgent && (
                                                            <p className="text-xs text-gray-400 mt-1 truncate max-w-md" title={activity.userAgent}>
                                                                {activity.userAgent.length > 60 ? `${activity.userAgent.substring(0, 60)}...` : activity.userAgent}
                                                            </p>
                                                        )}
                                            </div>
                                        </div>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await apiService.auth.logout(activity.id);
                                                            dispatch(addNotification({
                                                                id: `success-${Date.now()}`,
                                                                title: 'Success',
                                                                message: 'Session logged out successfully',
                                                                type: 'success',
                                                                timestamp: new Date().toISOString()
                                                            }));
                                                            // Reload activities
                                                            const activities = await apiService.loginActivities.getAll();
                                                            setLoginActivities(activities);
                                                        } catch (error) {
                                                            console.error('Failed to logout session:', error);
                                                            dispatch(addNotification({
                                                                id: `error-${Date.now()}`,
                                                                title: 'Error',
                                                                message: 'Failed to logout session',
                                                                type: 'error',
                                                                timestamp: new Date().toISOString()
                                                            }));
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
                                                >
                                                    Log out
                                                </button>
                                    </div>
                                        );
                                    })}
                            </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 italic">
                                    No login activities found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
       </div>
    </div>
  );
};

export default Settings;
