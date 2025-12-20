/**
 * Patients Page Component
 * 
 * Manages patient records with features:
 * - Patient listing with search, sort, and pagination
 * - Create/Edit patient modal
 * - Inline editing for email and phone
 * - CSV import functionality
 * - Real-time updates via Socket.IO
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

// Redux
import { RootState, setPatients, addPatient, updatePatient, addNotification } from '../redux/store';

// Services
import { apiService } from '../services/api';
import { connectSocket, joinDoctorRoom, onPatientsUpdate, onPatientCreated, onPatientUpdated, disconnectSocket } from '../services/socketService';

// Types
import { Patient } from '../types';

// Utils
import { getPatientId, findPatientById } from '../utils/patientUtils';
import { parseCSVFile } from '../utils/csvParser';
import { validateCSVRow } from '../utils/patientValidation';

// Components
import SearchableSelect from '../components/SearchableSelect';
import PhoneInput from '../components/PhoneInput';

// Data
import { indiaStates, getCitiesByState } from '../data/indiaStatesCities';

// Constants
import {
  PAGINATION_OPTIONS,
  DEFAULT_ITEMS_PER_PAGE,
  DEFAULT_CURRENT_PAGE,
  SORT_FIELDS,
  SORT_ORDERS,
  DEFAULT_SORT_FIELD,
  DEFAULT_SORT_ORDER,
  GENDER_OPTIONS,
  CSV_PREVIEW_ROWS,
  CSV_MAX_ERROR_DISPLAY,
} from '../constants/patients';

// Icons
import {
  Plus, Search, X, Edit, Loader2, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUp, ArrowDown, Phone, Mail, User, CalendarDays, Upload, Check,
  Droplet, MapPin, Building2, Columns
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ImportResults {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

interface ImportProgress {
  current: number;
  total: number;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const patientValidationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  mobileNumber: Yup.string().required('Phone number is required'),
  gender: Yup.string().oneOf(['Male', 'Female', 'Other']).required('Gender is required'),
  age: Yup.number().min(0).max(150).optional().nullable(),
  city: Yup.string().required('City is required'),
  state: Yup.string().required('State is required'),
  address: Yup.string().optional().nullable(),
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Patients: React.FC = () => {
  // ========================================================================
  // REDUX & ROUTER
  // ========================================================================
  const { patients, user } = useSelector((state: RootState) => state.data);
  const { token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();

  // ========================================================================
  // STATE - MODAL MANAGEMENT
  // ========================================================================
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  // ========================================================================
  // STATE - INLINE EDITING
  // ========================================================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof Patient | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  
  // ========================================================================
  // STATE - CSV IMPORT
  // ========================================================================
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [csvAllData, setCsvAllData] = useState<any[]>([]);
  const [csvFieldMapping, setCsvFieldMapping] = useState<Record<string, string>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<Record<number, string[]>>({});
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<ImportResults | null>(null);

  // ========================================================================
  // STATE - COLUMN SELECTION
  // ========================================================================
  // Column configuration: default and restricted columns
  const columnConfig = {
    patientId: { label: 'Patient ID', restricted: true },
    name: { label: 'Name', restricted: true },
    contactInfo: { 
      label: 'Contact Info', 
      restricted: false,
      subFields: {
        email: { label: 'Email' },
        number: { label: 'Number' }
      }
    },
    gender: { label: 'Gender', restricted: false },
    age: { label: 'Age', restricted: false },
    bloodGroup: { label: 'Blood Group', restricted: false },
    lastVisitDate: { label: 'Last Visit', restricted: false },
    actions: { label: 'Actions', restricted: true },
  };

  // Default visible columns: all fields selected by default
  const defaultVisibleColumns = ['patientId', 'name', 'contactInfo', 'gender', 'age', 'bloodGroup', 'lastVisitDate', 'actions'];
  
  // Default visible contact sub-fields: both email and number
  const defaultContactSubFields = ['email', 'number'];
  
  // Restricted columns that cannot be hidden
  const restrictedColumns = ['patientId', 'name', 'actions'];

  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(defaultVisibleColumns)
  );
  
  // State for contact info sub-fields (email and number)
  const [visibleContactSubFields, setVisibleContactSubFields] = useState<Set<string>>(
    new Set(defaultContactSubFields)
  );
  
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // ========================================================================
  // STATE - FILTERING & PAGINATION
  // ========================================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(DEFAULT_ITEMS_PER_PAGE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_CURRENT_PAGE);
  const [sortField, setSortField] = useState<keyof Patient>(DEFAULT_SORT_FIELD);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(DEFAULT_SORT_ORDER);

  // ========================================================================
  // STATE - FORM
  // ========================================================================
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // ========================================================================
  // REFS
  // ========================================================================
  const hasLoadedRef = useRef(false);
  
  // ========================================================================
  // HANDLERS - COLUMN SELECTION
  // ========================================================================
  
  /**
   * Toggle column visibility
   */
  const toggleColumn = useCallback((columnKey: string) => {
    // Prevent hiding restricted columns
    if (restrictedColumns.includes(columnKey)) {
      return;
    }
    
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey);
        // If hiding contactInfo, also clear sub-fields visibility
        if (columnKey === 'contactInfo') {
          setVisibleContactSubFields(new Set());
        }
      } else {
        newSet.add(columnKey);
        // If showing contactInfo, restore default sub-fields
        if (columnKey === 'contactInfo') {
          setVisibleContactSubFields(new Set(defaultContactSubFields));
        }
      }
      return newSet;
    });
  }, []);

  /**
   * Toggle contact info sub-field visibility
   */
  const toggleContactSubField = useCallback((subField: string) => {
    setVisibleContactSubFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subField)) {
        newSet.delete(subField);
        // If no sub-fields are visible, hide the contactInfo column
        if (newSet.size === 0) {
          setVisibleColumns(prevCols => {
            const newCols = new Set(prevCols);
            newCols.delete('contactInfo');
            return newCols;
          });
        }
      } else {
        newSet.add(subField);
        // Ensure contactInfo column is visible when showing sub-fields
        setVisibleColumns(prevCols => {
          const newCols = new Set(prevCols);
          newCols.add('contactInfo');
          return newCols;
        });
      }
      return newSet;
    });
  }, []);

  /**
   * Reset to default columns
   */
  const resetToDefaultColumns = useCallback(() => {
    setVisibleColumns(new Set(defaultVisibleColumns));
    setVisibleContactSubFields(new Set(defaultContactSubFields));
  }, []);

  // ========================================================================
  // DATA LOADING
  // ========================================================================

  /**
   * Load patients from API
   */
  const loadPatients = useCallback(async () => {
    try {
      if (hasLoadedRef.current && patients.length > 0) {
        return; // Prevent duplicate calls in StrictMode
      }
      
                hasLoadedRef.current = true;
                const data = await apiService.patients.getAll();
                dispatch(setPatients(data));
    } catch (error) {
      console.error("Failed to fetch patients", error);
                hasLoadedRef.current = false; // Reset on error to allow retry
            }
  }, [patients.length, dispatch]);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  /**
   * Handle click outside column selector
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Initial load and Socket.IO setup
   */
  useEffect(() => {
    loadPatients();
    
    // Check for state from Dashboard
    if (location.state) {
        const state = location.state as any;
        if (state.openCreateModal) {
            handleOpenModal();
        }
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
      const unsubscribePatients = onPatientsUpdate((data) => {
        console.log('👥 Patients update received:', data);
        dispatch(setPatients(data));
      });

      const unsubscribePatientCreated = onPatientCreated((patient) => {
        console.log('➕ Patient created:', patient);
        dispatch(addPatient(patient));
      });

      const unsubscribePatientUpdated = onPatientUpdated((patient) => {
        console.log('✏️ Patient updated:', patient);
        dispatch(updatePatient(patient));
      });

      return () => {
        unsubscribePatients();
        unsubscribePatientCreated();
        unsubscribePatientUpdated();
        disconnectSocket();
      };
    }
  }, [location, dispatch, token, user, loadPatients]);

  /**
   * Handle opening details when patient is selected from navigation
   */
  useEffect(() => {
    if (location.state && (location.state as any).selectedPatientId && patients.length > 0) {
        const pId = (location.state as any).selectedPatientId;
        const patient = findPatientById(patients, pId);
        if (patient) {
            handleOpenDetails(patient);
            window.history.replaceState({}, document.title);
        }
    }
  }, [patients, location.state]);

  // ========================================================================
  // HANDLERS - MODAL MANAGEMENT
  // ========================================================================

  /**
   * Open create/edit modal
   */
  const handleOpenModal = useCallback((patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
      if (patient.state) {
        setAvailableCities(getCitiesByState(patient.state));
      }
    } else {
      setEditingPatient(null);
      setAvailableCities([]);
    }
    setShowModal(true);
  }, []);

  /**
   * Open patient details modal
   */
  const handleOpenDetails = useCallback((patient: Patient) => {
      setSelectedPatientDetails(patient);
      setShowDetailsModal(true);
  }, []);

  // ========================================================================
  // HANDLERS - SORTING
  // ========================================================================

  /**
   * Handle column sorting
   */
  const handleSort = useCallback((field: keyof Patient) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(SORT_ORDERS.ASC);
    }
  }, [sortField]);

  /**
   * Render sort indicator icon
   */
  const renderSortIndicator = useCallback((field: keyof Patient) => {
    if (sortField !== field) {
      return <span className="w-4 h-4 ml-1 inline-block" />;
    }
    return sortOrder === SORT_ORDERS.ASC
      ? <ArrowUp className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" /> 
      : <ArrowDown className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" />;
  }, [sortField, sortOrder]);

  // ========================================================================
  // HANDLERS - INLINE EDITING
  // ========================================================================

  /**
   * Start inline editing for a field
   */
  const startInlineEdit = useCallback((patient: Patient, field: keyof Patient) => {
    setEditingId(getPatientId(patient));
    setEditingField(field);
    setEditValue(String(patient[field] || ''));
  }, []);

  /**
   * Cancel inline editing
   */
  const cancelInlineEdit = useCallback(() => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  }, []);

  /**
   * Save inline edit
   */
  const saveInlineEdit = useCallback(async (patient: Patient) => {
    if (!editingField) return;
    
    setIsSavingInline(true);
    try {
      const updatedPatient = { ...patient, [editingField]: editValue };
      await apiService.patients.update(updatedPatient);
        cancelInlineEdit();
    } catch (error) {
        console.error("Failed to update patient", error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          title: 'Error',
          message: 'Failed to update patient info.',
          type: 'error',
          timestamp: new Date().toISOString()
        }));
    } finally {
        setIsSavingInline(false);
    }
  }, [editingField, editValue, cancelInlineEdit]);

  // ========================================================================
  // HANDLERS - CSV IMPORT
  // ========================================================================

  /**
   * Trigger file input click
   */
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Handle CSV file upload and parsing
   */
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
        const { headers, rows: allRows, fieldMapping } = parseCSVFile(text);
        
        setCsvHeaders(headers);
        setCsvFieldMapping(fieldMapping);
        
        // Store first N rows for preview
        const previewRows = allRows.slice(0, CSV_PREVIEW_ROWS);
        setCsvAllData(allRows);
        setCsvPreviewData(previewRows);
        
        // Validate all rows
        const validationErrors: Record<number, string[]> = {};
        allRows.forEach((row, index) => {
          const errors = validateCSVRow(row, fieldMapping, index + 2);
          if (errors.length > 0) {
            validationErrors[index + 2] = errors;
          }
        });
        
        setCsvValidationErrors(validationErrors);
        setShowPreviewModal(true);
      } catch (error) {
        console.error("CSV Parse Error", error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          title: 'Error',
          message: error instanceof Error ? error.message : "Failed to parse CSV file. Please ensure it is formatted correctly.",
          type: 'error',
          timestamp: new Date().toISOString()
        }));
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      dispatch(addNotification({
        id: `error-${Date.now()}`,
        title: 'Error',
        message: 'Failed to read file.',
        type: 'error',
        timestamp: new Date().toISOString()
      }));
    };

    reader.readAsText(file);
  }, []);

  /**
   * Handle CSV import confirmation
   */
  const handleConfirmImport = async () => {
    setIsImporting(true);
    setImportProgress({ current: 0, total: csvAllData.length });
    setImportResults(null);

    try {
      // Prepare all patients data
      const patientsToImport: any[] = [];
      const validationErrors: Record<number, string[]> = {};

      for (let i = 0; i < csvAllData.length; i++) {
        const rowData = csvAllData[i];
        setImportProgress({ current: i + 1, total: csvAllData.length });

                const newPatient: any = {
                    lastVisitDate: new Date().toISOString().split('T')[0],
                    appointmentDate: '-',
          visits: [],
          gender: 'Male', // Default
                };

        // Map fields based on field mapping
        Object.keys(csvFieldMapping).forEach(csvHeader => {
          const fieldName = csvFieldMapping[csvHeader];
          const value = rowData[csvHeader];
          if (value && fieldName) {
            let cleanedValue = String(value).trim();
            
            // Format gender
            if (fieldName === 'gender' && cleanedValue) {
              cleanedValue = cleanedValue.charAt(0).toUpperCase() + cleanedValue.slice(1).toLowerCase();
              if (!['Male', 'Female', 'Other'].includes(cleanedValue)) {
                cleanedValue = 'Male';
              }
            }
            
            // Format blood group
            if (fieldName === 'bloodGroup' && cleanedValue) {
              cleanedValue = cleanedValue.toUpperCase().replace(/\s+/g, '');
            }
            
            newPatient[fieldName] = cleanedValue;
          }
                });

        // Validate patient data
        const validationResult = validateCSVRow(rowData, csvFieldMapping, i + 2);
        if (validationResult.length > 0) {
          validationErrors[i + 2] = validationResult;
        } else {
          patientsToImport.push(newPatient);
        }
      }

      // If there are validation errors and no valid patients, show errors
      if (Object.keys(validationErrors).length > 0 && patientsToImport.length === 0) {
        const errors: Array<{ row: number; error: string }> = [];
        Object.keys(validationErrors).forEach(rowNum => {
          errors.push({ row: parseInt(rowNum), error: validationErrors[parseInt(rowNum)].join(', ') });
        });
        setImportResults({
          success: 0,
          failed: csvAllData.length,
          errors: errors.slice(0, CSV_MAX_ERROR_DISPLAY),
        });
        setIsImporting(false);
        return;
      }

      // Call bulk import API
      const result = await apiService.patients.bulkImport(patientsToImport);

      // Add successful patients to Redux
      result.successful.forEach(patient => {
        dispatch(addPatient(patient));
      });

      // Format errors for display
      const errors: Array<{ row: number; error: string }> = [];
      
      // Add validation errors
      Object.keys(validationErrors).forEach(rowNum => {
        errors.push({ row: parseInt(rowNum), error: validationErrors[parseInt(rowNum)].join(', ') });
      });
      
      // Add API errors
      result.failed.forEach(failed => {
        errors.push({ row: failed.row, error: failed.error });
      });

      setImportResults({
        success: result.summary.successful,
        failed: result.summary.failed + Object.keys(validationErrors).length,
        errors: errors.slice(0, CSV_MAX_ERROR_DISPLAY),
      });
      
      // Reset pagination to show new patients
      setCurrentPage(DEFAULT_CURRENT_PAGE);
      
      // Close preview modal and reset CSV state
      setShowPreviewModal(false);
      setCsvPreviewData([]);
      setCsvAllData([]);
      setCsvFieldMapping({});
      setCsvHeaders([]);
      setCsvValidationErrors({});
    } catch (error: any) {
            console.error("CSV Import Error", error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to import patients. Please try again.';
      setImportResults({
        success: 0,
        failed: csvAllData.length,
        errors: [{ row: 0, error: errorMessage }],
      });
        } finally {
            setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  // ========================================================================
  // COMPUTED VALUES - FILTERING & SORTING
  // ========================================================================

  /**
   * Filter and sort patients based on search term and sort settings
   */
  const filteredAndSortedPatients = useMemo(() => {
    const patientsArray = Array.isArray(patients) ? [...patients] : [];
    
    // Filter by search term
    const filtered = patientsArray.filter(patient => 
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort filtered results
    return [...filtered].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      
      // Handle patientId field
      if (sortField === 'patientId') {
        valA = getPatientId(a);
        valB = getPatientId(b);
      } else {
        const fieldValueA = a[sortField];
        const fieldValueB = b[sortField];
        valA = Array.isArray(fieldValueA) 
          ? fieldValueA.join(',') 
          : (fieldValueA?.toString() || '');
        valB = Array.isArray(fieldValueB) 
          ? fieldValueB.join(',') 
          : (fieldValueB?.toString() || '');
      }
      
      if (valA < valB) return sortOrder === SORT_ORDERS.ASC ? -1 : 1;
      if (valA > valB) return sortOrder === SORT_ORDERS.ASC ? 1 : -1;
      return 0;
    });
  }, [patients, searchTerm, sortField, sortOrder]);

  /**
   * Pagination calculations
   */
  const { totalPages, paginatedPatients } = useMemo(() => {
    const total = Math.ceil(filteredAndSortedPatients.length / itemsPerPage);
    const paginated = filteredAndSortedPatients.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { totalPages: total, paginatedPatients: paginated };
  }, [filteredAndSortedPatients, itemsPerPage, currentPage]);

  // ========================================================================
  // FORMIK CONFIGURATION
  // ========================================================================

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editingPatient?.name || '',
      email: editingPatient?.email || '',
      mobileNumber: editingPatient?.mobileNumber || '',
      gender: editingPatient?.gender || 'Male',
      age: editingPatient?.age || undefined,
      bloodGroup: editingPatient?.bloodGroup || '' as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
      city: editingPatient?.city || '',
      state: editingPatient?.state || '',
      address: editingPatient?.address || '',
    },
    validationSchema: patientValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        // Prepare patient data - convert empty bloodGroup to undefined
        const patientData = {
          ...values,
          bloodGroup: (values.bloodGroup && values.bloodGroup.trim() !== '') 
            ? values.bloodGroup as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' 
            : undefined,
        };

        if (editingPatient) {
          // Update existing patient
          const updated = await apiService.patients.update({ ...editingPatient, ...patientData });
          const normalizedUpdated = {
            ...updated,
            patientId: updated.patientId || updated.id?.toString() || editingPatient.patientId || editingPatient.id?.toString()
          };
          dispatch(updatePatient(normalizedUpdated));
          setEditingPatient(null);
        } else {
          // Create new patient
          const created = await apiService.patients.create({
            ...patientData,
             lastVisitDate: new Date().toISOString().split('T')[0],
             appointmentDate: '-',
             visits: []
          } as any);
          
          // Normalize patient data
          const patientIdStr = created.patientId?.toString() || created.id?.toString() || `P-${Date.now()}`;
          const normalizedCreated: Patient = {
            ...created,
            patientId: patientIdStr,
            id: created.id || (typeof created.patientId === 'number' ? created.patientId : parseInt(patientIdStr.replace('P-', '')) || undefined),
            visits: created.visits || [],
            name: created.name || patientData.name,
            email: created.email || patientData.email,
            mobileNumber: created.mobileNumber || patientData.mobileNumber,
            gender: created.gender || patientData.gender,
            age: created.age || patientData.age,
            city: created.city || patientData.city,
            state: created.state || patientData.state,
            address: created.address || patientData.address,
            bloodGroup: created.bloodGroup || patientData.bloodGroup,
            lastVisitDate: created.lastVisitDate || new Date().toISOString().split('T')[0],
            appointmentDate: created.appointmentDate || '-'
          };
          
          dispatch(addPatient(normalizedCreated));
          setCurrentPage(DEFAULT_CURRENT_PAGE);
          resetForm();
        }
        
        setShowModal(false);
        setAvailableCities([]);
      } catch (error) {
        console.error("Form submission error", error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          title: 'Error',
          message: 'Failed to save patient.',
          type: 'error',
          timestamp: new Date().toISOString()
        }));
      }
    }
  });

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString || dateString === '-') return 'No visits';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  /**
   * Format date with time for display
   */
  const formatDateTime = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return 'No visits';
    
    try {
      return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Patients</h1>
          <p className="text-sm sm:text-base text-gray-500">Manage patient records and history.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full md:w-auto">
             <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
             />
             <button 
                onClick={handleImportClick}
                disabled={isImporting}
            className="bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition font-medium disabled:opacity-50 text-sm sm:text-base"
             >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="hidden xs:inline">Import CSV</span>
                <span className="xs:hidden">Import</span>
             </button>
             <button 
                onClick={() => handleOpenModal()}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 font-medium text-sm sm:text-base"
             >
               <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Add Patient</span><span className="xs:hidden">Add</span>
             </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 mb-4 sm:mb-6 flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-center">
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

        {/* Sort Controls & Column Selector */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <select 
              value={sortField}
              onChange={(e) => handleSort(e.target.value as keyof Patient)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
            >
              <option value={SORT_FIELDS.NAME}>Name</option>
              <option value={SORT_FIELDS.EMAIL}>Email</option>
              <option value={SORT_FIELDS.LAST_VISIT_DATE}>Last Visit</option>
              <option value={SORT_FIELDS.PATIENT_ID}>Patient ID</option>
            </select>
            <button 
              onClick={() => setSortOrder(prev => prev === SORT_ORDERS.ASC ? SORT_ORDERS.DESC : SORT_ORDERS.ASC)}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
              title={`Sort ${sortOrder === SORT_ORDERS.ASC ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === SORT_ORDERS.ASC ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Column Selector */}
          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Select Columns"
            >
              <Columns className="w-4 h-4" />
              <span className="text-sm">Columns</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showColumnSelector ? 'rotate-180' : ''}`} />
            </button>
            
            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Select Columns</h3>
                    <button
                      onClick={resetToDefaultColumns}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {Object.entries(columnConfig).map(([key, config]) => {
                    const isVisible = visibleColumns.has(key);
                    const isRestricted = config.restricted;
                    const hasSubFields = config.subFields !== undefined;
                    
                    return (
                      <div key={key}>
                        <label
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isRestricted 
                              ? 'bg-gray-50 cursor-not-allowed opacity-75' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumn(key)}
                            disabled={isRestricted}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className={`text-sm ${isRestricted ? 'text-gray-500' : 'text-gray-700'}`}>
                            {config.label}
                          </span>
                          {isRestricted && (
                            <span className="ml-auto text-xs text-gray-400">Required</span>
                          )}
                        </label>
                        
                        {/* Sub-fields for contactInfo */}
                        {hasSubFields && isVisible && config.subFields && (
                          <div className="ml-6 mb-1 space-y-1">
                            {Object.entries(config.subFields).map(([subKey, subConfig]) => {
                              const isSubFieldVisible = visibleContactSubFields.has(subKey);
                              return (
                                <label
                                  key={subKey}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSubFieldVisible}
                                    onChange={() => toggleContactSubField(subKey)}
                                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-600">
                                    {subConfig.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient List Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto -mx-3 sm:mx-0 px-3 sm:px-0" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="w-full text-left">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                {visibleColumns.has('patientId') && (
                  <th 
                    className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" 
                    onClick={() => handleSort('patientId')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Patient ID</span>
                      {renderSortIndicator('patientId')}
                    </div>
                  </th>
                )}
                {visibleColumns.has('name') && (
                  <th 
                    className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" 
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Name</span>
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                )}
                {visibleColumns.has('contactInfo') && visibleContactSubFields.size > 0 && (
                  <th 
                    className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" 
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Contact Info</span>
                      {renderSortIndicator('email')}
                    </div>
                  </th>
                )}
                {visibleColumns.has('gender') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Gender</div>
                  </th>
                )}
                {visibleColumns.has('age') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Age</div>
                  </th>
                )}
                {visibleColumns.has('bloodGroup') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Blood Group</div>
                  </th>
                )}
                {visibleColumns.has('lastVisitDate') && (
                  <th 
                    className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" 
                    onClick={() => handleSort('lastVisitDate')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Last Visit</span>
                      {renderSortIndicator('lastVisitDate')}
                    </div>
                  </th>
                )}
                {visibleColumns.has('actions') && (
                  <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient, index) => (
                <tr key={getPatientId(patient)} className="hover:bg-blue-50/50 transition-all duration-150 border-b border-gray-50">
                  {/* Patient ID */}
                  {visibleColumns.has('patientId') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-xs font-bold text-blue-700">
                            #{index + 1 + (currentPage - 1) * itemsPerPage}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          {getPatientId(patient)}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Name */}
                  {visibleColumns.has('name') && (
                    <td className="px-6 py-4">
                      <div 
                          onClick={() => handleOpenDetails(patient)}
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {patient.name}
                      </div>
                        </div>
                      </div>
                    </td>
                  )}
                  
                  {/* Contact Info with Inline Edit */}
                  {visibleColumns.has('contactInfo') && visibleContactSubFields.size > 0 && (
                    <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {/* Email */}
                      {visibleContactSubFields.has('email') && (
                        <div className="flex items-center gap-2 group">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                              {editingId === getPatientId(patient) && editingField === 'email' ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in">
                                      <input 
                                          autoFocus
                                          disabled={isSavingInline}
                                className={`w-48 text-sm border-2 ${isSavingInline ? 'border-blue-400 bg-blue-50 text-gray-500' : 'border-blue-300'} rounded-lg px-2 py-1 outline-none transition-all focus:ring-2 focus:ring-blue-500`}
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onKeyDown={(e) => {
                                              if (isSavingInline) return;
                                  if (e.key === 'Enter') saveInlineEdit(patient);
                                  if (e.key === 'Escape') cancelInlineEdit();
                                          }}
                                      />
                                      {isSavingInline ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                      ) : (
                                          <>
                                  <button 
                                    onClick={() => saveInlineEdit(patient)} 
                                    className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  >
                                    <Check className="w-4 h-4"/>
                                  </button>
                                  <button 
                                    onClick={cancelInlineEdit} 
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4"/>
                                  </button>
                                          </>
                                      )}
                                  </div>
                              ) : (
                                  <>
                              <span className="text-sm text-gray-700 font-medium">{patient.email}</span>
                                      <button 
                                          onClick={() => startInlineEdit(patient, 'email')}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1 hover:bg-blue-50 rounded"
                                      >
                                <Edit className="w-3.5 h-3.5" />
                                      </button>
                                  </>
                              )}
                          </div>
                      )}

                      {/* Phone */}
                      {visibleContactSubFields.has('number') && (
                        <div className="flex items-center gap-2 group">
                          <div className="p-1.5 bg-green-100 rounded-lg">
                            <Phone className="w-3.5 h-3.5 text-green-600" />
                          </div>
                               {editingId === getPatientId(patient) && editingField === 'mobileNumber' ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in w-full">
                                      <div className="flex-1">
                                        <PhoneInput
                                          value={editValue}
                                          onChange={(value) => setEditValue(value || '')}
                                          defaultCountry="IN"
                                          placeholder="Enter mobile number"
                                          className={`text-sm ${isSavingInline ? 'opacity-60' : ''}`}
                                          disabled={isSavingInline}
                                        />
                                      </div>
                                      {isSavingInline ? (
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                      ) : (
                                          <>
                                  <button 
                                    onClick={() => saveInlineEdit(patient)} 
                                    className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  >
                                    <Check className="w-4 h-4"/>
                                  </button>
                                  <button 
                                    onClick={cancelInlineEdit} 
                                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <X className="w-4 h-4"/>
                                  </button>
                                          </>
                                      )}
                                  </div>
                               ) : (
                                  <>
                              <span className="text-sm text-gray-600">{patient.mobileNumber}</span>
                                      <button 
                                          onClick={() => startInlineEdit(patient, 'mobileNumber')}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity p-1 hover:bg-blue-50 rounded"
                                      >
                                <Edit className="w-3.5 h-3.5" />
                                      </button>
                                  </>
                               )}
                          </div>
                      )}
                    </div>
                  </td>
                  )}

                  {/* Gender */}
                  {visibleColumns.has('gender') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {patient.gender || 'N/A'}
                      </span>
                    </td>
                  )}

                  {/* Age */}
                  {visibleColumns.has('age') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.age ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          {patient.age} {patient.age === 1 ? 'year' : 'years'}
                      </span>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                  )}

                  {/* Blood Group */}
                  {visibleColumns.has('bloodGroup') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {patient.bloodGroup ? (
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          {patient.bloodGroup}
                      </span>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                  )}

                  {/* Last Visit */}
                  {visibleColumns.has('lastVisitDate') && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <CalendarDays className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          {patient.lastVisitDateTime ? (
                            <div className="font-medium text-gray-900">
                              {formatDateTime(patient.lastVisitDateTime)}
                            </div>
                          ) : patient.lastVisitDate && patient.lastVisitDate !== '-' ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {formatDate(patient.lastVisitDate)}
                              </div>
                              <div className="text-xs text-gray-500">Last visit</div>
                            </>
                          ) : (
                            <span className="text-gray-400">No visits</span>
                          )}
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  {visibleColumns.has('actions') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button 
                          onClick={() => handleOpenModal(patient)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-md"
                        title="Edit Patient"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={visibleColumns.size} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No patients found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new patient</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center">
             <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select 
                    value={itemsPerPage}
              onChange={(e) => { 
                setItemsPerPage(Number(e.target.value)); 
                setCurrentPage(DEFAULT_CURRENT_PAGE); 
              }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
                >
              {PAGINATION_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[98vh] sm:max-h-[95vh] flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-4 sm:p-6 flex justify-between items-center flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}></div>
              <div className="flex items-center gap-2 sm:gap-4 relative z-10 flex-1 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg flex-shrink-0">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-0.5 sm:mb-1 truncate">
                    {editingPatient ? 'Edit Patient' : 'Add New Patient'}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100/90 hidden sm:block">
                    {editingPatient ? 'Update patient information below' : 'Fill in the details to create a new patient record'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 sm:p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-lg sm:rounded-xl transition-all backdrop-blur-md border border-white/20 hover:border-white/30 hover:scale-110 relative z-10 flex-shrink-0 ml-2"
                aria-label="Close modal"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-50 to-white">
              <form onSubmit={formik.handleSubmit} className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
              {/* Basic Information Section */}
                <div className="space-y-4 sm:space-y-5 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Basic Information</h3>
                      <p className="text-xs text-gray-500">Patient's personal details</p>
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      Full Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input 
                      name="name"
                      type="text" 
                      placeholder="Enter patient's full name"
                      className={`w-full bg-white text-gray-900 border-2 ${formik.touched.name && formik.errors.name ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'} rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium`}
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                  />
                  {formik.touched.name && formik.errors.name && (
                      <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                        <X className="w-3.5 h-3.5" />
                      {formik.errors.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information Section */}
                <div className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-green-100">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Contact Information</h3>
                      <p className="text-xs text-gray-500">Email and phone details</p>
                    </div>
                </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        Email Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input 
                        name="email"
                        type="email" 
                        placeholder="patient@example.com"
                        className={`w-full bg-white text-gray-900 border-2 ${formik.touched.email && formik.errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'} rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium`}
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.email && formik.errors.email && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                        {formik.errors.email}
                      </div>
                    )}
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-50 rounded-lg flex items-center justify-center">
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        Mobile Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative">
                        <PhoneInput
                            value={formik.values.mobileNumber}
                            onChange={(value) => {
                                formik.setFieldValue('mobileNumber', value || '');
                                formik.setFieldTouched('mobileNumber', true);
                            }}
                            defaultCountry="IN"
                            placeholder="Enter mobile number"
                            className={formik.touched.mobileNumber && formik.errors.mobileNumber ? 'border-red-400 focus:border-red-500 bg-red-50/50' : ''}
                        />
                    </div>
                    {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                        {formik.errors.mobileNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal Details Section */}
                <div className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-purple-100">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Personal Details</h3>
                      <p className="text-xs text-gray-500">Gender, age, and blood group</p>
                    </div>
                </div>
                
                  <div className="space-y-5">
                    {/* Gender */}
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-5 h-5 bg-purple-50 rounded-lg flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                        Gender <span className="text-red-500 font-bold">*</span>
                    </label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {GENDER_OPTIONS.map((option) => {
                        const isSelected = formik.values.gender === option.value;
                          let buttonClasses = 'relative p-3.5 rounded-xl border-2 transition-all duration-200 focus:outline-none group ';
                        
                        if (option.color === 'blue') {
                          buttonClasses += isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/30 hover:border-blue-600 hover:shadow-xl focus:ring-2 focus:ring-blue-500/30 scale-105' 
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/70 hover:shadow-md focus:ring-2 focus:ring-blue-500/20';
                        } else if (option.color === 'pink') {
                          buttonClasses += isSelected 
                              ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-lg shadow-pink-500/30 hover:border-pink-600 hover:shadow-xl focus:ring-2 focus:ring-pink-500/30 scale-105' 
                              : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50/70 hover:shadow-md focus:ring-2 focus:ring-pink-500/20';
                        } else {
                          buttonClasses += isSelected 
                              ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg shadow-purple-500/30 hover:border-purple-600 hover:shadow-xl focus:ring-2 focus:ring-purple-500/30 scale-105' 
                              : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/70 hover:shadow-md focus:ring-2 focus:ring-purple-500/20';
                        }
                        
                        if (formik.touched.gender && formik.errors.gender) {
                            buttonClasses += ' border-red-400';
                        }
                        
                          let badgeClasses = 'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200 ';
                        if (option.color === 'blue') {
                          badgeClasses += 'bg-blue-500';
                        } else if (option.color === 'pink') {
                          badgeClasses += 'bg-pink-500';
                        } else {
                          badgeClasses += 'bg-purple-500';
                        }
                        
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              formik.setFieldValue('gender', option.value);
                              formik.setFieldTouched('gender', true);
                            }}
                            onBlur={() => formik.setFieldTouched('gender', true)}
                            className={buttonClasses}
                          >
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="text-2xl transform group-hover:scale-110 transition-transform">{option.icon}</span>
                                <span className="font-semibold text-xs">{option.value}</span>
                            </div>
                            {isSelected && (
                              <div className={badgeClasses}>
                                  <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {formik.touched.gender && formik.errors.gender && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                        {formik.errors.gender}
                      </div>
                    )}
                      </div>

                    {/* Blood Group - Separate after Gender */}
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-red-50 rounded-lg flex items-center justify-center">
                          <Droplet className="w-3.5 h-3.5 text-red-600" />
                        </div>
                      Blood Group
                    </label>
                      <div className="relative">
                        <select
                          name="bloodGroup"
                          className={`w-full bg-white text-gray-900 border-2 ${formik.touched.bloodGroup && formik.errors.bloodGroup ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'} rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer font-medium appearance-none pr-10`}
                          value={formik.values.bloodGroup}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                        >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                          <ChevronDown className="w-5 h-5" />
                                </div>
                    </div>
                    {formik.touched.bloodGroup && formik.errors.bloodGroup && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                          {formik.errors.bloodGroup}
                        </div>
                    )}
                    </div>

                    {/* Age - Below Blood Group */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-orange-50 rounded-lg flex items-center justify-center">
                          <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                        </div>
                        Age
                      </label>
                      <input 
                        name="age"
                        type="number" 
                        min="0"
                        max="150"
                        placeholder="Enter age"
                        className={`w-full bg-white text-gray-900 border-2 ${formik.touched.age && formik.errors.age ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'} rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 font-medium`}
                        value={formik.values.age || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                          formik.setFieldValue('age', value);
                        }}
                        onBlur={formik.handleBlur}
                      />
                      {formik.touched.age && formik.errors.age && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                          {formik.errors.age}
                        </div>
                    )}
                  </div>
                </div>
              </div>

                {/* Location Information Section */}
                <div className="space-y-5 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Location Information</h3>
                      <p className="text-xs text-gray-500">State, city, and address details</p>
                    </div>
                </div>
                
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        State
                    </label>
                    <SearchableSelect
                        options={indiaStates}
                        value={formik.values.state}
                        onChange={(value) => {
                          formik.setFieldValue('state', value);
                          if (value) {
                          setAvailableCities(getCitiesByState(value));
                          } else {
                            setAvailableCities([]);
                          }
                          formik.setFieldValue('city', '');
                        }}
                        placeholder="Select State"
                        className={formik.touched.state && formik.errors.state ? 'border-red-400 bg-red-50/50' : ''}
                    />
                    {formik.touched.state && formik.errors.state && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                        {formik.errors.state}
                      </div>
                    )}
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        City
                    </label>
                    <SearchableSelect
                        options={availableCities}
                        value={formik.values.city}
                        onChange={(value) => formik.setFieldValue('city', value)}
                        placeholder="Select City"
                        disabled={!formik.values.state || availableCities.length === 0}
                        className={formik.touched.city && formik.errors.city ? 'border-red-400 bg-red-50/50' : ''}
                    />
                    {formik.touched.city && formik.errors.city && (
                        <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                          <X className="w-3.5 h-3.5" />
                        {formik.errors.city}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5 flex items-center gap-2">
                      <div className="w-5 h-5 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                      Full Address <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea 
                      name="address"
                      rows={3}
                      placeholder="Enter complete address (street, area, landmark)"
                      className={`w-full bg-white text-gray-900 border-2 ${formik.touched.address && formik.errors.address ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-gray-300'} rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none placeholder:text-gray-400 font-medium`}
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                  />
                  {formik.touched.address && formik.errors.address && (
                      <div className="text-red-600 text-xs mt-2 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                        <X className="w-3.5 h-3.5" />
                      {formik.errors.address}
                    </div>
                  )}
                </div>
              </div>
              
                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sm:pt-6 border-t-2 border-gray-100 bg-white rounded-b-xl sm:rounded-b-2xl -mx-4 sm:-mx-6 md:-mx-8 -mb-4 sm:-mb-6 md:-mb-8 px-4 sm:px-6 md:px-8 pb-4 sm:pb-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold shadow-sm hover:shadow-md border border-gray-200 hover:border-gray-300 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formik.isSubmitting}
                    className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 disabled:hover:scale-100 text-sm sm:text-base"
                >
                  {formik.isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Saving...</span>
                    </>
                  ) : (
                    <>
                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{editingPatient ? 'Update Patient' : 'Create Patient'}</span>
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Patients;
