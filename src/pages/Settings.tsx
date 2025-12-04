
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setUser } from '../redux/store';
import { apiService } from '../services/api';
import { User as UserIcon, Clock, Shield, Bell, Camera, Upload, Smartphone, Mail, Monitor, LogOut, Copy, Trash2, Plus, RefreshCw, Save, X, Activity, Lock } from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { parsePhoneNumber, isValidPhoneNumber, isPossiblePhoneNumber } from 'react-phone-number-input';

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
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'security'>('profile');
  
  // Image upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);
  
  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>(user?.mobile_number);
  const [phoneError, setPhoneError] = useState<string>('');

  // --- Availability State (Advanced) ---
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  // Store slots as strings like "09:00 AM"
  const [schedule, setSchedule] = useState<Record<string, string[]>>({
    'Monday': Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30; // Start 9:00 AM, 30 min intervals
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }),
    'Tuesday': Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }),
    'Wednesday': Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }),
    'Thursday': Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }),
    'Friday': Array.from({ length: 16 }, (_, i) => {
        const totalMinutes = 9 * 60 + i * 30;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
        return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
    }),
    'Saturday': ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM'],
    'Sunday': [],
  });

  // Generator Config
  const [genConfig, setGenConfig] = useState({
      start: '09:00',
      end: '17:00',
      interval: '30'
  });
  
  // Single Add Config
  const [manualTime, setManualTime] = useState('09:00');

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

  useEffect(() => {
    const loadProfile = async () => {
        try {
            const data = await apiService.user.getProfile();
            dispatch(setUser(data));
            setPhoneNumber(data.mobile_number);
        } catch(e) {
            console.error("Failed to load user profile", e);
        }
    };
    loadProfile();
  }, [dispatch]);

  // Update phone number when user changes
  useEffect(() => {
    if (user?.mobile_number) {
      setPhoneNumber(user.mobile_number);
    }
  }, [user?.mobile_number]);

  if (!user) return <div className="p-6 flex items-center justify-center h-full"><span className="text-gray-500">Loading settings...</span></div>;

  const handleSaveProfile = async () => {
      // Validate phone number before saving
      if (!phoneNumber) {
          alert('Please enter a phone number');
          return;
      }
      
      if (!isValidPhoneNumber(phoneNumber)) {
          alert('Please enter a valid mobile number');
          return;
      }
      
      try {
          // Update profile with phone number
          const updatedUser = await apiService.user.updateProfile({
              mobile_number: phoneNumber,
          });
          dispatch(setUser(updatedUser));
      alert('Profile saved successfully!');
      } catch (error) {
          console.error('Failed to save profile:', error);
          alert('Failed to save profile. Please try again.');
      }
  };

  // Image upload handlers
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
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
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
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

  const generateSlots = () => {
      const slots: string[] = [];
      let current = new Date(`2000-01-01T${genConfig.start}`);
      const end = new Date(`2000-01-01T${genConfig.end}`);
      const interval = parseInt(genConfig.interval);

      while (current < end) {
          const h = current.getHours();
          const m = current.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          const h12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
          const timeString = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
          slots.push(timeString);
          current.setMinutes(current.getMinutes() + interval);
      }
      
      setSchedule(prev => ({
          ...prev,
          [selectedDay]: slots
      }));
  };

  const addSingleSlot = () => {
      const timeStr = formatTime12(manualTime);
      if (!schedule[selectedDay].includes(timeStr)) {
          const newSlots = [...schedule[selectedDay], timeStr].sort((a, b) => {
              // rough sort logic
              return new Date(`2000/01/01 ${a}`).getTime() - new Date(`2000/01/01 ${b}`).getTime();
          });
          setSchedule(prev => ({ ...prev, [selectedDay]: newSlots }));
      }
  };

  const removeSlot = (slotToRemove: string) => {
      setSchedule(prev => ({
          ...prev,
          [selectedDay]: prev[selectedDay].filter(s => s !== slotToRemove)
      }));
  };

  const clearDay = (day: string) => {
      if(window.confirm(`Clear all slots for ${day}?`)) {
          setSchedule(prev => ({ ...prev, [day]: [] }));
      }
  };

  const copyToWeekdays = () => {
      const sourceSlots = schedule[selectedDay];
      const newSchedule = { ...schedule };
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(d => {
          if (d !== selectedDay) newSchedule[d] = [...sourceSlots];
      });
      setSchedule(newSchedule);
      alert(`Copied ${selectedDay}'s schedule to Mon-Fri`);
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
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
       {/* Settings Sidebar */}
       <div className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col flex-shrink-0">
            <div className="p-6 border-b border-gray-50">
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Manage your account preferences</p>
            </div>
            
            {/* Mini User Profile in Sidebar */}
            <div className="p-6 flex items-center gap-3 mb-2">
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{user.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
            </div>

            <div className="flex flex-col gap-1 px-4">
                <TabButton id="profile" icon={UserIcon} label="My Profile" />
                <TabButton id="availability" icon={Clock} label="Availability" />
                {/* <TabButton id="notifications" icon={Bell} label="Notifications" /> */}
                <TabButton id="security" icon={Shield} label="Security" />
            </div>
       </div>

       {/* Settings Content Area */}
       <div className="flex-1 overflow-y-auto">
            {activeTab === 'profile' && (
                <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
                        <button onClick={handleSaveProfile} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium">Save Changes</button>
                    </div>
                    
                    {/* Cover & Profile Image */}
                    <div className="relative mb-24 group">
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
                        
                        <div className="h-56 w-full bg-gray-100 rounded-2xl overflow-hidden relative border border-gray-200">
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
                        
                        <div className="absolute -bottom-16 left-8">
                            <div className="relative group/avatar">
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
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
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                                            setPhoneError('');
                                            
                                            // Validate phone number
                                            if (value) {
                                                if (!isPossiblePhoneNumber(value)) {
                                                    setPhoneError('Please enter a valid mobile number');
                                                } else if (!isValidPhoneNumber(value)) {
                                                    setPhoneError('Invalid phone number format');
                                                } else {
                                                    // Check if it's a mobile number (basic check)
                                                    try {
                                                        const phone = parsePhoneNumber(value);
                                                        // Some countries don't distinguish mobile/landline in metadata
                                                        // So we'll just validate it's a valid phone number
                                                        setPhoneError('');
                                                    } catch (e) {
                                                        setPhoneError('Invalid phone number');
                                                    }
                                                }
                                            } else {
                                                setPhoneError('Phone number is required');
                                            }
                                        }}
                                        defaultCountry="IN"
                                        placeholder="Enter mobile number"
                                    />
                                    {phoneError && (
                                        <p className="mt-1 text-sm text-red-600">{phoneError}</p>
                                    )}
                                    {phoneNumber && !phoneError && isValidPhoneNumber(phoneNumber) && (
                                        <p className="mt-1 text-sm text-green-600">✓ Valid mobile number</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                                    <input type="text" defaultValue={user.specialization} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Clinic Address</label>
                                    <textarea defaultValue={user.address} rows={4} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all text-gray-900" />
                                </div>
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'availability' && (
                <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-8">
                         <h2 className="text-2xl font-bold text-gray-900">Manage Availability</h2>
                         <button className="bg-[#0f766e] text-white px-6 py-2.5 rounded-lg hover:bg-[#115e59] transition shadow-lg shadow-teal-500/20 font-medium flex items-center gap-2">
                             <Save className="w-4 h-4" /> Save Changes
                         </button>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Column: Days List */}
                        <div className="w-full lg:w-72 flex flex-col gap-3">
                            <h3 className="font-bold text-gray-800 mb-1 px-1">Select Day</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                {daysOfWeek.map(day => {
                                    const count = schedule[day]?.length || 0;
                                    const isActive = selectedDay === day;
                                    return (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`w-full flex justify-between items-center px-5 py-4 transition-all ${
                                                isActive 
                                                ? 'bg-[#0f766e] text-white' 
                                                : 'bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            <span className="font-medium">{day}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {count} slots
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                             {/* Bulk Actions */}
                             <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4">
                                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Bulk Actions</h3>
                                <div className="space-y-3">
                                    <button 
                                        onClick={copyToWeekdays}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                                    >
                                        <Copy className="w-4 h-4" /> Copy {selectedDay} to Mon-Fri
                                    </button>
                                    <button 
                                        onClick={() => clearDay(selectedDay)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium shadow-md shadow-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" /> Clear {selectedDay}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Config */}
                        <div className="flex-1 space-y-6">
                            <h3 className="font-bold text-gray-900 text-lg">Configure {selectedDay}</h3>
                            
                            {/* Quick Generate */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" /> Quick Generate
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Start</label>
                                        <div className="relative">
                                            <input 
                                                type="time" 
                                                className="w-full bg-[#374151] text-white rounded-lg px-3 py-2.5 border-none focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={genConfig.start}
                                                onChange={e => setGenConfig({...genConfig, start: e.target.value})}
                                            />
                                            <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">End</label>
                                        <div className="relative">
                                             <input 
                                                type="time" 
                                                className="w-full bg-[#374151] text-white rounded-lg px-3 py-2.5 border-none focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={genConfig.end}
                                                onChange={e => setGenConfig({...genConfig, end: e.target.value})}
                                            />
                                            <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-600 mb-1.5 font-medium">Interval (min)</label>
                                        <select 
                                            className="w-full bg-[#374151] text-white rounded-lg px-3 py-2.5 border-none focus:ring-2 focus:ring-teal-500 outline-none appearance-none"
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
                                    className="mt-4 bg-[#0f766e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#115e59] transition inline-flex items-center gap-2"
                                >
                                    Generate Slots
                                </button>
                            </div>

                            {/* Add Single Slot */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h4 className="font-bold text-gray-800 mb-4">Add Single Slot</h4>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-48">
                                        <input 
                                            type="time" 
                                            className="w-full bg-[#374151] text-white rounded-lg px-3 py-2.5 border-none focus:ring-2 focus:ring-teal-500 outline-none"
                                            value={manualTime}
                                            onChange={e => setManualTime(e.target.value)}
                                        />
                                        <Clock className="w-4 h-4 text-gray-400 absolute right-3 top-3 pointer-events-none" />
                                    </div>
                                    <button 
                                        onClick={addSingleSlot}
                                        className="bg-[#0f766e] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#115e59] transition flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                            </div>

                            {/* Current Slots List */}
                            <div>
                                <h4 className="font-bold text-gray-600 mb-3 text-sm">Current Slots ({schedule[selectedDay]?.length || 0})</h4>
                                {schedule[selectedDay]?.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {schedule[selectedDay].map((time, idx) => (
                                            <div key={idx} className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg shadow-sm flex items-center justify-between group hover:border-red-200 transition-colors">
                                                <span className="text-sm font-medium">{time}</span>
                                                <button 
                                                    onClick={() => removeSlot(time)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-gray-400 italic">
                                        No slots set for this day.
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
                <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                        <p className="text-gray-500 mt-1">Protect your account and data.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Password Change */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                        </div>

                        {/* Login Activity */}
                        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Activity className="w-5 h-5 text-orange-500" /> Recent Login Activity
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { device: 'MacBook Pro', location: 'New York, USA', time: 'Active now', icon: Monitor },
                                    { device: 'iPhone 13', location: 'New York, USA', time: '2 hours ago', icon: Smartphone },
                                    { device: 'Windows PC', location: 'Jersey City, USA', time: 'Yesterday', icon: Monitor }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{item.device}</p>
                                                <p className="text-xs text-gray-500">{item.location} • {item.time}</p>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-red-500 text-sm font-medium">Log out</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
       </div>
    </div>
  );
};

export default Settings;
