
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setAppointments, addAppointment, updateAppointment, setPatients, addPatient } from '../redux/store';
import { apiService } from '../services/api';
import { Appointment, Patient } from '../types';
import { Plus, Search, X, Calendar, Video, MapPin, ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Edit, User, Check, ChevronDown, Clock, FileText, UserPlus, Mail, Phone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const Appointments = () => {
  const { appointments, patients } = useSelector((state: RootState) => state.data);
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // Quick Patient Create State
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  
  // Patient Search State
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sidebar State for Patient History
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  
  // Custom Status Menu State
  const [statusMenu, setStatusMenu] = useState<{ apt: Appointment, top: number, left: number } | null>(null);

  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Pagination & Sort State
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Appointment>('dateTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleOpenModal = (apt?: Appointment) => {
    setShowConfirmation(false);
    if (apt) {
      setEditingAppointment(apt);
      setPatientSearchQuery(apt.patientName || '');
    } else {
      setEditingAppointment(null);
      setPatientSearchQuery('');
    }
    setShowPatientDropdown(false);
    setShowModal(true);
  };

  useEffect(() => {
    const loadData = async () => {
        try {
            // Only fetch appointments if not already loaded
            if (appointments.length === 0) {
                const apts = await apiService.appointments.getAll();
                dispatch(setAppointments(apts));
            }
            
            // Only fetch patients if not already loaded
            if (patients.length === 0) {
                const pats = await apiService.patients.getAll();
                dispatch(setPatients(pats));
            }
        } catch (e) {
            console.error(e);
        }
    };
    loadData();

    if (location.state && (location.state as any).openCreateModal) {
        handleOpenModal();
        window.history.replaceState({}, document.title);
    }
  }, [location, dispatch, appointments.length, patients.length]);

  // Close status menu on scroll to prevent detached UI
  useEffect(() => {
    const handleScroll = () => {
        if (statusMenu) setStatusMenu(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [statusMenu]);

  // Close patient dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
            setShowPatientDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAndSortedAppointments = useMemo(() => {
    let result = appointments.filter(apt => {
      const matchesSearch = apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            apt.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Create a copy before sorting to ensure we don't mutate frozen objects from Redux
    return [...result].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [appointments, searchTerm, statusFilter, sortField, sortOrder]);

  // Derived state for the sidebar
  const viewingPatient = useMemo(() => 
    patients.find(p => p.patientId === viewingPatientId), 
  [patients, viewingPatientId]);

  const patientHistory = useMemo(() => 
    appointments
      .filter(a => a.patientId === viewingPatientId)
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
  [appointments, viewingPatientId]);

  // Filter patients for dropdown
  const filteredPatients = useMemo(() => {
      if (!patientSearchQuery) return patients;
      const lowerQuery = patientSearchQuery.toLowerCase();
      return patients.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.mobileNumber.includes(lowerQuery) ||
        p.email.toLowerCase().includes(lowerQuery)
      );
  }, [patients, patientSearchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSortedAppointments.length / itemsPerPage);
  const paginatedAppointments = filteredAndSortedAppointments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Appointment) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleInlineStatusChange = async (apt: Appointment, newStatus: any) => {
      try {
          const updated = await apiService.appointments.update({ ...apt, status: newStatus });
          dispatch(updateAppointment(updated));
      } catch (e) {
          console.error("Failed to update status", e);
      }
  };

  const handleStatusClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setStatusMenu({
        apt,
        top: rect.bottom + 6,
        left: rect.left
    });
  };

  // Submission Processor
  const processSubmission = async (values: any) => {
    setIsSubmitting(true);
    try {
      if (editingAppointment) {
        const updated = await apiService.appointments.update({ ...editingAppointment, ...values } as Appointment);
        dispatch(updateAppointment(updated));
      } else {
        const created = await apiService.appointments.create(values);
        dispatch(addAppointment(created));
      }
      setShowModal(false);
      setShowConfirmation(false);
    } catch (error) {
      console.error("Failed to save appointment", error);
      alert("Failed to save appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Appointment Formik Config
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      patientId: editingAppointment?.patientId || '',
      patientName: editingAppointment?.patientName || '',
      email: editingAppointment?.email || '',
      dateTime: editingAppointment ? new Date(editingAppointment.dateTime).toISOString().slice(0, 16) : getCurrentDateTime(),
      type: editingAppointment?.type || 'Consulting',
      status: editingAppointment?.status || 'Confirmed',
      notes: editingAppointment?.notes || ''
    },
    validationSchema: Yup.object({
      patientName: Yup.string().required('Patient Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      dateTime: Yup.string().required('Date & Time is required'),
      type: Yup.string().required('Type is required'),
      status: Yup.string().required('Status is required')
    }),
    onSubmit: async (values) => {
       // If it's a new appointment, show confirmation first
       if (!editingAppointment) {
           setShowConfirmation(true);
           // We don't submit yet, confirmation modal does that via processSubmission
       } else {
           // Direct update for edits
           await processSubmission(values);
       }
    }
  });

  // Patient Formik Config (Quick Create)
  const patientFormik = useFormik({
    initialValues: {
      name: '',
      email: '',
      mobileNumber: '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      mobileNumber: Yup.string().required('Phone is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsCreatingPatient(true);
      try {
        // Create patient with default values for non-required fields
        const newPatient = await apiService.patients.create({
          ...values,
          gender: 'Other',
          address: 'Not provided',
          lastVisitDate: new Date().toISOString().split('T')[0],
          appointmentDate: '-',
          visits: []
        } as any);

        dispatch(addPatient(newPatient));
        
        // If the appointment modal is not open (e.g., started from "New Patient" button), open it
        if (!showModal) {
            setEditingAppointment(null);
            setShowModal(true);
        }

        // Auto-select the new patient in the appointment form
        formik.setFieldValue('patientId', newPatient.patientId);
        formik.setFieldValue('patientName', newPatient.name);
        formik.setFieldValue('email', newPatient.email);
        setPatientSearchQuery(newPatient.name);
        
        setShowPatientModal(false);
        resetForm();
      } catch (error) {
        console.error("Failed to create patient", error);
        alert("Failed to create patient. Please try again.");
      } finally {
        setIsCreatingPatient(false);
      }
    }
  });

  const handlePatientSelect = (patient: Patient) => {
      formik.setFieldValue('patientId', patient.patientId);
      formik.setFieldValue('patientName', patient.name);
      formik.setFieldValue('email', patient.email);
      setPatientSearchQuery(patient.name);
      setShowPatientDropdown(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'Confirmed': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
        case 'Pending': return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
        case 'Completed': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
        case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch(status) {
        case 'Confirmed': return 'bg-green-500';
        case 'Pending': return 'bg-orange-500';
        case 'Completed': return 'bg-blue-500';
        case 'Cancelled': return 'bg-red-500';
        default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500">Manage your schedule and upcoming visits.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setShowPatientModal(true)}
                className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
            >
                <UserPlus className="w-4 h-4" /> New Patient
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 font-medium"
            >
              <Plus className="w-4 h-4" /> New Appointment
            </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
         {/* Search */}
         <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search name/email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           {/* Status Filter */}
           <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
          >
            <option value="All">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Sort Field */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <select 
                value={sortField}
                onChange={(e) => handleSort(e.target.value as keyof Appointment)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
            >
                <option value="dateTime">Date</option>
                <option value="patientName">Name</option>
                <option value="status">Status</option>
                <option value="type">Type</option>
            </select>
            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
                {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm font-medium border-b border-gray-100">
                <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('patientName')}>Patient</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dateTime')}>Date & Time</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>Type</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAppointments.length > 0 ? paginatedAppointments.map((apt) => (
                <tr key={apt.appointmentId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div 
                        onClick={(e) => {
                            if (apt.patientId) {
                                e.stopPropagation();
                                setViewingPatientId(apt.patientId);
                            }
                        }}
                        className={`font-bold text-gray-900 flex items-center gap-1.5 w-fit ${apt.patientId ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                        title={apt.patientId ? "View Patient History" : ""}
                    >
                        {apt.patientName}
                        {apt.patientId && <User className="w-3 h-3 text-gray-400" />}
                    </div>
                    <div className="text-xs text-gray-500">{apt.email}</div>
                    {apt.patientId && <div className="text-[10px] text-blue-500 bg-blue-50 inline-block px-1 rounded mt-1">ID: {apt.patientId}</div>}
                    {apt.notes && <div className="text-xs text-gray-400 mt-1 italic max-w-[200px] truncate">{apt.notes}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(apt.dateTime).toLocaleDateString()} 
                        <span className="text-gray-400">|</span>
                        {new Date(apt.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit border ${
                        apt.type === 'Video' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {apt.type === 'Video' ? <Video className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                        {apt.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <button 
                        onClick={(e) => handleStatusClick(e, apt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-all border ${getStatusColor(apt.status)}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(apt.status)}`}></span>
                        {apt.status}
                        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${statusMenu?.apt.appointmentId === apt.appointmentId ? 'rotate-180' : ''}`} />
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                        {apt.patientId && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingPatientId(apt.patientId);
                                }}
                                className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50"
                                title="View Patient History Sidebar"
                            >
                                <User className="w-4 h-4" />
                            </button>
                        )}
                        <button 
                            onClick={() => handleOpenModal(apt)}
                            className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50"
                            title="Edit Appointment"
                        >
                        <Edit className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No appointments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
                >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                </select>
            </div>

            <div className="flex items-center gap-2">
                <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages || 1}
                </span>
                <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>

      {/* Patient History Sidebar */}
      {viewingPatientId && (
        <>
            <div 
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity" 
                onClick={() => setViewingPatientId(null)}
            ></div>
            <div className="fixed top-0 right-0 h-screen w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Sidebar Header */}
                <div className="p-6 bg-blue-600 text-white flex justify-between items-start">
                    <div>
                         <h2 className="text-xl font-bold">{viewingPatient?.name || 'Patient Details'}</h2>
                         <p className="text-blue-100 text-sm mt-1">{viewingPatient?.email}</p>
                         <p className="text-blue-100 text-sm">{viewingPatient?.mobileNumber}</p>
                    </div>
                    <button 
                        onClick={() => setViewingPatientId(null)}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Past Appointments
                    </h3>
                    
                    <div className="space-y-4">
                        {patientHistory.map((histApt) => (
                            <div key={histApt.appointmentId} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStatusDot(histApt.status)}`}></div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {new Date(histApt.dateTime).toLocaleDateString()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(histApt.status)}`}>
                                        {histApt.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                     <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                        histApt.type === 'Video' 
                                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                     }`}>
                                        {histApt.type === 'Video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                        {histApt.type}
                                     </span>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(histApt.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                {histApt.notes && (
                                    <div className="mt-3 pt-3 border-t border-gray-50">
                                        <p className="text-xs text-gray-400 italic">"{histApt.notes}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                        {patientHistory.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
                                No appointment history found.
                            </div>
                        )}
                    </div>

                    {/* Show Clinical Visit History if available */}
                    {viewingPatient?.visits && viewingPatient.visits.length > 0 && (
                        <div className="mt-8">
                             <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Clinical Records
                            </h3>
                            <div className="space-y-4">
                                {[...viewingPatient.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-gray-800 text-sm">{visit.diagnosis}</span>
                                            <span className="text-xs text-gray-500">{visit.date}</span>
                                        </div>
                                        <p className="text-xs text-gray-600">RX: {visit.prescription}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-gray-100">
                     <p className="text-center text-xs text-gray-400">Viewing Patient ID: {viewingPatientId}</p>
                </div>
            </div>
        </>
      )}

      {/* Floating Status Menu (Pills) */}
      {statusMenu && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setStatusMenu(null)}></div>
            <div 
                className="fixed z-50 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden w-40 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: statusMenu.top, left: statusMenu.left }}
            >
                {['Confirmed', 'Pending', 'Completed', 'Cancelled'].map(status => (
                    <button
                        key={status}
                        onClick={() => {
                            handleInlineStatusChange(statusMenu.apt, status);
                            setStatusMenu(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 flex items-center gap-2 text-gray-700 transition-colors"
                    >
                        <span className={`w-2 h-2 rounded-full ${getStatusDot(status)}`}></span>
                        {status}
                        {statusMenu.apt.status === status && <Check className="w-3 h-3 ml-auto text-blue-600" />}
                    </button>
                ))}
            </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[60] p-4 backdrop-blur-[1px]">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in duration-200 p-6 text-center border border-gray-100">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Appointment</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                      Are you sure you want to schedule this appointment for <br/>
                      <span className="font-bold text-gray-800">{formik.values.patientName || "New Patient"}</span>?
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button 
                          onClick={() => setShowConfirmation(false)}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={() => processSubmission(formik.values)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium flex items-center gap-2"
                      >
                          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                          Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Quick Create Patient Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 border border-gray-100">
                 <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-600" /> New Patient
                    </h3>
                    <button onClick={() => setShowPatientModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                 </div>
                 <form onSubmit={patientFormik.handleSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input 
                            name="name"
                            type="text" 
                            placeholder="John Doe"
                            className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={patientFormik.values.name}
                            onChange={patientFormik.handleChange}
                        />
                        {patientFormik.touched.name && patientFormik.errors.name && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.name}</div>}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                         <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input 
                                name="email"
                                type="email" 
                                placeholder="john@example.com"
                                className="w-full pl-9 bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={patientFormik.values.email}
                                onChange={patientFormik.handleChange}
                            />
                         </div>
                        {patientFormik.touched.email && patientFormik.errors.email && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.email}</div>}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input 
                                name="mobileNumber"
                                type="tel" 
                                placeholder="+1 (555) 000-0000"
                                className="w-full pl-9 bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={patientFormik.values.mobileNumber}
                                onChange={patientFormik.handleChange}
                            />
                        </div>
                        {patientFormik.touched.mobileNumber && patientFormik.errors.mobileNumber && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.mobileNumber}</div>}
                     </div>
                     
                     <div className="pt-2 flex justify-end gap-3">
                         <button 
                            type="button" 
                            onClick={() => setShowPatientModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                         >
                            Cancel
                         </button>
                         <button 
                            type="submit" 
                            disabled={isCreatingPatient}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm font-medium"
                         >
                             {isCreatingPatient ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                             Create & Select
                         </button>
                     </div>
                 </form>
             </div>
        </div>
      )}

      {/* Create/Edit Modal with Formik */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingAppointment ? 'Edit Appointment' : 'Create Appointment'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={formik.handleSubmit} className="p-6 space-y-4">
              
              {/* Patient Selection Find/Search */}
              <div ref={searchContainerRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Find Patient</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name or phone..."
                            className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={patientSearchQuery}
                            onChange={(e) => {
                                setPatientSearchQuery(e.target.value);
                                setShowPatientDropdown(true);
                            }}
                            onFocus={() => setShowPatientDropdown(true)}
                        />
                        {showPatientDropdown && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50">
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map(p => (
                                        <div 
                                            key={p.patientId} 
                                            onClick={() => handlePatientSelect(p)}
                                            className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                        >
                                            <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.mobileNumber} • {p.email}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                        No patients found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={() => setShowPatientModal(true)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 rounded-lg border border-blue-200 transition-colors"
                        title="Create New Patient"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                <input 
                  name="patientName"
                  type="text" 
                  placeholder="Enter patient name"
                  className={`w-full bg-white text-gray-900 border ${formik.touched.patientName && formik.errors.patientName ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                  value={formik.values.patientName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                 {formik.touched.patientName && formik.errors.patientName ? (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.patientName}</div>
                ) : null}
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID (Optional)</label>
                    <input 
                      name="patientId"
                      type="text" 
                      placeholder="Auto-filled if selected"
                      className="w-full bg-gray-50 text-gray-500 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formik.values.patientId}
                      readOnly
                    />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                      name="email"
                      type="email" 
                      placeholder="patient@example.com"
                      className={`w-full bg-white text-gray-900 border ${formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.email && formik.errors.email ? (
                      <div className="text-red-500 text-xs mt-1">{formik.errors.email}</div>
                    ) : null}
                  </div>
               </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input 
                    name="dateTime"
                    type="datetime-local" 
                    className={`w-full bg-white text-gray-900 border ${formik.touched.dateTime && formik.errors.dateTime ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                    value={formik.values.dateTime}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                   {formik.touched.dateTime && formik.errors.dateTime ? (
                      <div className="text-red-500 text-xs mt-1">{formik.errors.dateTime}</div>
                    ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    name="type"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formik.values.type}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  >
                    <option value="Consulting">Consulting</option>
                    <option value="Video">Video</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select 
                    name="status"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formik.values.status}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  >
                    <option value="Confirmed">Confirmed</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Add any additional notes here..."
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                   {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingAppointment ? 'Update Appointment' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
