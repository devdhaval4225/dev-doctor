
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setAppointments, addAppointment, updateAppointment, setPatients, addPatient } from '../redux/store';
import { apiService } from '../services/api';
import { Appointment, Patient } from '../types';
import { Plus, Search, X, Calendar, Video, MapPin, ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight, Edit, User, Check, ChevronDown, Clock, FileText, UserPlus, Mail, Phone, Stethoscope, Pill, Filter, CheckSquare } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { indiaStates, getCitiesByState } from '../data/indiaStatesCities';
import SearchableSelect from '../components/SearchableSelect';
import CustomDatePicker from '../components/DatePicker';
import { connectSocket, joinDoctorRoom, onAppointmentsUpdate, onAppointmentCreated, onAppointmentUpdated, onPatientsUpdate, disconnectSocket } from '../services/socketService';

const Appointments = () => {
  const { appointments, patients, user } = useSelector((state: RootState) => state.data);
  const { token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  // Quick Patient Create State
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // Diagnosis and Prescription State
  const [diagnoses, setDiagnoses] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [prescriptions, setPrescriptions] = useState<Array<{ id: number; name: string; description?: string; count?: string; timing?: string; diagnosis_id: number; diagnosis?: { id: number; name: string } }>>([]);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<number | ''>('');
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [newDiagnosisName, setNewDiagnosisName] = useState('');
  const [newPrescriptionName, setNewPrescriptionName] = useState('');
  const [newPrescriptionDescription, setNewPrescriptionDescription] = useState('');
  const [newPrescriptionCount, setNewPrescriptionCount] = useState('');
  const [newPrescriptionTiming, setNewPrescriptionTiming] = useState('');
  
  // Prescription Details Modal State
  const [showPrescriptionDetailsModal, setShowPrescriptionDetailsModal] = useState(false);
  const [selectedPrescriptionDetails, setSelectedPrescriptionDetails] = useState<{ prescription: string; count?: string; timing?: string; appointment: Appointment } | null>(null);
  
  // Comprehensive Appointment Details Modal State
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [editableDiagnosis, setEditableDiagnosis] = useState<string>('');
  const [editablePrescription, setEditablePrescription] = useState<string>('');
  const [editableDiagnosisId, setEditableDiagnosisId] = useState<number | ''>('');
  const [isSavingMedicalInfo, setIsSavingMedicalInfo] = useState(false);
  
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
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // Empty means show all
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  
  // Pagination & Sort State
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Appointment>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Initialize editable values when appointment details modal opens
  useEffect(() => {
    if (showAppointmentDetailsModal && selectedAppointmentDetails) {
      const apt = selectedAppointmentDetails;
      setEditableDiagnosis(apt.diagnosis || '');
      setEditablePrescription(apt.prescription || '');
      const diag = diagnoses.find(d => d.name === apt.diagnosis);
      setEditableDiagnosisId(diag?.id || '');
    }
  }, [showAppointmentDetailsModal, selectedAppointmentDetails?.appointmentId, diagnoses]);
  
  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Date Filter State - Initialize after getCurrentDate is defined
  const [selectedDate, setSelectedDate] = useState<string>(getCurrentDate()); // Default to today

  const handleOpenCreateModal = () => {
    setShowConfirmation(false);
    setEditingAppointment(null);
    setPatientSearchQuery('');
    setSelectedDiagnosisId('');
    setShowPatientDropdown(false);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (apt: Appointment) => {
    setShowConfirmation(false);
      setEditingAppointment(apt);
      setPatientSearchQuery(apt.patientName || '');
    // Set selected diagnosis ID if diagnosis exists
    if (apt.diagnosis && diagnoses.length > 0) {
      const diag = diagnoses.find(d => d.name === apt.diagnosis);
      if (diag) {
        setSelectedDiagnosisId(diag.id);
    } else {
        setSelectedDiagnosisId('');
      }
    } else {
      setSelectedDiagnosisId('');
    }
    setShowPatientDropdown(false);
    setShowEditModal(true);
  };

  // Update selectedDiagnosisId when diagnoses load and editing appointment
  useEffect(() => {
    if (editingAppointment?.diagnosis && diagnoses.length > 0 && !selectedDiagnosisId) {
      const diag = diagnoses.find(d => d.name === editingAppointment.diagnosis);
      if (diag) {
        setSelectedDiagnosisId(diag.id);
      }
    }
  }, [diagnoses, editingAppointment, selectedDiagnosisId]);

  const handleCreateDiagnosis = async () => {
    if (!newDiagnosisName.trim()) {
      alert('Please enter a diagnosis name');
      return;
    }
    try {
      const newDiag = await apiService.diagnoses.create({ name: newDiagnosisName.trim() });
      const diagnosisName = newDiag.name.trim();
      const diagnosisId = newDiag.id;
      
      // Reload diagnoses to get the updated list
      const updatedDiags = await apiService.diagnoses.getAll();
      // Ensure the new diagnosis is in the list (add it if not found)
      let finalDiags = [...updatedDiags];
      const diagnosisExists = finalDiags.some(d => d.id === diagnosisId || d.name === diagnosisName);
      if (!diagnosisExists) {
        finalDiags.push(newDiag);
      }
      
      // Update diagnoses state first
      setDiagnoses(finalDiags);
      setNewDiagnosisName('');
      setShowDiagnosisModal(false);
      
      // Wait for React to process the state update, then set the selected value
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        // Auto-select the newly created diagnosis
        formik.setFieldValue('diagnosis', diagnosisName, false);
        setSelectedDiagnosisId(diagnosisId);
        
        // If Patient & Medical Details modal is open, update editable values
        if (showAppointmentDetailsModal && selectedAppointmentDetails) {
          setEditableDiagnosis(diagnosisName);
          setEditableDiagnosisId(diagnosisId);
          // Clear prescription when diagnosis changes
          setEditablePrescription('');
        }
      });
    } catch (error: any) {
      console.error('Failed to create diagnosis:', error);
      alert(error?.response?.data?.error || 'Failed to create diagnosis');
    }
  };

  const handleCreatePrescription = async () => {
    if (!newPrescriptionName.trim()) {
      alert('Please enter a prescription name');
      return;
    }
    // Check if we're in the Patient & Medical Details modal context
    const isInDetailsModal = showAppointmentDetailsModal && selectedAppointmentDetails;
    const diagId = isInDetailsModal 
      ? (editableDiagnosisId || (editableDiagnosis ? diagnoses.find(d => d.name === editableDiagnosis)?.id : null))
      : (selectedDiagnosisId || (formik.values.diagnosis ? diagnoses.find(d => d.name === formik.values.diagnosis)?.id : null));
    
    if (!diagId) {
      alert('Please select a diagnosis first');
      return;
    }
    try {
      const newPresc = await apiService.prescriptions.create({
        name: newPrescriptionName.trim(),
        description: newPrescriptionDescription.trim() || undefined,
        count: newPrescriptionCount.trim() || undefined,
        timing: newPrescriptionTiming.trim() || undefined,
        diagnosisId: diagId,
      });
      // Reload prescriptions to get the updated list
      const updatedPrescs = await apiService.prescriptions.getAll(diagId);
      setPrescriptions(updatedPrescs);
      setNewPrescriptionName('');
      setNewPrescriptionDescription('');
      setNewPrescriptionCount('');
      setNewPrescriptionTiming('');
      setShowPrescriptionModal(false);
      // Auto-select the newly created prescription
      formik.setFieldValue('prescription', newPresc.name);
      // If Patient & Medical Details modal is open, update editable values immediately
      if (isInDetailsModal) {
        // Set the prescription immediately - this will auto-select it in the dropdown
        setEditablePrescription(newPresc.name);
        // Reload prescriptions for the current diagnosis in details modal to ensure list is updated
        const currentDiagId = editableDiagnosisId || (editableDiagnosis ? diagnoses.find(d => d.name === editableDiagnosis)?.id : null);
        if (currentDiagId) {
          const updatedPrescsForDiag = await apiService.prescriptions.getAll(currentDiagId);
          setPrescriptions(updatedPrescsForDiag);
          // Ensure the newly created prescription is still selected after reload
          setEditablePrescription(newPresc.name);
        }
      }
    } catch (error: any) {
      console.error('Failed to create prescription:', error);
      alert(error?.response?.data?.error || 'Failed to create prescription');
    }
  };

  const hasLoadedRef = useRef(false);

  // Load data function
  const loadData = async () => {
    try {
      if (hasLoadedRef.current && appointments.length > 0 && patients.length > 0) {
        return; // Prevent duplicate calls in StrictMode
      }
      
      hasLoadedRef.current = true;
      
      // Fetch initial data
      const apts = await apiService.appointments.getAll();
      dispatch(setAppointments(apts));
      
      const pats = await apiService.patients.getAll();
      dispatch(setPatients(pats));

      // Load diagnoses and prescriptions
      try {
        const diags = await apiService.diagnoses.getAll();
        setDiagnoses(diags);
        const prescs = await apiService.prescriptions.getAll();
        setPrescriptions(prescs);
      } catch (e) {
        console.error('Failed to load diagnoses/prescriptions:', e);
      }
    } catch (e) {
      console.error(e);
      hasLoadedRef.current = false; // Reset on error to allow retry
    }
  };

  // Initial load and Socket.IO setup
  useEffect(() => {
    loadData();

    if (location.state && (location.state as any).openCreateModal) {
        handleOpenCreateModal();
        window.history.replaceState({}, document.title);
    }

    // Connect to Socket.IO
    if (token) {
      const socket = connectSocket(token);
      const doctorId = user?.userId || user?.doctorId || user?.id;
      
      if (doctorId) {
        joinDoctorRoom(doctorId.toString());
      }

      // Listen for real-time updates
      const unsubscribeAppointments = onAppointmentsUpdate((data) => {
        console.log('📅 Appointments update received:', data);
        dispatch(setAppointments(data));
      });

      const unsubscribeAppointmentCreated = onAppointmentCreated((appointment) => {
        console.log('➕ Appointment created:', appointment);
        dispatch(addAppointment(appointment));
      });

      const unsubscribeAppointmentUpdated = onAppointmentUpdated((appointment) => {
        console.log('✏️ Appointment updated:', appointment);
        dispatch(updateAppointment(appointment));
      });

      const unsubscribePatients = onPatientsUpdate((data) => {
        console.log('👥 Patients update received:', data);
        dispatch(setPatients(data));
      });

      return () => {
        unsubscribeAppointments();
        unsubscribeAppointmentCreated();
        unsubscribeAppointmentUpdated();
        unsubscribePatients();
        disconnectSocket();
      };
    }
  }, [location, dispatch, token, user]);

  // Load prescriptions when diagnosis changes
  useEffect(() => {
    const loadPrescriptions = async () => {
      if (selectedDiagnosisId) {
        try {
          const prescs = await apiService.prescriptions.getAll(selectedDiagnosisId as number);
          setPrescriptions(prescs);
        } catch (e) {
          console.error('Failed to load prescriptions:', e);
        }
      } else {
        // Load all prescriptions if no diagnosis selected
        try {
          const prescs = await apiService.prescriptions.getAll();
          setPrescriptions(prescs);
        } catch (e) {
          console.error('Failed to load prescriptions:', e);
        }
      }
    };
    loadPrescriptions();
  }, [selectedDiagnosisId]);

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
        if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
            setShowStatusFilter(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status filter helpers
  const allStatuses = ['Confirmed', 'Pending', 'Completed', 'Cancelled'];
  const toggleStatus = (status: string) => {
    setStatusFilter(prev => {
      const newFilter = prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status];
      // If all statuses are selected, treat as empty (show all)
      return newFilter.length === allStatuses.length ? [] : newFilter;
    });
  };
  const selectAllStatuses = () => {
    setStatusFilter([]); // Empty means show all
  };
  const clearAllStatuses = () => {
    setStatusFilter([]);
  };
  // When filter is empty, all are effectively selected
  const isAllSelected = statusFilter.length === 0 || statusFilter.length === allStatuses.length;
  const isNoneSelected = statusFilter.length === 0;


  const filteredAndSortedAppointments = useMemo(() => {
    // Ensure we have a fresh array reference for React to detect changes
    const appointmentsArray = Array.isArray(appointments) ? [...appointments] : [];

    let result = appointmentsArray.filter(apt => {
      const matchesSearch = apt.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (apt.email && apt.email.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(apt.status);
      
      // Filter by selected date (if date is selected)
      let matchesDate = true;
      if (selectedDate) {
        const aptDate = apt.date || apt.dateTime || '';
        if (aptDate) {
          const aptDateStr = new Date(aptDate).toISOString().split('T')[0];
          matchesDate = aptDateStr === selectedDate;
        } else {
          matchesDate = false; // No date means no match
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });

    // Create a copy before sorting to ensure we don't mutate frozen objects from Redux
    return [...result].sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      
      // Handle appointmentId field
      if (sortField === 'appointmentId') {
        valA = a.appointmentId?.toString() || a.id?.toString() || '';
        valB = b.appointmentId?.toString() || b.id?.toString() || '';
      }
      
      // Handle date field specially
      if (sortField === 'date') {
        valA = a.date || a.dateTime || '';
        valB = b.date || b.dateTime || '';
        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Handle appointment_type field
      if (sortField === 'appointment_type') {
        valA = a.appointment_type || a.appointmentType || a.type || '';
        valB = b.appointment_type || b.appointmentType || b.type || '';
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [appointments, searchTerm, statusFilter, sortField, sortOrder, selectedDate]);

  // Derived state for the sidebar
  const viewingPatient = useMemo(() => 
    patients.find(p => p.patientId === viewingPatientId), 
  [patients, viewingPatientId]);

  const patientHistory = useMemo(() => 
    appointments
      .filter(a => a.patientId === viewingPatientId)
      .sort((a, b) => {
        const dateA = new Date(a.date || a.dateTime || 0).getTime();
        const dateB = new Date(b.date || b.dateTime || 0).getTime();
        return dateB - dateA;
      }),
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
    // Close if clicking the same appointment's status button
    if (statusMenu?.apt.appointmentId === apt.appointmentId) {
      setStatusMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 160; // Approximate menu width
    const menuHeight = 200; // Approximate menu height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate position with boundary checks
    let left = rect.left;
    let top = rect.bottom + 6;
    
    // Adjust if menu would go off right edge
    if (left + menuWidth > viewportWidth) {
      left = viewportWidth - menuWidth - 10;
    }
    
    // Adjust if menu would go off bottom edge (show above instead)
    if (top + menuHeight > viewportHeight) {
      top = rect.top - menuHeight - 6;
    }
    
    // Ensure menu doesn't go off left edge
    if (left < 10) {
      left = 10;
    }
    
    // Ensure menu doesn't go off top edge
    if (top < 10) {
      top = rect.bottom + 6;
    }
    
    setStatusMenu({
        apt,
        top,
        left
    });
  };

  // Submission Processor
  const processSubmission = async (values: any) => {
    setIsSubmitting(true);
    try {
      // Prepare data with correct field names for backend
      const submissionData = {
        ...values,
        date: values.date, // Use date field
        appointment_type: values.appointment_type || values.type, // Use appointment_type
        // Keep type for backward compatibility
        type: values.type || values.appointment_type,
      };
      
      if (editingAppointment) {
        const updated = await apiService.appointments.update({ ...editingAppointment, ...submissionData } as Appointment);
        // Normalize appointment data - ensure appointmentId is set
        const normalizedUpdated: Appointment = {
          ...updated,
          appointmentId: updated.appointmentId || updated.id?.toString() || editingAppointment.appointmentId || editingAppointment.id?.toString(),
          patientId: updated.patientId || editingAppointment.patientId,
          patientName: updated.patientName || editingAppointment.patientName,
        };
        dispatch(updateAppointment(normalizedUpdated));
        setEditingAppointment(null);
      } else {
        const created = await apiService.appointments.create(submissionData);

        // Normalize appointment data - ensure appointmentId is set and all required fields
        const appointmentIdStr = created.appointmentId?.toString() || created.id?.toString() || `APT-${Date.now()}`;
        const normalizedCreated: Appointment = {
          ...created,
          appointmentId: appointmentIdStr,
          id: created.id || (typeof created.appointmentId === 'number' ? created.appointmentId : parseInt(appointmentIdStr.replace('APT-', '')) || undefined),
          patientId: created.patientId || values.patientId || '',
          patientName: created.patientName || values.patientName || '',
          email: created.email || values.email || '',
          date: created.date || values.date || new Date().toISOString().split('T')[0],
          appointment_type: created.appointment_type || created.appointmentType || created.type || values.appointment_type || 'Consulting',
          type: created.type || created.appointment_type || created.appointmentType || values.type || 'Consulting',
          status: created.status || values.status || 'Pending',
          notes: created.notes || values.notes || '',
          diagnosis: created.diagnosis || values.diagnosis || '',
          prescription: created.prescription || values.prescription || '',
        };

        // Add to Redux store - this will automatically reflect on screen
        console.log('Adding appointment to Redux:', normalizedCreated);
        dispatch(addAppointment(normalizedCreated));

        // Reset pagination to show the new appointment (likely on first page)
        setCurrentPage(1);
      }

      setShowCreateModal(false);
      setShowEditModal(false);
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
      date: editingAppointment ? (editingAppointment.date || editingAppointment.date?.split('T')[0] || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
      appointment_type: editingAppointment?.appointment_type || editingAppointment?.appointmentType || editingAppointment?.type || 'Consulting',
      type: editingAppointment?.type || editingAppointment?.appointment_type || editingAppointment?.appointmentType || 'Consulting', // Keep for form compatibility
      status: editingAppointment?.status || 'Pending',
      notes: editingAppointment?.notes || '',
      diagnosis: editingAppointment?.diagnosis || '',
      prescription: editingAppointment?.prescription || ''
    },
    validationSchema: Yup.object({
      patientName: Yup.string().required('Patient Name is required'),
      email: Yup.string().email('Invalid email'),
      date: Yup.string().required('Date is required'),
      appointment_type: Yup.string().required('Appointment Type is required'),
      status: Yup.string().required('Status is required'),
      diagnosis: Yup.string().max(1000, 'Diagnosis must be less than 1000 characters').optional(),
      prescription: Yup.string().max(2000, 'Prescription must be less than 2000 characters').optional()
    }),
    onSubmit: async (values, { resetForm }) => {
       // If it's a new appointment, show confirmation first
       if (!editingAppointment) {
           setShowConfirmation(true);
           // We don't submit yet, confirmation modal does that via processSubmission
       } else {
           // Direct update for edits
           await processSubmission(values);
        resetForm();
       }
    }
  });

  // Patient Formik Config (Quick Create)
  const patientFormik = useFormik({
    initialValues: {
      name: '',
      email: '',
      mobileNumber: '',
      gender: 'Other' as 'Male' | 'Female' | 'Other',
      bloodGroup: '' as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
      city: '',
      state: '',
      address: '',
    },
    // Update available cities when state changes
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      mobileNumber: Yup.string().required('Phone is required'),
      gender: Yup.string().oneOf(['Male', 'Female', 'Other']).required('Gender is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      address: Yup.string(),
    }),
    onSubmit: async (values, { resetForm }) => {
      setIsCreatingPatient(true);
      try {
        // Create patient with all required fields
        const newPatient = await apiService.patients.create({
          ...values,
          bloodGroup: values.bloodGroup || undefined,
          address: values.address || 'Not provided',
          lastVisitDate: new Date().toISOString().split('T')[0],
          appointmentDate: '-',
          visits: []
        } as any);

        dispatch(addPatient(newPatient));
        
        // If the appointment modal is not open (e.g., started from "New Patient" button), open it
          if (!showCreateModal && !showEditModal) {
            setEditingAppointment(null);
            setShowCreateModal(true);
        }

        // Auto-select the new patient in the appointment form
        formik.setFieldValue('patientId', newPatient.patientId);
        formik.setFieldValue('patientName', newPatient.name);
        formik.setFieldValue('email', newPatient.email);
        setPatientSearchQuery(newPatient.name);
        
        setShowPatientModal(false);
        resetForm();
        setAvailableCities([]);
      } catch (error) {
        console.error("Failed to create patient", error);
        alert("Failed to create patient. Please try again.");
      } finally {
        setIsCreatingPatient(false);
      }
    }
  });

  // Update available cities when state changes in patient form
  useEffect(() => {
    if (patientFormik.values.state) {
      setAvailableCities(getCitiesByState(patientFormik.values.state));
    } else {
      setAvailableCities([]);
    }
  }, [patientFormik.values.state]);

  const handlePatientSelect = (patient: Patient) => {
      formik.setFieldValue('patientId', patient.patientId);
      formik.setFieldValue('patientName', patient.name);
      formik.setFieldValue('email', patient.email);
      setPatientSearchQuery(patient.name);
      setShowPatientDropdown(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Confirmed': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
        case 'Pending': return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
        case 'Completed': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
        case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
        default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
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
          <p className="text-gray-500">
            {selectedDate === getCurrentDate() 
              ? "Today's appointments" 
              : selectedDate 
              ? `Appointments for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
              : "All appointments"}
          </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => {
                  setShowPatientModal(true);
                  setAvailableCities([]);
                  patientFormik.resetForm();
                }}
                className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm font-medium flex items-center gap-2"
            >
                <UserPlus className="w-4 h-4" /> New Patient
            </button>
            <button 
              onClick={() => handleOpenCreateModal()}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 font-medium"
            >
              <Plus className="w-4 h-4" /> New Appointment
            </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
         {/* Search and Date Filter */}
         <div className="flex flex-col md:flex-row gap-3 w-full md:flex-1">
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

          {/* Enhanced Date Picker */}
          <div className="flex items-center gap-2">
            <CustomDatePicker
              selectedDate={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                setCurrentPage(1);
              }}
              placeholder="Select date"
            />

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSelectedDate(getCurrentDate());
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-xl border transition-all font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95 ${
                  selectedDate === getCurrentDate()
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title="Show today's appointments"
              >
                <Calendar className="w-4 h-4" />
                <span>Today</span>
              </button>
              
              {selectedDate && selectedDate !== getCurrentDate() && (
                <button
                  onClick={() => {
                    setSelectedDate('');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all font-medium text-sm flex items-center gap-1.5 shadow-sm hover:shadow-md active:scale-95"
                  title="Show all appointments"
                >
                  <X className="w-4 h-4" />
                  <span>All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           {/* Multi-Select Status Filter */}
           <div ref={statusFilterRef} className="relative">
             <button
               onClick={() => setShowStatusFilter(!showStatusFilter)}
              className={`px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none flex items-center gap-2 transition-colors hover:bg-gray-50 ${showStatusFilter ? 'border-blue-500 bg-blue-50' : ''
               }`}
             >
               <Filter className="w-4 h-4" />
               <span className="text-sm font-medium">
                 Status {statusFilter.length > 0 && `(${statusFilter.length})`}
               </span>
               <ChevronDown className={`w-4 h-4 transition-transform ${showStatusFilter ? 'rotate-180' : ''}`} />
             </button>
             
             {showStatusFilter && (
               <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[200px] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                 <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                   <span className="text-xs font-semibold text-gray-600">Filter by Status</span>
                   <div className="flex gap-1">
                     <button
                       onClick={selectAllStatuses}
                       disabled={isAllSelected}
                       className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                       All
                     </button>
                     <button
                       onClick={clearAllStatuses}
                       disabled={isNoneSelected}
                       className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                       Clear
                     </button>
                   </div>
                 </div>
                 <div className="py-1">
                   {allStatuses.map((status) => {
                     // When filter is empty, all are selected (show all)
                     const isSelected = statusFilter.length === 0 || statusFilter.includes(status);
                     const statusColors = {
                       'Confirmed': 'text-green-700 bg-green-50 border-green-200',
                       'Pending': 'text-orange-700 bg-orange-50 border-orange-200',
                       'Completed': 'text-blue-700 bg-blue-50 border-blue-200',
                       'Cancelled': 'text-red-700 bg-red-50 border-red-200'
                     };
                     return (
                       <label
                         key={status}
                         className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                       >
                         <div className="relative flex items-center justify-center flex-shrink-0">
                           <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={() => toggleStatus(status)}
                             className="w-4 h-4 border-2 border-gray-300 rounded cursor-pointer transition-all appearance-none
                               checked:bg-blue-600 checked:border-blue-600
                               focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none
                               hover:border-gray-400"
                             style={{
                               backgroundColor: isSelected ? 'rgb(37 99 235)' : 'white',
                               borderRadius: '4px'
                             }}
                           />
                           {isSelected && (
                             <Check className="absolute w-3 h-3 text-white pointer-events-none" style={{ left: '2px', top: '1px' }} strokeWidth={3} />
                           )}
                         </div>
                         <div className="flex items-center gap-2 flex-1">
                           <span className={`w-2 h-2 rounded-full ${getStatusDot(status)}`}></span>
                           <span className="text-sm text-gray-700 font-medium">{status}</span>
                         </div>
                         {isSelected && (
                           <div className="flex-shrink-0">
                             <Check className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                           </div>
                         )}
                       </label>
                     );
                   })}
                 </div>
                 {/* {statusFilter.length === 0 && (
                   <div className="px-3 py-2 text-xs text-gray-500 bg-yellow-50 border-t border-gray-100">
                     No status selected. Showing all appointments.
                   </div>
                 )} */}
               </div>
             )}
           </div>

          {/* Sort Field */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <select 
                value={sortField}
                onChange={(e) => handleSort(e.target.value as keyof Appointment)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
            >
                <option value="date">Date</option>
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
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('appointmentId')}>
                  <div className="flex items-center gap-2">
                    <span>Visit ID</span>
                    {sortField === 'appointmentId' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('patientName')}>
                  <div className="flex items-center gap-2">
                    <span>Patient</span>
                    {sortField === 'patientName' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Age</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('dateTime')}>
                  <div className="flex items-center gap-2">
                    <span>Date & Time</span>
                    {sortField === 'dateTime' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {sortField === 'status' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                  </div>
                </th>
                {/* <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span>Diagnosis</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-green-600" />
                    <span>Prescription</span>
                  </div>
                </th> */}
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <Pill className="w-4 h-4 text-green-600" />
                    <span>Medical Info</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedAppointments.length > 0 ? paginatedAppointments.map((apt, index) => (
                <tr key={apt.appointmentId} className="hover:bg-blue-50/50 transition-all duration-150 border-b border-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-blue-700">#{index + 1 + (currentPage - 1) * itemsPerPage}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {apt.appointmentId || apt.id?.toString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointmentDetails(apt);
                            setShowAppointmentDetailsModal(true);
                        }}
                        className="font-semibold text-gray-900 flex items-center gap-2 w-fit group cursor-pointer hover:text-blue-600 transition-colors"
                        title="View Full Details"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{apt.patientName}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{apt.email}</div>
                          {apt.patientId && (
                            <div className="text-[10px] text-blue-600 bg-blue-50 inline-block px-1.5 py-0.5 rounded-md mt-1 font-medium">
                              ID: {apt.patientId}
                            </div>
                          )}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {apt.patientId 
                        ? (patients.find(p => p.patientId === apt.patientId)?.gender || 'N/A')
                        : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {apt.patientId && patients.find(p => p.patientId === apt.patientId)?.age ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {patients.find(p => p.patientId === apt.patientId)?.age} {patients.find(p => p.patientId === apt.patientId)?.age === 1 ? 'year' : 'years'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <Calendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{new Date(apt.date || apt.dateTime || '').toLocaleDateString()}</div>
                          {(apt.dateTime || (apt.date && apt.date.includes('T'))) && (
                            <div className="text-xs text-gray-500">
                              {new Date(apt.dateTime || apt.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                        onClick={(e) => handleStatusClick(e, apt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all border-2 cursor-pointer hover:shadow-lg active:scale-95 ${getStatusColor(apt.status)} ${
                            statusMenu?.apt.appointmentId === apt.appointmentId ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg' : ''
                        }`}
                        title="Click to change status"
                    >
                        <span className={`w-2 h-2 rounded-full ${getStatusDot(apt.status)}`}></span>
                        <span>{apt.status}</span>
                        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform duration-200 ${statusMenu?.apt.appointmentId === apt.appointmentId ? 'rotate-180' : ''}`} />
                    </button>
                  </td>
                  {/* <td className="px-6 py-4">
                    {apt.diagnosis ? (
                      <div 
                        onClick={() => handleOpenEditModal(apt)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors group"
                        title="Click to edit appointment"
                      >
                        <div className="p-1.5 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{apt.diagnosis}</span>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleOpenEditModal(apt)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors group"
                        title="Click to add diagnosis"
                      >
                        <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <Stethoscope className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <span className="text-sm text-gray-400 italic group-hover:text-blue-600 transition-colors">Click to add</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {apt.prescription ? (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          const selectedPresc = prescriptions.find(p => p.name === apt.prescription);
                          setSelectedPrescriptionDetails({
                            prescription: apt.prescription,
                            count: selectedPresc?.count,
                            timing: selectedPresc?.timing,
                            appointment: apt
                          });
                          setShowPrescriptionDetailsModal(true);
                        }}
                        className="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-2 rounded-lg transition-colors group"
                        title="Click to view prescription details"
                      >
                        <div className="p-1.5 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                          <Pill className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors">{apt.prescription}</span>
                      </div>
                    ) : (
                      <div 
                        onClick={() => handleOpenEditModal(apt)}
                        className="flex items-center gap-2 cursor-pointer hover:bg-green-50 p-2 rounded-lg transition-colors group"
                        title="Click to add prescription"
                      >
                        <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-green-100 transition-colors">
                          <Pill className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-600 transition-colors" />
                        </div>
                        <span className="text-sm text-gray-400 italic group-hover:text-green-600 transition-colors">Click to add</span>
                      </div>
                    )}
                  </td> */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center justify-center gap-2">
                      {/* Diagnosis and Prescription */}
                      <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppointmentDetails(apt);
                                setShowAppointmentDetailsModal(true);
                             }}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all hover:shadow-md"
                            title="View Full Details"
                        >
                        <FileText className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(apt);
                             }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-md"
                            title="Edit Appointment"
                        >
                        <Edit className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No appointments found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or create a new appointment</p>
                      </div>
                    </td>
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
                                        {new Date(histApt.date || histApt.dateTime || '').toLocaleDateString()}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(histApt.status)}`}>
                                        {histApt.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${(histApt.appointment_type || histApt.appointmentType || histApt.type) === 'Video'
                                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                     }`}>
                                        {(histApt.appointment_type || histApt.appointmentType || histApt.type) === 'Video' ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                                        {histApt.appointment_type || histApt.appointmentType || histApt.type}
                                     </span>
                                </div>
                                {(histApt.dateTime || (histApt.date && histApt.date.includes('T'))) && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                        {new Date(histApt.dateTime || histApt.date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                                {histApt.notes && (
                                    <div className="mt-3 pt-3 border-t border-gray-50">
                                        <p className="text-xs text-gray-400 italic">"{histApt.notes}"</p>
                                    </div>
                                )}
                                {(histApt.diagnosis || histApt.prescription) && (
                                    <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                                        {histApt.diagnosis && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Stethoscope className="w-3 h-3 text-blue-600" />
                                                    <span className="text-xs font-semibold text-gray-700">Diagnosis:</span>
                                                </div>
                                                <p className="text-xs text-gray-600 pl-4">{histApt.diagnosis}</p>
                                            </div>
                                        )}
                                        {histApt.prescription && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Pill className="w-3 h-3 text-green-600" />
                                                    <span className="text-xs font-semibold text-gray-700">Prescription:</span>
                                                </div>
                                                <p className="text-xs text-gray-600 pl-4 whitespace-pre-wrap">{histApt.prescription}</p>
                                            </div>
                                        )}
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
                    {/* {viewingPatient?.visits && viewingPatient.visits.length > 0 && (
                        <div className="mt-8">
                             <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Clinical Records
                            </h3>
                            <div className="space-y-4">
                                {[...viewingPatient.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{visit.date}</span>
                                        </div>
                                        {visit.diagnosis && (
                                            <div className="mb-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                                                    <span className="text-xs font-semibold text-gray-700">Diagnosis</span>
                                                </div>
                                                <p className="text-sm text-gray-800 pl-5">{visit.diagnosis}</p>
                                            </div>
                                        )}
                                        {visit.prescription && (
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Pill className="w-3.5 h-3.5 text-green-600" />
                                                    <span className="text-xs font-semibold text-gray-700">Prescription</span>
                                                </div>
                                                <p className="text-sm text-gray-800 pl-5 whitespace-pre-wrap">{visit.prescription}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )} */}
                </div>
                
                {/* Footer Action */}
                <div className="p-4 bg-white border-t border-gray-100">
                     <p className="text-center text-xs text-gray-400">Viewing Patient ID: {viewingPatientId}</p>
                </div>
            </div>
        </>
      )}

      {/* Floating Status Menu */}
      {statusMenu && (
        <>
            <div 
                className="fixed inset-0 z-40" 
                onClick={(e) => {
                    e.stopPropagation();
                    setStatusMenu(null);
                }}
            ></div>
            <div 
                className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden w-44 animate-in fade-in zoom-in-95 duration-150"
                style={{ top: `${statusMenu.top}px`, left: `${statusMenu.left}px` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-600 px-2">Change Status</span>
                </div>
                <div className="py-1">
                    {['Confirmed', 'Pending', 'Completed', 'Cancelled'].map(status => {
                        const isSelected = statusMenu.apt.status === status;
                        const statusColors = {
                            'Confirmed': 'hover:bg-green-50',
                            'Pending': 'hover:bg-orange-50',
                            'Completed': 'hover:bg-blue-50',
                            'Cancelled': 'hover:bg-red-50'
                        };
                        return (
                    <button
                        key={status}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isSelected) {
                            handleInlineStatusChange(statusMenu.apt, status);
                                    }
                            setStatusMenu(null);
                        }}
                                className={`w-full text-left px-4 py-2.5 text-xs font-medium flex items-center gap-2.5 transition-colors ${
                                    isSelected 
                                        ? 'bg-blue-50 text-blue-700' 
                                        : 'text-gray-700 ' + (statusColors[status as keyof typeof statusColors] || 'hover:bg-gray-50')
                                }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${getStatusDot(status)}`}></span>
                                <span className="flex-1">{status}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                        );
                    })}
                </div>
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
              Are you sure you want to schedule this appointment for <br />
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
                disabled={isSubmitting}
                onClick={async () => {
                  await processSubmission(formik.values);
                  formik.resetForm();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
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
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Gender <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="gender"
                                className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={patientFormik.values.gender}
                                onChange={patientFormik.handleChange}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                            {patientFormik.touched.gender && patientFormik.errors.gender && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.gender}</div>}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                Blood Group
                            </label>
                            <select
                                name="bloodGroup"
                                className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={patientFormik.values.bloodGroup}
                                onChange={patientFormik.handleChange}
                            >
                                <option value="">Select</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>
                     </div>
                     <div>
                        <div className="mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                                State <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <SearchableSelect
                            options={indiaStates}
                            value={patientFormik.values.state}
                            onChange={(value) => {
                              patientFormik.setFieldValue('state', value);
                              patientFormik.setFieldValue('city', ''); // Reset city when state changes
                              setAvailableCities(getCitiesByState(value));
                            }}
                            onBlur={() => patientFormik.setFieldTouched('state', true)}
                            placeholder="Select State"
                            error={patientFormik.touched.state && !!patientFormik.errors.state}
                            className="text-xs"
                        />
                        {patientFormik.touched.state && patientFormik.errors.state && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.state}</div>}
                     </div>
                     <div>
                        <div className="mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                                City <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <SearchableSelect
                            options={availableCities}
                            value={patientFormik.values.city}
                            onChange={(value) => patientFormik.setFieldValue('city', value)}
                            onBlur={() => patientFormik.setFieldTouched('city', true)}
                            placeholder={patientFormik.values.state ? 'Select City' : 'Select State First'}
                            disabled={!patientFormik.values.state}
                            error={patientFormik.touched.city && !!patientFormik.errors.city}
                            className="text-xs"
                        />
                        {patientFormik.touched.city && patientFormik.errors.city && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.city}</div>}
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address (Optional)</label>
                        <input 
                            name="address"
                            type="text" 
                            placeholder="123 Main St"
                            className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            value={patientFormik.values.address}
                            onChange={patientFormik.handleChange}
                        />
                        {patientFormik.touched.address && patientFormik.errors.address && <div className="text-red-500 text-xs mt-1">{patientFormik.errors.address}</div>}
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

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] overflow-hidden">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">New Appointment</h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    Schedule a new appointment for your patient
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={formik.handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-gray-50">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* Patient Information Section - Hidden when status is Confirmed or Cancelled */}
                {(formik.values.status as string) !== 'Confirmed' && (formik.values.status as string) !== 'Cancelled' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                    </div>
              
              {/* Patient Selection Find/Search */}
                    <div ref={searchContainerRef} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        Find Existing Patient
                      </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={patientSearchQuery}
                            onChange={(e) => {
                                setPatientSearchQuery(e.target.value);
                                setShowPatientDropdown(true);
                            }}
                            onFocus={() => setShowPatientDropdown(true)}
                        />
                        {showPatientDropdown && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map(p => (
                                        <div 
                                            key={p.patientId} 
                                            onClick={() => handlePatientSelect(p)}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                        >
                                    <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{p.mobileNumber} • {p.email}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                  No patients found. Click + to create new patient.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                          setShowPatientModal(true);
                          setAvailableCities([]);
                          patientFormik.resetForm();
                        }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl border border-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                        title="Create New Patient"
                    >
                        <Plus className="w-5 h-5" />
                          <span className="hidden sm:inline">New</span>
                    </button>
                </div>
              </div>

                    <div className="space-y-4">
              <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Patient Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input 
                  name="patientName"
                  type="text" 
                            placeholder="Enter patient full name"
                            readOnly={!!editingAppointment}
                            className={`w-full ${editingAppointment ? 'bg-gray-100 text-gray-700 border-2 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-900 border border-gray-300'} ${formik.touched.patientName && formik.errors.patientName ? 'border-red-500 bg-red-50' : ''} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                  value={formik.values.patientName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                        </div>
                 {formik.touched.patientName && formik.errors.patientName ? (
                          <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {formik.errors.patientName}
                          </div>
                ) : null}
              </div>

                      {/* Patient ID - Read Only (Show when patient is selected) */}
                      {formik.values.patientId && (
                  <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            Patient ID
                          </label>
                          <div className="relative">
                    <input 
                      name="patientId"
                      type="text" 
                      value={formik.values.patientId}
                      readOnly
                              className="w-full bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-xl px-4 py-3 font-semibold focus:outline-none cursor-not-allowed"
                    />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">Read Only</span>
                  </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <input 
                      name="email"
                      type="email" 
                      placeholder="patient@example.com"
                      readOnly={!!editingAppointment}
                              className={`w-full ${editingAppointment ? 'bg-gray-100 text-gray-700 border-2 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-900 border border-gray-300'} ${formik.touched.email && formik.errors.email ? 'border-red-500 bg-red-50' : ''} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                          </div>
                    {formik.touched.email && formik.errors.email ? (
                            <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                              <X className="w-3 h-3" />
                              {formik.errors.email}
                            </div>
                    ) : null}
                  </div>
               </div>
                    </div>
                  </div>
                )}

                {/* Patient Info Display Only - Shown when status is Confirmed */}
                {(formik.values.status as string) === 'Confirmed' && formik.values.patientName && (
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="w-5 h-5 text-blue-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                      <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div>
                        <span className="text-gray-600 font-medium">Name:</span>
                        <p className="text-gray-900 font-semibold mt-1">{formik.values.patientName}</p>
                      </div>
                      {formik.values.email && (
                        <div>
                          <span className="text-gray-600 font-medium">Email:</span>
                          <p className="text-gray-900 font-semibold mt-1">{formik.values.email}</p>
                        </div>
                      )}
                      {formik.values.patientId && (
                        <div>
                          <span className="text-gray-600 font-medium">Patient ID:</span>
                          <p className="text-gray-900 font-semibold mt-1">{formik.values.patientId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Appointment Details Section - Hidden when status is Confirmed */}
                {(formik.values.status as string) !== 'Confirmed' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <input 
                    name="date"
                    type="date" 
                            className={`w-full bg-white text-gray-900 border ${formik.touched.date && formik.errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer`}
                    value={formik.values.date}
                    onChange={(e) => {
                      formik.setFieldValue('date', e.target.value);
                      formik.setFieldValue('type', formik.values.appointment_type || formik.values.type || 'Consulting');
                    }}
                    onBlur={formik.handleBlur}
                  />
                        </div>
                   {formik.touched.date && formik.errors.date ? (
                          <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {formik.errors.date}
                          </div>
                    ) : null}
                </div>
                <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Appointment Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          {(formik.values.appointment_type || formik.values.type) === 'Video' ? (
                            <Video className="absolute left-3 top-3.5 w-4 h-4 text-purple-500 pointer-events-none z-10" />
                          ) : (
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-blue-500 pointer-events-none z-10" />
                          )}
                          <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <select 
                    name="appointment_type"
                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl pl-10 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formik.values.appointment_type || formik.values.type}
                    onChange={(e) => {
                      formik.setFieldValue('appointment_type', e.target.value);
                      formik.setFieldValue('type', e.target.value);
                    }}
                    onBlur={formik.handleBlur}
                  >
                    <option value="Consulting">Consulting</option>
                    <option value="Video">Video</option>
                  </select>
                </div>
              </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                 <select 
                    name="status"
                          className={`w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none ${(formik.values.status as string) === 'Confirmed' ? 'border-green-300 bg-green-50' : (formik.values.status as string) === 'Pending' ? 'border-orange-300 bg-orange-50' : (formik.values.status as string) === 'Completed' ? 'border-blue-300 bg-blue-50' : (formik.values.status as string) === 'Cancelled' ? 'border-red-300 bg-red-50' : ''}`}
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
                    </div>
                  </div>
                )}

                {/* Appointment Info Display Only - Shown when status is Confirmed */}
                {(formik.values.status as string) === 'Confirmed' && (
                  <div className="bg-purple-50 rounded-2xl p-5 border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                        <span className="text-gray-600 font-medium">Date:</span>
                        <p className="text-gray-900 font-semibold mt-1">{new Date(formik.values.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Type:</span>
                        <p className="text-gray-900 font-semibold mt-1">{formik.values.appointment_type || formik.values.type || 'Consulting'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="ml-2 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Selector - Always visible for changing status */}
                {(formik.values.status as string) === 'Confirmed' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Change Status
                    </label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                 <select 
                    name="status"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
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
                    <p className="text-xs text-gray-500 mt-2">Change status to edit patient and appointment details</p>
                  </div>
                )}

                {/* Status Display Only - Shown when status is Completed */}
                {(formik.values.status as string) === 'Completed' && (
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Status</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">Completed</span>
                      <p className="text-sm text-gray-600">This appointment is completed and cannot be edited</p>
                    </div>
                  </div>
                )}

                {/* Medical Information Section - Show when status is Confirmed or Completed */}
                {((formik.values.status as string) === 'Confirmed' || (formik.values.status as string) === 'Completed') ? (
                  (formik.values.status as string) === 'Completed' ? (
                    /* Read-only view for Completed appointments */
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-emerald-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                        <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Completed</span>
                      </div>
                      <div className="space-y-4">
                        {formik.values.diagnosis && (
                          <div>
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                              <Stethoscope className="w-4 h-4 text-blue-600" />
                              Diagnosis:
                            </span>
                            <p className="text-gray-900 font-semibold ml-6">{formik.values.diagnosis}</p>
                          </div>
                        )}
                        {formik.values.prescription && (() => {
                          const selectedPresc = prescriptions.find(p => p.name === formik.values.prescription);
                          return (
                            <div>
                              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <Pill className="w-4 h-4 text-green-600" />
                                Prescription:
                              </span>
                              <div className="ml-6 space-y-2">
                                <p className="text-gray-900 font-semibold">{formik.values.prescription}</p>
                                {selectedPresc && (selectedPresc.count || selectedPresc.timing) && (
                                  <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-xl">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                      {selectedPresc.count && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-700">Count:</span>
                                          <span className="text-gray-900">{selectedPresc.count}</span>
                                        </div>
                                      )}
                                      {selectedPresc.timing && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-700">Timing:</span>
                                          <span className="text-gray-900">{selectedPresc.timing}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {!formik.values.diagnosis && !formik.values.prescription && (
                          <p className="text-gray-500 text-sm italic">No medical information recorded</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Editable form for Confirmed appointments - Show Diagnosis and Prescription */
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                        <span className="ml-auto px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Diagnosis Field */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                            Diagnosis
                          </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                    name="diagnosis"
                              className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.diagnosis && formik.errors.diagnosis ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none`}
                              value={formik.values.diagnosis || ''}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                formik.setFieldValue('diagnosis', selectedValue);
                                const selectedDiag = diagnoses.find(d => d.name === selectedValue);
                                if (selectedDiag) {
                                  setSelectedDiagnosisId(selectedDiag.id);
                                } else {
                                  setSelectedDiagnosisId('');
                                }
                                formik.setFieldValue('prescription', '');
                              }}
                    onBlur={formik.handleBlur}
                            >
                              <option value="">Select Diagnosis</option>
                              {diagnoses.map((diag) => (
                                <option key={diag.id} value={diag.name}>
                                  {diag.name} {diag.description ? `- ${diag.description}` : ''}
                                </option>
                              ))}
                            </select>
                    </div>
                          <button
                            type="button"
                            onClick={() => setShowDiagnosisModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl border border-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                            title="Add New Diagnosis"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                </div>
                {formik.touched.diagnosis && formik.errors.diagnosis && (
                  <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {formik.errors.diagnosis}
                  </div>
                )}
              </div>

              {/* Prescription Field */}
              <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-green-600" />
                          Prescription
                          {selectedDiagnosisId && (
                            <span className="text-xs text-gray-500 font-normal ml-2 px-2 py-0.5 bg-blue-50 rounded-md">
                              for {diagnoses.find(d => d.id === selectedDiagnosisId)?.name || 'selected diagnosis'}
                            </span>
                          )}
                </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                    name="prescription"
                              className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.prescription && formik.errors.prescription ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed`}
                              value={formik.values.prescription || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                              disabled={!selectedDiagnosisId && !formik.values.diagnosis}
                            >
                              <option value="">
                                {selectedDiagnosisId || formik.values.diagnosis 
                                  ? 'Select Prescription' 
                                  : 'Select Diagnosis first'}
                              </option>
                              {prescriptions
                                .filter(p => !selectedDiagnosisId || p.diagnosis_id === selectedDiagnosisId)
                                .map((presc) => {
                                  const details = [];
                                  if (presc.count) details.push(presc.count);
                                  if (presc.timing) details.push(presc.timing);
                                  const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
                                  return (
                                    <option key={presc.id} value={presc.name}>
                                      {presc.name}{detailStr}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedDiagnosisId && !formik.values.diagnosis) {
                                alert('Please select a diagnosis first');
                                return;
                              }
                              if (!selectedDiagnosisId && formik.values.diagnosis) {
                                const diag = diagnoses.find(d => d.name === formik.values.diagnosis);
                                if (diag) {
                                  setSelectedDiagnosisId(diag.id);
                                }
                              }
                              setShowPrescriptionModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl border border-green-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add New Prescription"
                            disabled={!selectedDiagnosisId && !formik.values.diagnosis}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Display selected prescription details */}
                        {formik.values.prescription && (() => {
                          const selectedPresc = prescriptions.find(p => p.name === formik.values.prescription);
                          if (selectedPresc && (selectedPresc.count || selectedPresc.timing)) {
                            return (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex flex-wrap gap-4 text-sm">
                                  {selectedPresc.count && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-700">Count:</span>
                                      <span className="text-gray-900">{selectedPresc.count}</span>
                    </div>
                  )}
                                  {selectedPresc.timing && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-700">Timing:</span>
                                      <span className="text-gray-900">{selectedPresc.timing}</span>
                </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                {formik.touched.prescription && formik.errors.prescription && (
                  <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {formik.errors.prescription}
                  </div>
                )}
              </div>
              </div>
                    </div>
                  )
                ) : (
                  /* No medical info for Pending or Cancelled */
                  (formik.values.status as string) === 'Pending' || (formik.values.status as string) === 'Cancelled' ? (
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-gray-500 text-sm italic text-center py-4">
                          {(formik.values.status as string) === 'Pending' 
                            ? 'Medical information will be available after appointment is confirmed'
                            : 'Medical information is not available for cancelled appointments'}
                        </p>
                      </div>
                    </div>
                  ) : null
                )}

                {/* Status Selector - Below Medical Information */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
                  </div>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <select 
                      name="status"
                      className={`w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none ${(formik.values.status as string) === 'Confirmed' ? 'border-green-300 bg-green-50' : (formik.values.status as string) === 'Pending' ? 'border-orange-300 bg-orange-50' : (formik.values.status as string) === 'Completed' ? 'border-blue-300 bg-blue-50' : (formik.values.status as string) === 'Cancelled' ? 'border-red-300 bg-red-50' : ''}`}
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {((formik.values.status as string) === 'Pending') && 'Appointment is pending confirmation'}
                    {((formik.values.status as string) === 'Confirmed') && 'Appointment is confirmed. You can now add diagnosis and prescription.'}
                    {((formik.values.status as string) === 'Completed') && 'Appointment is completed. All information is read-only.'}
                    {((formik.values.status as string) === 'Cancelled') && 'Appointment has been cancelled.'}
                  </p>
                </div>

                {/* Additional Notes Section */}
                {(formik.values.status as string) === 'Completed' ? (
                  /* Read-only view for Completed appointments */
                  formik.values.notes && (
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <FileText className="w-5 h-5 text-amber-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap">{formik.values.notes}</p>
                    </div>
                  )
                ) : (
                  /* Editable form for non-Completed appointments */
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                    </div>
                <textarea
                  name="notes"
                      className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                      rows={4}
                      placeholder="Add any additional notes, instructions, or comments about this appointment..."
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
               </div>
                )}
              </div>
              {/* Enhanced Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 flex-shrink-0">
                {(formik.values.status as string) === 'Completed' ? (
                  /* Read-only footer for Completed appointments */
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>This appointment is completed and cannot be edited</span>
                    </div>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                      className="px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-lg shadow-gray-500/30 flex items-center justify-center gap-2 font-semibold"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  /* Editable footer for non-Completed appointments */
                  <>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-3 text-gray-700 hover:bg-white border border-gray-300 rounded-xl transition-all font-medium hover:shadow-md order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-95 order-1 sm:order-2"
                >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Schedule Appointment
                        </>
                      )}
                </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-4 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[95vh] overflow-hidden">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Edit className="w-6 h-6 text-white" />
                </div>
              <div>
                  <h2 className="text-2xl font-bold text-white">Edit Appointment</h2>
                  <p className="text-purple-100 text-sm mt-0.5">
                    Update appointment details
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={formik.handleSubmit} className="flex flex-col flex-1 overflow-hidden bg-gray-50">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* Patient Information Section - Hidden when status is Confirmed */}
                {(formik.values.status as string) !== 'Confirmed' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                    </div>
              
              {/* Patient Selection Find/Search */}
                    <div ref={searchContainerRef} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        Find Existing Patient
                      </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                          <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            value={patientSearchQuery}
                            onChange={(e) => {
                                setPatientSearchQuery(e.target.value);
                                setShowPatientDropdown(true);
                            }}
                            onFocus={() => setShowPatientDropdown(true)}
                        />
                        {showPatientDropdown && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-50">
                                {filteredPatients.length > 0 ? (
                                    filteredPatients.map(p => (
                                        <div 
                                            key={p.patientId} 
                                            onClick={() => handlePatientSelect(p)}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                                        >
                                    <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{p.mobileNumber} • {p.email}</p>
                  </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-gray-400 text-sm">
                                  No patients found. Click + to create new patient.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button 
                        type="button"
                        onClick={() => {
                          setShowPatientModal(true);
                          setAvailableCities([]);
                          patientFormik.resetForm();
                        }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl border border-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                        title="Create New Patient"
                    >
                        <Plus className="w-5 h-5" />
                          <span className="hidden sm:inline">New</span>
                    </button>
                </div>
              </div>

                    <div className="space-y-4">
              <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Patient Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                          <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input 
                  name="patientName"
                  type="text" 
                            placeholder="Enter patient full name"
                            readOnly={!!editingAppointment}
                            className={`w-full ${editingAppointment ? 'bg-gray-100 text-gray-700 border-2 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-900 border border-gray-300'} ${formik.touched.patientName && formik.errors.patientName ? 'border-red-500 bg-red-50' : ''} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                  value={formik.values.patientName}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                        </div>
                 {formik.touched.patientName && formik.errors.patientName ? (
                          <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {formik.errors.patientName}
                          </div>
                ) : null}
              </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Patient ID</label>
                    <input 
                      name="patientId"
                      type="text" 
                            placeholder="Auto-filled"
                            className="w-full bg-gray-50 text-gray-500 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none cursor-not-allowed"
                      value={formik.values.patientId}
                      readOnly
                    />
                  </div>
                   <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <input 
                      name="email"
                      type="email" 
                      placeholder="patient@example.com"
                      readOnly={!!editingAppointment}
                              className={`w-full ${editingAppointment ? 'bg-gray-100 text-gray-700 border-2 border-gray-300 cursor-not-allowed' : 'bg-white text-gray-900 border border-gray-300'} ${formik.touched.email && formik.errors.email ? 'border-red-500 bg-red-50' : ''} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                          </div>
                    {formik.touched.email && formik.errors.email ? (
                            <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                              <X className="w-3 h-3" />
                              {formik.errors.email}
                            </div>
                    ) : null}
                  </div>
               </div>
                    </div>
                  </div>
                )}

                {/* Patient Info Display Only - Shown when status is Confirmed */}
                {(formik.values.status as string) === 'Confirmed' && formik.values.patientName && (
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="w-5 h-5 text-blue-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
                      <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                 <div>
                        <span className="text-gray-600 font-medium">Name:</span>
                        <p className="text-gray-900 font-semibold mt-1">{formik.values.patientName}</p>
                      </div>
                      {formik.values.email && (
                        <div>
                          <span className="text-gray-600 font-medium">Email:</span>
                          <p className="text-gray-900 font-semibold mt-1">{formik.values.email}</p>
                        </div>
                      )}
                      {formik.values.patientId && (
                        <div>
                          <span className="text-gray-600 font-medium">Patient ID:</span>
                          <p className="text-gray-900 font-semibold mt-1">{formik.values.patientId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Appointment Details Section - Hidden when status is Confirmed */}
                {(formik.values.status as string) !== 'Confirmed' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <input 
                    name="date"
                    type="date" 
                            className={`w-full bg-white text-gray-900 border ${formik.touched.date && formik.errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer`}
                    value={formik.values.date}
                    onChange={(e) => {
                      formik.setFieldValue('date', e.target.value);
                      formik.setFieldValue('type', formik.values.appointment_type || formik.values.type || 'Consulting');
                    }}
                    onBlur={formik.handleBlur}
                  />
                        </div>
                   {formik.touched.date && formik.errors.date ? (
                          <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                            <X className="w-3 h-3" />
                            {formik.errors.date}
                          </div>
                    ) : null}
                </div>
                <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Appointment Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          {(formik.values.appointment_type || formik.values.type) === 'Video' ? (
                            <Video className="absolute left-3 top-3.5 w-4 h-4 text-purple-500 pointer-events-none z-10" />
                          ) : (
                            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-blue-500 pointer-events-none z-10" />
                          )}
                          <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <select 
                    name="appointment_type"
                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl pl-10 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                    value={formik.values.appointment_type || formik.values.type}
                    onChange={(e) => {
                      formik.setFieldValue('appointment_type', e.target.value);
                      formik.setFieldValue('type', e.target.value);
                    }}
                    onBlur={formik.handleBlur}
                  >
                    <option value="Consulting">Consulting</option>
                    <option value="Video">Video</option>
                  </select>
                </div>
              </div>
                    </div>
                    
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                 <select 
                    name="status"
                          className={`w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none ${(formik.values.status as string) === 'Confirmed' ? 'border-green-300 bg-green-50' : (formik.values.status as string) === 'Pending' ? 'border-orange-300 bg-orange-50' : (formik.values.status as string) === 'Completed' ? 'border-blue-300 bg-blue-50' : (formik.values.status as string) === 'Cancelled' ? 'border-red-300 bg-red-50' : ''}`}
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
                    </div>
                  </div>
                )}

                {/* Appointment Info Display Only - Shown when status is Confirmed */}
                {(formik.values.status as string) === 'Confirmed' && (
                  <div className="bg-purple-50 rounded-2xl p-5 border border-purple-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-purple-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                        <span className="text-gray-600 font-medium">Date:</span>
                        <p className="text-gray-900 font-semibold mt-1">{new Date(formik.values.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Type:</span>
                        <p className="text-gray-900 font-semibold mt-1">{formik.values.appointment_type || formik.values.type || 'Consulting'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Status:</span>
                        <span className="ml-2 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Selector - Always visible for changing status */}
                {(formik.values.status as string) === 'Confirmed' && (
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Change Status
                    </label>
                    <div className="relative">
                      <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <select
                        name="status"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none"
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
                    <p className="text-xs text-gray-500 mt-2">Change status to edit patient and appointment details</p>
                  </div>
                )}

                {/* Status Display Only - Shown when status is Completed */}
                {(formik.values.status as string) === 'Completed' && (
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-700" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Appointment Status</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">Completed</span>
                      <p className="text-sm text-gray-600">This appointment is completed and cannot be edited</p>
                    </div>
                  </div>
                )}

                {/* Medical Information Section - Show when status is Confirmed or Completed */}
                {((formik.values.status as string) === 'Confirmed' || (formik.values.status as string) === 'Completed') ? (
                  (formik.values.status as string) === 'Completed' ? (
                    /* Read-only view for Completed appointments */
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-emerald-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                        <span className="ml-auto px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">Completed</span>
                      </div>
                      <div className="space-y-4">
                        {formik.values.diagnosis && (
                          <div>
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                              <Stethoscope className="w-4 h-4 text-blue-600" />
                              Diagnosis:
                            </span>
                            <p className="text-gray-900 font-semibold ml-6">{formik.values.diagnosis}</p>
                          </div>
                        )}
                        {formik.values.prescription && (() => {
                          const selectedPresc = prescriptions.find(p => p.name === formik.values.prescription);
                          return (
                            <div>
                              <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <Pill className="w-4 h-4 text-green-600" />
                                Prescription:
                              </span>
                              <div className="ml-6 space-y-2">
                                <p className="text-gray-900 font-semibold">{formik.values.prescription}</p>
                                {selectedPresc && (selectedPresc.count || selectedPresc.timing) && (
                                  <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-xl">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                      {selectedPresc.count && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-700">Count:</span>
                                          <span className="text-gray-900">{selectedPresc.count}</span>
                                        </div>
                                      )}
                                      {selectedPresc.timing && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-700">Timing:</span>
                                          <span className="text-gray-900">{selectedPresc.timing}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {!formik.values.diagnosis && !formik.values.prescription && (
                          <p className="text-gray-500 text-sm italic">No medical information recorded</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Editable form for Confirmed appointments - Show Diagnosis and Prescription */
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                        <span className="ml-auto px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full">Confirmed</span>
                      </div>
                    
                    <div className="space-y-4">
                      {/* Diagnosis Field */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          Diagnosis
                </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                    name="diagnosis"
                              className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.diagnosis && formik.errors.diagnosis ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none`}
                              value={formik.values.diagnosis || ''}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                formik.setFieldValue('diagnosis', selectedValue);
                                const selectedDiag = diagnoses.find(d => d.name === selectedValue);
                                if (selectedDiag) {
                                  setSelectedDiagnosisId(selectedDiag.id);
                                } else {
                                  setSelectedDiagnosisId('');
                                }
                                formik.setFieldValue('prescription', '');
                              }}
                    onBlur={formik.handleBlur}
                            >
                              <option value="">Select Diagnosis</option>
                              {diagnoses.map((diag) => (
                                <option key={diag.id} value={diag.name}>
                                  {diag.name} {diag.description ? `- ${diag.description}` : ''}
                                </option>
                              ))}
                            </select>
                    </div>
                          <button
                            type="button"
                            onClick={() => setShowDiagnosisModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl border border-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                            title="Add New Diagnosis"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                </div>
                {formik.touched.diagnosis && formik.errors.diagnosis && (
                  <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {formik.errors.diagnosis}
                  </div>
                )}
              </div>

              {/* Prescription Field */}
              <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-green-600" />
                          Prescription
                          {selectedDiagnosisId && (
                            <span className="text-xs text-gray-500 font-normal ml-2 px-2 py-0.5 bg-blue-50 rounded-md">
                              for {diagnoses.find(d => d.id === selectedDiagnosisId)?.name || 'selected diagnosis'}
                            </span>
                          )}
                </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                    name="prescription"
                              className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.prescription && formik.errors.prescription ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed`}
                              value={formik.values.prescription || ''}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                              disabled={!selectedDiagnosisId && !formik.values.diagnosis}
                            >
                              <option value="">
                                {selectedDiagnosisId || formik.values.diagnosis 
                                  ? 'Select Prescription' 
                                  : 'Select Diagnosis first'}
                              </option>
                              {prescriptions
                                .filter(p => !selectedDiagnosisId || p.diagnosis_id === selectedDiagnosisId)
                                .map((presc) => {
                                  const details = [];
                                  if (presc.count) details.push(presc.count);
                                  if (presc.timing) details.push(presc.timing);
                                  const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';
                                  return (
                                    <option key={presc.id} value={presc.name}>
                                      {presc.name}{detailStr}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedDiagnosisId && !formik.values.diagnosis) {
                                alert('Please select a diagnosis first');
                                return;
                              }
                              if (!selectedDiagnosisId && formik.values.diagnosis) {
                                const diag = diagnoses.find(d => d.name === formik.values.diagnosis);
                                if (diag) {
                                  setSelectedDiagnosisId(diag.id);
                                }
                              }
                              setShowPrescriptionModal(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl border border-green-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add New Prescription"
                            disabled={!selectedDiagnosisId && !formik.values.diagnosis}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Display selected prescription details */}
                        {formik.values.prescription && (() => {
                          const selectedPresc = prescriptions.find(p => p.name === formik.values.prescription);
                          if (selectedPresc && (selectedPresc.count || selectedPresc.timing)) {
                            return (
                              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                                <div className="flex flex-wrap gap-4 text-sm">
                                  {selectedPresc.count && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-700">Count:</span>
                                      <span className="text-gray-900">{selectedPresc.count}</span>
                    </div>
                  )}
                                  {selectedPresc.timing && (
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-700">Timing:</span>
                                      <span className="text-gray-900">{selectedPresc.timing}</span>
                </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                {formik.touched.prescription && formik.errors.prescription && (
                  <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {formik.errors.prescription}
                  </div>
                )}
              </div>
              </div>
                    </div>
                  )
                ) : (
                  /* No medical info for Pending or Cancelled */
                  (formik.values.status as string) === 'Pending' || (formik.values.status as string) === 'Cancelled' ? (
                    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Stethoscope className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Medical Information</h3>
                      </div>
                      <div className="space-y-4">
                        <p className="text-gray-500 text-sm italic text-center py-4">
                          {(formik.values.status as string) === 'Pending' 
                            ? 'Medical information will be available after appointment is confirmed'
                            : 'Medical information is not available for cancelled appointments'}
                        </p>
                      </div>
                    </div>
                  ) : null
                )}

                {/* Status Selector - Below Medical Information */}
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
                  </div>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <select 
                      name="status"
                      className={`w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer appearance-none ${(formik.values.status as string) === 'Confirmed' ? 'border-green-300 bg-green-50' : (formik.values.status as string) === 'Pending' ? 'border-orange-300 bg-orange-50' : (formik.values.status as string) === 'Completed' ? 'border-blue-300 bg-blue-50' : (formik.values.status as string) === 'Cancelled' ? 'border-red-300 bg-red-50' : ''}`}
                      value={formik.values.status}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {((formik.values.status as string) === 'Pending') && 'Appointment is pending confirmation'}
                    {((formik.values.status as string) === 'Confirmed') && 'Appointment is confirmed. You can now add diagnosis and prescription.'}
                    {((formik.values.status as string) === 'Completed') && 'Appointment is completed. All information is read-only.'}
                    {((formik.values.status as string) === 'Cancelled') && 'Appointment has been cancelled.'}
                  </p>
                </div>

                {/* Additional Notes Section */}
                {(formik.values.status as string) === 'Completed' ? (
                  /* Read-only view for Completed appointments */
                  formik.values.notes && (
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <FileText className="w-5 h-5 text-amber-700" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap">{formik.values.notes}</p>
                    </div>
                  )
                ) : (
                  /* Editable form for non-Completed appointments */
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <FileText className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                    </div>
                <textarea
                  name="notes"
                      className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all"
                      rows={4}
                      placeholder="Add any additional notes, instructions, or comments about this appointment..."
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
               </div>
                )}
              </div>
              {/* Enhanced Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 flex-shrink-0">
                {(formik.values.status as string) === 'Completed' ? (
                  /* Read-only footer for Completed appointments */
                  <>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span>This appointment is completed and cannot be edited</span>
                    </div>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                      className="px-8 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all shadow-lg shadow-gray-500/30 flex items-center justify-center gap-2 font-semibold"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  /* Editable footer for non-Completed appointments */
                  <>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 text-gray-700 hover:bg-white border border-gray-300 rounded-xl transition-all font-medium hover:shadow-md order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl active:scale-95 order-1 sm:order-2"
                >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Update Appointment
                        </>
                      )}
                </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Diagnosis Modal */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-blue-600" /> New Diagnosis
              </h3>
              <button onClick={() => { setShowDiagnosisModal(false); setNewDiagnosisName(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Dengue, Malaria, Cold, Fever"
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={newDiagnosisName}
                  onChange={(e) => setNewDiagnosisName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateDiagnosis();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDiagnosisModal(false); setNewDiagnosisName(''); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateDiagnosis}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 border border-gray-100">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-green-600" /> New Prescription
              </h3>
              <button onClick={() => { 
                setShowPrescriptionModal(false); 
                setNewPrescriptionName(''); 
                setNewPrescriptionDescription('');
                setNewPrescriptionCount('');
                setNewPrescriptionTiming('');
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  For Diagnosis: <span className="text-blue-600 font-semibold">
                    {diagnoses.find(d => d.id === selectedDiagnosisId)?.name || formik.values.diagnosis || 'N/A'}
                  </span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prescription Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Paracetamol 500mg, Antibiotics"
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                  value={newPrescriptionName}
                  onChange={(e) => setNewPrescriptionName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Count/Quantity <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 1 tablet, 2 capsules"
                    className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                    value={newPrescriptionCount}
                    onChange={(e) => setNewPrescriptionCount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timing <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <div className="relative">
                    <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <select
                      className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 pr-10 py-3 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all appearance-none cursor-pointer"
                      value={newPrescriptionTiming}
                      onChange={(e) => setNewPrescriptionTiming(e.target.value)}
                    >
                      <option value="">Select Timing</option>
                      <option value="Morning">Morning</option>
                      <option value="Afternoon">Afternoon</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                      <option value="Before meals">Before meals</option>
                      <option value="After meals">After meals</option>
                      <option value="With meals">With meals</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Thrice daily">Thrice daily</option>
                      <option value="Every 6 hours">Every 6 hours</option>
                      <option value="Every 8 hours">Every 8 hours</option>
                      <option value="Every 12 hours">Every 12 hours</option>
                      <option value="As needed">As needed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Additional instructions or notes..."
                  className="w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all resize-none"
                  rows={3}
                  value={newPrescriptionDescription}
                  onChange={(e) => setNewPrescriptionDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { 
                    setShowPrescriptionModal(false); 
                    setNewPrescriptionName(''); 
                    setNewPrescriptionDescription('');
                    setNewPrescriptionCount('');
                    setNewPrescriptionTiming('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePrescription}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-500/20 flex items-center gap-2 text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Create
                </button>
              </div>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Details Modal */}
        {showPrescriptionDetailsModal && selectedPrescriptionDetails && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-gray-100">
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-600 to-green-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Pill className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xl">Prescription Details</h3>
                    <p className="text-green-100 text-sm mt-0.5">Medicine Information</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowPrescriptionDetailsModal(false);
                    setSelectedPrescriptionDetails(null);
                  }} 
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Medicine Name */}
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Pill className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Medicine Name</span>
                  </div>
                  <p className="text-lg font-bold text-green-900">{selectedPrescriptionDetails.prescription}</p>
                </div>

                {/* Prescription Details */}
                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Prescription Information
                  </h4>
                  <div className="space-y-4">
                    {selectedPrescriptionDetails.count ? (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Quantity / Count</span>
                        </div>
                        <p className="text-gray-900 font-semibold text-base">{selectedPrescriptionDetails.count}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-500 text-sm italic">No quantity specified</p>
                      </div>
                    )}
                    
                    {selectedPrescriptionDetails.timing ? (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Timing / Schedule</span>
                        </div>
                        <p className="text-gray-900 font-semibold text-base">{selectedPrescriptionDetails.timing}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <p className="text-gray-500 text-sm italic">No timing specified</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointment Info */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Appointment Date</span>
                  </div>
                  <p className="text-gray-900 font-semibold">
                    {new Date(selectedPrescriptionDetails.appointment.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPrescriptionDetailsModal(false);
                    setSelectedPrescriptionDetails(null);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition shadow-md font-medium"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowPrescriptionDetailsModal(false);
                    setSelectedPrescriptionDetails(null);
                    handleOpenEditModal(selectedPrescriptionDetails.appointment);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-500/20 font-medium"
                >
                  Edit Appointment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comprehensive Appointment Details Modal */}
        {showAppointmentDetailsModal && selectedAppointmentDetails && (() => {
          const apt = selectedAppointmentDetails;
          const patient = patients.find(p => p.patientId === apt.patientId);
          const selectedDiagnosis = diagnoses.find(d => d.name === apt.diagnosis);
          const selectedPresc = prescriptions.find(p => p.name === apt.prescription);
          
          // Initialize editable values when modal opens - handled in main useEffect
          
          const handleSaveMedicalInfo = async () => {
            if (!apt) return;
            setIsSavingMedicalInfo(true);
            try {
              const updatedAppointment: Appointment = {
                ...apt,
                diagnosis: editableDiagnosis || undefined,
                prescription: editablePrescription || undefined,
              };
              
              const updated = await apiService.appointments.update(updatedAppointment);
              dispatch(updateAppointment(updated));
              
              // Update local state
              setSelectedAppointmentDetails(updated);
              
              // Show success feedback
              alert('Medical information updated successfully!');
            } catch (error: any) {
              console.error('Error updating medical info:', error);
              alert(error?.response?.data?.message || 'Failed to update medical information');
            } finally {
              setIsSavingMedicalInfo(false);
            }
          };
          
          return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-gray-100">
                {/* Header with Gradient */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <FileText className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-2xl">Patient & Medical Details</h3>
                      <p className="text-white/90 text-sm mt-1">Patient Information, Diagnosis & Prescription</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setShowAppointmentDetailsModal(false);
                      setSelectedAppointmentDetails(null);
                    }} 
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                  {/* Patient Information Section */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-blue-100 rounded-xl">
                        <User className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Patient Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</span>
                          <p className="text-gray-900 font-bold text-lg mt-1.5">{apt.patientName || 'N/A'}</p>
                        </div>
                        {apt.patientId && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient ID</span>
                            <p className="text-gray-900 font-semibold mt-1.5 flex items-center gap-2">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-mono">{apt.patientId}</span>
                            </p>
                          </div>
                        )}
                        {apt.email && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5" />
                              Email Address
                            </span>
                            <p className="text-gray-900 font-semibold mt-1.5">{apt.email}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {patient?.mobileNumber && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5" />
                              Phone Number
                            </span>
                            <p className="text-gray-900 font-semibold mt-1.5">{patient.mobileNumber}</p>
                          </div>
                        )}
                        {patient?.gender && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</span>
                            <p className="text-gray-900 font-semibold mt-1.5">
                              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm">{patient.gender}</span>
                            </p>
                          </div>
                        )}
                        {patient?.bloodGroup && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blood Group</span>
                            <p className="text-gray-900 font-semibold mt-1.5">
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-mono">{patient.bloodGroup}</span>
                            </p>
                          </div>
                        )}
                        {(patient?.city || patient?.state) && (
                          <div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5" />
                              Location
                            </span>
                            <p className="text-gray-900 font-semibold mt-1.5">
                              {[patient.city, patient.state].filter(Boolean).join(', ') || 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Medical Information Section */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2.5 bg-emerald-100 rounded-xl">
                        <Stethoscope className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Medical Information</h4>
                    </div>
                    
                    <div className="space-y-5">
                      {/* Diagnosis - Editable */}
                      <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Stethoscope className="w-5 h-5 text-blue-600" />
                          Diagnosis
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                              className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none"
                              value={editableDiagnosis}
                              onChange={(e) => {
                                const selectedValue = e.target.value;
                                setEditableDiagnosis(selectedValue);
                                const selectedDiag = diagnoses.find(d => d.name === selectedValue);
                                if (selectedDiag) {
                                  setEditableDiagnosisId(selectedDiag.id);
                                } else {
                                  setEditableDiagnosisId('');
                                }
                                // Clear prescription if diagnosis changes
                                if (selectedValue !== apt.diagnosis) {
                                  setEditablePrescription('');
                                }
                              }}
                            >
                              <option value="">Select Diagnosis</option>
                              {diagnoses.map((diag) => (
                                <option key={diag.id} value={diag.name}>
                                  {diag.name} {diag.description ? `- ${diag.description}` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowDiagnosisModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl border border-blue-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium"
                            title="Add New Diagnosis"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {editableDiagnosis && diagnoses.find(d => d.name === editableDiagnosis)?.description && (
                          <p className="text-gray-600 text-sm mt-3 pt-3 border-t border-gray-200">
                            {diagnoses.find(d => d.name === editableDiagnosis)?.description}
                          </p>
                        )}
                      </div>

                      {/* Prescription - Editable */}
                      <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Pill className="w-5 h-5 text-green-600" />
                          Prescription
                          {editableDiagnosisId && (
                            <span className="text-xs text-gray-500 font-normal ml-2 px-2 py-0.5 bg-blue-50 rounded-md">
                              for {diagnoses.find(d => d.id === editableDiagnosisId)?.name || 'selected diagnosis'}
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                            <select
                              className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 pr-10 py-3 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all cursor-pointer appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                              value={editablePrescription}
                              onChange={(e) => setEditablePrescription(e.target.value)}
                              disabled={!editableDiagnosisId && !editableDiagnosis}
                            >
                              <option value="">
                                {editableDiagnosisId || editableDiagnosis 
                                  ? 'Select Prescription' 
                                  : 'Select Diagnosis first'}
                              </option>
                              {prescriptions
                                .filter(p => !editableDiagnosisId || p.diagnosis_id === editableDiagnosisId)
                                .map((presc) => (
                                  <option key={presc.id} value={presc.name}>
                                    {presc.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPrescriptionModal(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl border border-green-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add New Prescription"
                            disabled={!editableDiagnosisId && !editableDiagnosis}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {editablePrescription && prescriptions.find(p => p.name === editablePrescription) && (() => {
                          const currentPresc = prescriptions.find(p => p.name === editablePrescription);
                          return (
                            <div className="mt-4 space-y-3">
                              {(currentPresc?.count || currentPresc?.timing) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {currentPresc.count && (
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Quantity / Count</span>
                                      </div>
                                      <p className="text-gray-900 font-bold text-lg">{currentPresc.count}</p>
                                    </div>
                                  )}
                                  {currentPresc.timing && (
                                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Timing / Schedule</span>
                                      </div>
                                      <p className="text-gray-900 font-bold text-lg">{currentPresc.timing}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {currentPresc?.description && (
                                <p className="text-gray-600 text-sm pt-3 border-t border-gray-200">{currentPresc.description}</p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex justify-between items-center gap-3">
                  <button
                    onClick={() => {
                      setShowAppointmentDetailsModal(false);
                      setSelectedAppointmentDetails(null);
                      setEditableDiagnosis('');
                      setEditablePrescription('');
                      setEditableDiagnosisId('');
                    }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition shadow-md font-semibold flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveMedicalInfo}
                      disabled={isSavingMedicalInfo || (editableDiagnosis === apt.diagnosis && editablePrescription === apt.prescription)}
                      className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-500/30 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingMedicalInfo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Save Medical Info
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };
  
  export default Appointments;
