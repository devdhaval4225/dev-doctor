
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setDashboardData, setPatients } from '../redux/store';
import { apiService } from '../services/api';
import { Patient } from '../types';
import { getPatientId, findPatientById } from '../utils/patientUtils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';
import { Users, Calendar, Video, Activity, Clock, MoreHorizontal, MessageSquare, Plus, UserPlus, Search, Loader2, X, Mail, Phone, FileText, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const dataGrowth = [
  { name: '2019', patients: 400 },
  { name: '2020', patients: 300 },
  { name: '2021', patients: 550 },
  { name: '2022', patients: 800 },
  { name: '2023', patients: 1200 },
];

const dataGender = [
  { name: '2019', male: 200, female: 200 },
  { name: '2020', male: 150, female: 150 },
  { name: '2021', male: 300, female: 250 },
  { name: '2022', male: 400, female: 400 },
  { name: '2023', male: 600, female: 600 },
];

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-gray-800 mt-1">{value || "..."}</h3>
    </div>
  </div>
);

const Dashboard = () => {
  const { dashboard, patients } = useSelector((state: RootState) => state.data);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(!dashboard);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);

  useEffect(() => {
    const loadData = async () => {
        try {
            // Only fetch dashboard data if not already loaded
            if (!dashboard) {
                const dashboardData = await apiService.dashboard.getStats();
                dispatch(setDashboardData(dashboardData));
            }
            
            // Only fetch patients if not already loaded
            if (patients.length === 0) {
                const patientsData = await apiService.patients.getAll();
                dispatch(setPatients(patientsData));
            }
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [dispatch, dashboard, patients.length]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
        setSearchResults([]);
    } else {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = patients.filter(p => 
            p.name.toLowerCase().includes(lowerTerm) || 
            p.mobileNumber.includes(lowerTerm)
        );
        setSearchResults(filtered);
    }
  }, [searchTerm, patients]);

  const handlePatientSelect = (patientId: string) => {
      const patient = findPatientById(patients, patientId);
      if (patient) {
          setViewingPatient(patient);
          setSearchTerm(''); // Clear search on select
      }
  };

  if (isLoading) {
      return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // Sort Appointment Requests (Upcoming) by DateTime ASC
  const upcomingAppointments = dashboard?.appointmentRequest 
    ? [...dashboard.appointmentRequest].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    : [];

  return (
    <div className="p-6 space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex-1 w-full md:w-auto">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1 mb-4">Welcome back, here's what's happening today.</p>
          
          {/* Dashboard Search */}
          <div className="relative w-full max-w-md z-20">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input 
                type="text" 
                placeholder="Search Patient to view details..." 
                className="w-full pl-10 pr-4 py-3 bg-white text-gray-900 placeholder-gray-500 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto">
                    {searchResults.map(p => {
                        const pid = getPatientId(p);
                        return (
                        <div 
                            key={pid} 
                            onClick={() => handlePatientSelect(pid)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                        >
                            <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.mobileNumber} • {p.email}</p>
                        </div>
                    );
                    })}
                </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
             <button 
                onClick={() => navigate('/appointments', { state: { openCreateModal: true } })}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 shadow-md shadow-blue-500/20"
             >
               <Plus className="w-4 h-4" /> Create Appointment
             </button>
             <button 
                onClick={() => navigate('/patients', { state: { openCreateModal: true } })}
                className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
             >
               <UserPlus className="w-4 h-4" /> Create Patient
             </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Calendar} 
          label="Total Appointments" 
          value={dashboard?.analytics.totalAppointment} 
          color="bg-blue-600" 
        />
        <StatCard 
          icon={Users} 
          label="Total Patients" 
          value={dashboard?.analytics.totalPatient} 
          color="bg-purple-600" 
        />
        <StatCard 
          icon={Activity} 
          label="Clinic Consulting" 
          value={dashboard?.analytics.clinicConsulting} 
          color="bg-emerald-600" 
        />
        <StatCard 
          icon={Video} 
          label="Video Consulting" 
          value={dashboard?.analytics.videoConsulting} 
          color="bg-orange-600" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Patient Growth (Year Wise)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataGrowth}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="patients" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Gender Wise Growth</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataGender}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" />
                <Bar dataKey="male" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="female" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Appointment Request Renamed to Upcoming */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Upcoming Appointments</h3>
            <button onClick={() => navigate('/appointments')} className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-gray-100">
                  <th className="font-medium py-3">Patient Name</th>
                  <th className="font-medium py-3">Date & Time</th>
                  <th className="font-medium py-3">Type</th>
                  <th className="font-medium py-3">Status</th>
                  <th className="font-medium py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.map((apt) => (
                  <tr key={apt.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4 text-gray-800 font-medium">{apt.patientName}</td>
                    <td className="py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(apt.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit border ${
                        apt.type === 'Video' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                          {apt.type === 'Video' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                          {apt.type}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium
                         ${apt.status === 'Confirmed' ? 'text-green-600 bg-green-50' : 
                           apt.status === 'Pending' ? 'text-orange-600 bg-orange-50' : 'text-gray-600 bg-gray-50'}
                      `}>{apt.status}</span>
                    </td>
                    <td className="py-4">
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-5 h-5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Patients */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Recent Patients</h3>
            <button onClick={() => navigate('/patients')} className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {dashboard?.recentPatient.map((patient) => (
              <div 
                key={patient.id} 
                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                onClick={() => handlePatientSelect(patient.id)}
              >
                <img src={patient.avatar} alt={patient.name} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{patient.name}</h4>
                  <p className="text-xs text-gray-500 truncate w-32">{patient.address}</p>
                </div>
                <div className="ml-auto">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/messages'); }}
                    className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

       {/* Patient Details Modal */}
       {viewingPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
                     <button 
                        onClick={() => setViewingPatient(null)}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                     >
                        <X className="w-5 h-5" />
                     </button>
                     <div className="absolute -bottom-12 left-8 flex items-end">
                        <div className="w-24 h-24 bg-white rounded-2xl shadow-lg p-1">
                            <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-2xl font-bold text-gray-400">
                                {viewingPatient.name.charAt(0)}
                            </div>
                        </div>
                        <div className="ml-4 mb-2">
                             <h2 className="text-2xl font-bold text-gray-900">{viewingPatient.name}</h2>
                             <p className="text-sm text-gray-500">{viewingPatient.gender} • {getPatientId(viewingPatient)}</p>
                        </div>
                     </div>
                </div>
                
                <div className="pt-16 px-8 pb-8 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    {viewingPatient.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    {viewingPatient.mobileNumber}
                                </div>
                                <div className="flex items-start gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"></div></div>
                                    {viewingPatient.address}
                                </div>
                            </div>
                        </div>
                        
                         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Key Dates</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Last Visit</span>
                                    <span className="font-medium text-gray-900">{viewingPatient.lastVisitDate}</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Next Appt.</span>
                                    <span className="font-medium text-blue-600">{viewingPatient.appointmentDate}</span>
                                </div>
                            </div>
                        </div>
                     </div>

                     <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Medical History
                        </h3>
                        {viewingPatient.visits && viewingPatient.visits.length > 0 ? (
                            <div className="space-y-4">
                                {[...viewingPatient.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit) => (
                                    <div key={visit.visitId} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-800">{visit.diagnosis}</span>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar className="w-3 h-3" />
                                                {visit.date}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-600 mb-2">
                                            <span className="font-medium">Prescription:</span> {visit.prescription}
                                        </div>
                                        {visit.notes && (
                                            <div className="text-xs text-gray-500 italic bg-gray-100 p-2 rounded-lg">
                                                "{visit.notes}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                                No medical history records found.
                            </div>
                        )}
                     </div>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
