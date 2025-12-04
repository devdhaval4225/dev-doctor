
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setPatients, addPatient, updatePatient } from '../redux/store';
import { apiService } from '../services/api';
import { Patient } from '../types';
import { getPatientId, findPatientById } from '../utils/patientUtils';
import { Plus, Search, X, Edit, Loader2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Clock, FileText, Upload, Check, Phone, Mail, Calendar, MapPin, Droplet, User, Building2, CalendarDays } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { indiaStates, getCitiesByState } from '../data/indiaStatesCities';
import SearchableSelect from '../components/SearchableSelect';
import { connectSocket, joinDoctorRoom, onPatientsUpdate, onPatientCreated, onPatientUpdated, disconnectSocket } from '../services/socketService';
import { parseCSVFile } from '../utils/csvParser';
import { validateCSVRow } from '../utils/patientValidation';
import { debounce } from '../utils/debounce';

const Patients = () => {
  const { patients, user } = useSelector((state: RootState) => state.data);
  const { token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);
  
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<keyof Patient | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingInline, setIsSavingInline] = useState(false);
  
  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  // CSV Preview State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [csvAllData, setCsvAllData] = useState<any[]>([]); // Store all rows for import
  const [csvFieldMapping, setCsvFieldMapping] = useState<Record<string, string>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<Record<number, string[]>>({});
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: Array<{ row: number; error: string }> } | null>(null);
  
  // Pagination & Sort & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Patient>('lastVisitDate'); // Default sort
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const location = useLocation();

  const hasLoadedRef = useRef(false);

  // Load patients function
    const loadPatients = async () => {
            try {
      if (hasLoadedRef.current && patients.length > 0) {
        return; // Prevent duplicate calls in StrictMode
      }
      
                hasLoadedRef.current = true;
                const data = await apiService.patients.getAll();
                dispatch(setPatients(data));
            } catch (e) {
                console.error("Failed to fetch patients", e);
                hasLoadedRef.current = false; // Reset on error to allow retry
        }
    };

  // Initial load and Socket.IO setup
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
  }, [location, dispatch, token, user]);

  // Effect to handle opening details once patients are loaded
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

  const handleSort = useCallback((field: keyof Patient) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const renderSortIndicator = (field: keyof Patient) => {
    if (sortField !== field) return <span className="w-4 h-4 ml-1 inline-block" />; // Spacer to maintain layout
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" /> 
      : <ArrowDown className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" />;
  };

  // Inline Editing Handlers - Memoized for performance
  const startInlineEdit = useCallback((p: Patient, field: keyof Patient) => {
    setEditingId(getPatientId(p));
    setEditingField(field);
    setEditValue(String(p[field] || ''));
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  }, []);

  const saveInlineEdit = useCallback(async (p: Patient) => {
    if (!editingField) return;
    setIsSavingInline(true);
    try {
        const updatedPatient = { ...p, [editingField]: editValue };
        await apiService.patients.update(updatedPatient);
        cancelInlineEdit();
    } catch (error) {
        console.error("Failed to update patient", error);
        alert("Failed to update patient info.");
    } finally {
        setIsSavingInline(false);
    }
  }, [editingField, editValue, cancelInlineEdit]);

  const filteredAndSortedPatients = useMemo(() => {
    // Ensure we have a fresh array reference for React to detect changes
    const patientsArray = Array.isArray(patients) ? [...patients] : [];
    
    let result = patientsArray.filter(p => 
       p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Create a copy before sorting to ensure we don't mutate frozen objects from Redux
    return [...result].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      
      // Handle patientId field
      if (sortField === 'patientId') {
        valA = getPatientId(a);
        valB = getPatientId(b);
      } else {
        const fieldValueA = a[sortField];
        const fieldValueB = b[sortField];
        // Convert to string for comparison, handling arrays and objects
        valA = Array.isArray(fieldValueA) ? fieldValueA.join(',') : (fieldValueA?.toString() || '');
        valB = Array.isArray(fieldValueB) ? fieldValueB.join(',') : (fieldValueB?.toString() || '');
      }
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [patients, searchTerm, sortField, sortOrder]);

  // Pagination Logic - Memoized for performance
  const { totalPages, paginatedPatients } = useMemo(() => {
    const total = Math.ceil(filteredAndSortedPatients.length / itemsPerPage);
    const paginated = filteredAndSortedPatients.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { totalPages: total, paginatedPatients: paginated };
  }, [filteredAndSortedPatients, itemsPerPage, currentPage]);

  // CSV Import Handler - Optimized with utility functions
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
            
            // Store first 10 for preview
            const previewRows = allRows.slice(0, 10);
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
            alert(error instanceof Error ? error.message : "Failed to parse CSV file. Please ensure it is formatted correctly.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    reader.onerror = () => {
        alert("Failed to read file.");
    };

    reader.readAsText(file);
  }, []);

  // Memoized handlers
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

  const handleOpenDetails = useCallback((patient: Patient) => {
    setSelectedPatientDetails(patient);
    setShowDetailsModal(true);
  }, []);

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
                gender: 'Male' // Default
            };

            // Map fields based on field mapping
            Object.keys(csvFieldMapping).forEach(csvHeader => {
                const fieldName = csvFieldMapping[csvHeader];
                const value = rowData[csvHeader];
                if (value && fieldName) {
                    // Clean and format values
                    let cleanedValue = String(value).trim();
                    
                    // Format gender
                    if (fieldName === 'gender' && cleanedValue) {
                        cleanedValue = cleanedValue.charAt(0).toUpperCase() + cleanedValue.slice(1).toLowerCase();
                        if (!['Male', 'Female', 'Other'].includes(cleanedValue)) {
                            cleanedValue = 'Male'; // Default
                        }
                    }
                    
                    // Format blood group
                    if (fieldName === 'bloodGroup' && cleanedValue) {
                        cleanedValue = cleanedValue.toUpperCase().replace(/\s+/g, '');
                    }
                    
                    newPatient[fieldName] = cleanedValue;
                }
            });

            // Validate patient data using utility function
            const validationResult = validateCSVRow(rowData, csvFieldMapping, i + 2);
            if (validationResult.length > 0) {
                validationErrors[i + 2] = validationResult;
            } else {
                patientsToImport.push(newPatient);
            }
        }

        // If there are validation errors, show them but still try to import valid ones
        if (Object.keys(validationErrors).length > 0 && patientsToImport.length === 0) {
            const errors: Array<{ row: number; error: string }> = [];
            Object.keys(validationErrors).forEach(rowNum => {
                errors.push({ row: parseInt(rowNum), error: validationErrors[parseInt(rowNum)].join(', ') });
            });
            setImportResults({
                success: 0,
                failed: csvAllData.length,
                errors: errors.slice(0, 50)
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
            errors: errors.slice(0, 50) // Limit to first 50 errors
        });
        
        // Reset pagination to show new patients
        setCurrentPage(1);
        
        // Close preview modal
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
            errors: [{ row: 0, error: errorMessage }]
        });
    } finally {
        setIsImporting(false);
        setImportProgress({ current: 0, total: 0 });
    }
  };

  // Formik Configuration
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
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      mobileNumber: Yup.string().required('Phone number is required'),
      gender: Yup.string().oneOf(['Male', 'Female', 'Other']).required('Gender is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      address: Yup.string().optional().nullable(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        // Prepare patient data - convert empty bloodGroup to undefined
        const patientData = {
          ...values,
          bloodGroup: (values.bloodGroup && values.bloodGroup.trim() !== '') ? values.bloodGroup as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' : undefined,
        };

        if (editingPatient) {
          const updated = await apiService.patients.update({ ...editingPatient, ...patientData });
          // Ensure patientId is set for Redux update
          const normalizedUpdated = {
            ...updated,
            patientId: updated.patientId || updated.id?.toString() || editingPatient.patientId || editingPatient.id?.toString()
          };
          dispatch(updatePatient(normalizedUpdated));
          setEditingPatient(null);
        } else {
          const created = await apiService.patients.create({
             ...patientData,
             lastVisitDate: new Date().toISOString().split('T')[0],
             appointmentDate: '-',
             visits: []
          } as any);
          
          // Normalize patient data - ensure patientId is set and all required fields
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
            city: created.city || patientData.city,
            state: created.state || patientData.state,
            address: created.address || patientData.address,
            bloodGroup: created.bloodGroup || patientData.bloodGroup,
            lastVisitDate: created.lastVisitDate || new Date().toISOString().split('T')[0],
            appointmentDate: created.appointmentDate || '-'
          };
          
          // Add to Redux store - this will automatically reflect on screen
          console.log('Adding patient to Redux:', normalizedCreated);
          dispatch(addPatient(normalizedCreated));
          
          // Reset pagination to show the new patient (likely on first page)
          setCurrentPage(1);
          
          // Reset form after successful creation
          resetForm();
        }
        setShowModal(false);
        setAvailableCities([]);
      } catch (e) {
        console.error("Form submission error", e);
        alert("Failed to save patient.");
      }
    }
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
          <p className="text-gray-500">Manage patient records and history.</p>
        </div>
        <div className="flex gap-3">
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
                className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition font-medium"
             >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import CSV
             </button>
             <button 
                onClick={() => handleOpenModal()}
                className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition shadow-md shadow-blue-500/20 font-medium"
             >
               <Plus className="w-4 h-4" /> Add Patient
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
          {/* Sort Field */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <select 
                value={sortField}
                onChange={(e) => handleSort(e.target.value as keyof Patient)}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 cursor-pointer outline-none"
            >
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="lastVisitDate">Last Visit</option>
                <option value="patientId">Patient ID</option>
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

      {/* Patient List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('patientId')}>
                   <div className="flex items-center gap-2">
                     <span>Patient ID</span>
                     {sortField === 'patientId' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                   </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('name')}>
                   <div className="flex items-center gap-2">
                     <span>Name</span>
                     {sortField === 'name' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                   </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-2">
                      <span>Contact Info</span>
                      {sortField === 'email' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Gender</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Age</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">Blood Group</div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('lastVisitDate')}>
                    <div className="flex items-center gap-2">
                      <span>Last Visit</span>
                      {sortField === 'lastVisitDate' && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </div>
                </th>
                {/* <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors" onClick={() => handleSort('appointmentDate')}>
                    <div className="flex items-center gap-2">Next Appointment {renderSortIndicator('appointmentDate')}</div>
                </th> */}
                <th className="px-6 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient, index) => (
                <tr key={getPatientId(patient)} className="hover:bg-blue-50/50 transition-all duration-150 border-b border-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-blue-700">#{index + 1 + (currentPage - 1) * itemsPerPage}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {getPatientId(patient)}
                      </div>
                    </div>
                  </td>
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
                  
                  {/* Contact Info with Inline Edit */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                        {/* Email Edit */}
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
                                            if(e.key === 'Enter') saveInlineEdit(patient);
                                            if(e.key === 'Escape') cancelInlineEdit();
                                        }}
                                    />
                                    {isSavingInline ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    ) : (
                                        <>
                                            <button onClick={() => saveInlineEdit(patient)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Check className="w-4 h-4"/></button>
                                            <button onClick={cancelInlineEdit} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
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

                        {/* Phone Edit */}
                        <div className="flex items-center gap-2 group">
                             <div className="p-1.5 bg-green-100 rounded-lg">
                               <Phone className="w-3.5 h-3.5 text-green-600" />
                             </div>
                             {editingId === getPatientId(patient) && editingField === 'mobileNumber' ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in">
                                    <input 
                                        autoFocus
                                        disabled={isSavingInline}
                                        className={`w-36 text-sm border-2 ${isSavingInline ? 'border-blue-400 bg-blue-50 text-gray-500' : 'border-blue-300'} rounded-lg px-2 py-1 outline-none transition-all focus:ring-2 focus:ring-blue-500`}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (isSavingInline) return;
                                            if(e.key === 'Enter') saveInlineEdit(patient);
                                            if(e.key === 'Escape') cancelInlineEdit();
                                        }}
                                    />
                                    {isSavingInline ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                    ) : (
                                        <>
                                            <button onClick={() => saveInlineEdit(patient)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Check className="w-4 h-4"/></button>
                                            <button onClick={cancelInlineEdit} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
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
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                      {patient.gender || 'N/A'}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.age ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        {patient.age} {patient.age === 1 ? 'year' : 'years'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.bloodGroup ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        {patient.bloodGroup}
                    </span>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                        <div className="p-1.5 bg-purple-100 rounded-lg">
                          <CalendarDays className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                    {patient.lastVisitDateTime 
                            ? (
                              <>
                                <div className="font-medium text-gray-900">
                                  {new Date(patient.lastVisitDateTime).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                                  })}
                                </div>
                              </>
                            )
                            : patient.lastVisitDate && patient.lastVisitDate !== '-' ? (
                              <>
                                <div className="font-medium text-gray-900">{new Date(patient.lastVisitDate).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">Last visit</div>
                              </>
                            ) : (
                              <span className="text-gray-400">No visits</span>
                            )}
                        </div>
                    </div>
                  </td>
                  {/* <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {patient.appointmentDate}
                    </span>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                        onClick={() => handleOpenModal(patient)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:shadow-md"
                        title="Edit Patient"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Header - Fixed */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
                  <p className="text-xs text-blue-100">{editingPatient ? 'Update patient information' : 'Fill in the details to create a new patient'}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <form onSubmit={formik.handleSubmit} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Basic Information</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <User className="w-4 h-4 text-gray-400" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                      name="name"
                      type="text" 
                      placeholder="John Doe"
                      className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.name && formik.errors.name ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                  />
                  {formik.touched.name && formik.errors.name && (
                    <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {formik.errors.name}
                    </div>
                  )}
                </div>
              </div>
              {/* Contact Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input 
                        name="email"
                        type="email" 
                        placeholder="patient@gmail.com"
                        className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.email && formik.errors.email ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.email && formik.errors.email && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.email}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                        name="mobileNumber"
                        type="tel" 
                        placeholder="+91 98765 43210"
                        className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.mobileNumber && formik.errors.mobileNumber ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                        value={formik.values.mobileNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.mobileNumber && formik.errors.mobileNumber && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.mobileNumber}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Personal Details Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Personal Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: 'Male', icon: '👨', color: 'blue' },
                        { value: 'Female', icon: '👩', color: 'pink' },
                        { value: 'Other', icon: '👤', color: 'purple' }
                      ].map((option) => {
                        const isSelected = formik.values.gender === option.value;
                        let buttonClasses = 'relative p-4 rounded-xl border-2 transition-all duration-200 focus:outline-none ';
                        
                        if (option.color === 'blue') {
                          buttonClasses += isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/20 hover:border-blue-600 focus:ring-2 focus:ring-blue-500/20' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 focus:ring-2 focus:ring-blue-500/20';
                        } else if (option.color === 'pink') {
                          buttonClasses += isSelected 
                            ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-md shadow-pink-500/20 hover:border-pink-600 focus:ring-2 focus:ring-pink-500/20' 
                            : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50 focus:ring-2 focus:ring-pink-500/20';
                        } else {
                          buttonClasses += isSelected 
                            ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md shadow-purple-500/20 hover:border-purple-600 focus:ring-2 focus:ring-purple-500/20' 
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 focus:ring-2 focus:ring-purple-500/20';
                        }
                        
                        if (formik.touched.gender && formik.errors.gender) {
                          buttonClasses += ' border-red-500';
                        }
                        
                        if (isSelected) {
                          buttonClasses += ' scale-105';
                        }
                        
                        let badgeClasses = 'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ';
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
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-2xl">{option.icon}</span>
                              <span className="font-semibold text-sm">{option.value}</span>
                            </div>
                            {isSelected && (
                              <div className={badgeClasses}>
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {formik.touched.gender && formik.errors.gender && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.gender}
                      </div>
                    )}
                    {formik.values.gender && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-500" />
                        Selected: <span className="font-medium text-gray-700">{formik.values.gender}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      Age
                    </label>
                    <input 
                        name="age"
                        type="number" 
                        min="0"
                        max="150"
                        placeholder="25"
                        className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.age && formik.errors.age ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`}
                        value={formik.values.age || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                          formik.setFieldValue('age', value);
                        }}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.age && formik.errors.age && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.age}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Droplet className="w-4 h-4 text-gray-400" />
                      Blood Group
                      {formik.touched.bloodGroup && formik.errors.bloodGroup && (
                          <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                            <button
                                key={group}
                                type="button"
                                onClick={() => {
                                    formik.setFieldValue('bloodGroup', formik.values.bloodGroup === group ? '' : group);
                                    formik.setFieldTouched('bloodGroup', true);
                                }}
                                onBlur={() => formik.setFieldTouched('bloodGroup', true)}
                                className={`
                                    relative p-2.5 rounded-xl border-2 transition-all duration-200
                                    ${formik.values.bloodGroup === group
                                        ? 'border-red-500 bg-red-50 text-red-700 shadow-md shadow-red-500/20 scale-105'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-red-300 hover:bg-red-50/50'
                                    }
                                    ${formik.touched.bloodGroup && formik.errors.bloodGroup ? 'border-red-500' : ''}
                                    focus:outline-none focus:ring-2 focus:ring-red-500/20
                                `}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <Droplet className={`w-4 h-4 ${formik.values.bloodGroup === group ? 'text-red-600' : 'text-gray-400'}`} />
                                    <span className="font-bold text-xs">{group}</span>
                                </div>
                                {formik.values.bloodGroup === group && (
                                    <div className="absolute -top-1 -right-1">
                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {formik.touched.bloodGroup && formik.errors.bloodGroup && (
                        <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {formik.errors.bloodGroup}
                        </div>
                    )}
                    {formik.values.bloodGroup && (
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <Droplet className="w-3 h-3 text-red-500" />
                            Selected: <span className="font-medium text-gray-700">{formik.values.bloodGroup}</span>
                        </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Location Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Location</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      State <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                        options={indiaStates}
                        value={formik.values.state}
                        onChange={(value) => {
                          formik.setFieldValue('state', value);
                          formik.setFieldValue('city', ''); // Reset city when state changes
                          setAvailableCities(getCitiesByState(value));
                        }}
                        onBlur={() => formik.setFieldTouched('state', true)}
                        placeholder="Select State"
                        error={formik.touched.state && !!formik.errors.state}
                    />
                    {formik.touched.state && formik.errors.state && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.state}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      City <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                        options={availableCities}
                        value={formik.values.city}
                        onChange={(value) => formik.setFieldValue('city', value)}
                        onBlur={() => formik.setFieldTouched('city', true)}
                        placeholder={formik.values.state ? 'Select City' : 'Select State First'}
                        disabled={!formik.values.state}
                        error={formik.touched.city && !!formik.errors.city}
                    />
                    {formik.touched.city && formik.errors.city && (
                      <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {formik.errors.city}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Address <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                  </label>
                  <textarea 
                      name="address"
                      rows={3}
                      placeholder="123 Main Street, Sector 5, Near Park, City - 123456"
                      className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.address && formik.errors.address ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none transition-all`}
                      value={formik.values.address}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                  />
                  {formik.touched.address && formik.errors.address && (
                    <div className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {formik.errors.address}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition font-medium flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={formik.isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formik.isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingPatient ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingPatient ? 'Update Patient' : 'Create Patient'}
                    </>
                  )}
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPatientDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
                {/* Header with Gradient - Fixed */}
                <div className="relative h-40 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 flex-shrink-0">
                     <button 
                        onClick={() => setShowDetailsModal(false)}
                        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors backdrop-blur-sm"
                     >
                        <X className="w-5 h-5" />
                     </button>
                     <div className="absolute -bottom-16 left-8 flex items-end gap-4">
                        <div className="w-32 h-32 bg-white rounded-2xl shadow-xl p-2 flex items-center justify-center">
                            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-4xl font-bold text-blue-600">
                                {selectedPatientDetails.name.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <div className="mb-4">
                             <h2 className="text-3xl font-bold text-gray-900 mb-1">{selectedPatientDetails.name}</h2>
                             <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {selectedPatientDetails.gender}
                                </span>
                                <span>•</span>
                                <span>ID: {getPatientId(selectedPatientDetails)}</span>
                                {selectedPatientDetails.bloodGroup && (
                                    <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Droplet className="w-4 h-4 text-red-500" />
                                            {selectedPatientDetails.bloodGroup}
                                        </span>
                                    </>
                                )}
                             </div>
                        </div>
                     </div>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-20 px-8 pb-8 space-y-6">
                     {/* Action Buttons */}
                     <div className="flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setShowDetailsModal(false);
                                handleOpenModal(selectedPatientDetails);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 flex items-center gap-2 text-sm font-medium"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Patient
                        </button>
                     </div>

                     {/* Info Grids */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Info */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-blue-600" />
                                Contact Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Mail className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-0.5">Email</div>
                                        <div className="font-medium text-gray-900">{selectedPatientDetails.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <Phone className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-gray-500 mb-0.5">Mobile</div>
                                        <div className="font-medium text-gray-900">{selectedPatientDetails.mobileNumber}</div>
                                    </div>
                                </div>
                                {selectedPatientDetails.address && (
                                    <div className="flex items-start gap-3 text-sm">
                                        <div className="p-2 bg-white rounded-lg shadow-sm mt-0.5">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 mb-0.5">Address</div>
                                            <div className="font-medium text-gray-900">{selectedPatientDetails.address}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Location & Personal Info */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-100 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-600" />
                                Location & Details
                            </h3>
                            <div className="space-y-3">
                                {selectedPatientDetails.city && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <MapPin className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 mb-0.5">City</div>
                                            <div className="font-medium text-gray-900">{selectedPatientDetails.city}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedPatientDetails.state && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <MapPin className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 mb-0.5">State</div>
                                            <div className="font-medium text-gray-900">{selectedPatientDetails.state}</div>
                                        </div>
                                    </div>
                                )}
                                {selectedPatientDetails.bloodGroup && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <Droplet className="w-4 h-4 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-xs text-gray-500 mb-0.5">Blood Group</div>
                                            <div className="font-medium text-gray-900">{selectedPatientDetails.bloodGroup}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                     </div>

                     {/* Key Dates */}
                     <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-100 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-green-600" />
                            Important Dates
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded-lg shadow-sm">
                                <div className="text-xs text-gray-500 mb-1">Last Visit</div>
                                <div className="font-semibold text-gray-900 text-sm">
                                    {selectedPatientDetails.lastVisitDateTime 
                                        ? new Date(selectedPatientDetails.lastVisitDateTime).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                          })
                                        : selectedPatientDetails.lastVisitDate || 'N/A'}
                                </div>
                                {selectedPatientDetails.lastVisitDateTime && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Date(selectedPatientDetails.lastVisitDateTime).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                    </div>
                                )}
                            </div>
                            {selectedPatientDetails.appointmentDate && (
                                <div className="bg-white p-3 rounded-lg shadow-sm border-2 border-blue-200">
                                    <div className="text-xs text-gray-500 mb-1">Next Appointment</div>
                                    <div className="font-semibold text-blue-600 text-sm">{selectedPatientDetails.appointmentDate}</div>
                                </div>
                            )}
                            {selectedPatientDetails.lastReminderDate && (
                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1">Last Reminder</div>
                                    <div className="font-semibold text-gray-900 text-sm">{selectedPatientDetails.lastReminderDate}</div>
                                </div>
                            )}
                        </div>
                     </div>

                     {/* Medical History */}
                     <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> 
                            Medical History
                            {selectedPatientDetails.visits && selectedPatientDetails.visits.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    {selectedPatientDetails.visits.length} {selectedPatientDetails.visits.length === 1 ? 'Visit' : 'Visits'}
                                </span>
                            )}
                        </h3>
                        {selectedPatientDetails.visits && selectedPatientDetails.visits.length > 0 ? (
                            <div className="space-y-3">
                                {[...selectedPatientDetails.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit) => (
                                    <div key={visit.visitId} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 hover:border-blue-200 transition-all shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                <span className="font-bold text-gray-900">{visit.diagnosis}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                                <Calendar className="w-3 h-3" />
                                                {visit.date}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                            <div className="bg-blue-50 p-2 rounded-lg">
                                                <div className="text-xs text-gray-500 mb-1">Prescription</div>
                                                <div className="text-sm font-medium text-gray-900">{visit.prescription || 'N/A'}</div>
                                            </div>
                                            {visit.notes && (
                                                <div className="bg-gray-50 p-2 rounded-lg">
                                                    <div className="text-xs text-gray-500 mb-1">Notes</div>
                                                    <div className="text-sm text-gray-700 italic">"{visit.notes}"</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">No medical history records found.</p>
                                <p className="text-gray-400 text-sm mt-1">Medical visits will appear here once recorded.</p>
                            </div>
                        )}
                     </div>
                </div>
             </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">CSV Import Preview</h2>
                  <p className="text-xs text-blue-100">Review and confirm the data before importing ({csvAllData.length} total rows, showing first {csvPreviewData.length})</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  setCsvPreviewData([]);
                  setCsvAllData([]);
                  setCsvFieldMapping({});
                  setCsvHeaders([]);
                }}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Field Mapping Section */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Field Mapping</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {csvHeaders.map((header) => {
                  const mappedField = csvFieldMapping[header] || 'Not mapped';
                  return (
                    <div key={header} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-500 mb-1">CSV Column</div>
                      <div className="font-medium text-gray-900 text-sm mb-2">{header}</div>
                      <select
                        value={mappedField}
                        onChange={(e) => {
                          const newMapping = { ...csvFieldMapping };
                          if (e.target.value === 'Not mapped') {
                            delete newMapping[header];
                          } else {
                            newMapping[header] = e.target.value;
                          }
                          setCsvFieldMapping(newMapping);
                        }}
                        className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Not mapped">Not mapped</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="mobileNumber">Mobile Number</option>
                        <option value="gender">Gender</option>
                        <option value="bloodGroup">Blood Group</option>
                        <option value="city">City</option>
                        <option value="state">State</option>
                        <option value="address">Address</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress Bar (during import) */}
            {isImporting && (
              <div className="px-6 pt-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    Importing patients... {importProgress.current} of {importProgress.total}
                  </span>
                  <span className="text-sm text-blue-600">
                    {Math.round((importProgress.current / importProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-sm font-medium border-b border-gray-200">
                        <th className="p-3 text-xs w-16">Row</th>
                        {csvHeaders.map((header) => (
                          <th key={header} className="p-3 text-xs">
                            {header}
                            {csvFieldMapping[header] && (
                              <span className="ml-1 text-blue-600">→ {csvFieldMapping[header]}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.map((row, index) => {
                        const rowNumber = index + 2; // +2 because row 0 is header, and we're 0-indexed
                        const rowErrors = csvValidationErrors[rowNumber] || [];
                        const hasErrors = rowErrors.length > 0;
                        
                        return (
                          <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${hasErrors ? 'bg-red-50' : ''}`}>
                            <td className="p-3 text-xs text-gray-500 font-medium w-16">
                              Row {rowNumber}
                              {hasErrors && (
                                <span className="ml-1 text-red-600" title={rowErrors.join(', ')}>⚠</span>
                              )}
                            </td>
                            {csvHeaders.map((header) => {
                              const value = row[header] || '';
                              const isMapped = csvFieldMapping[header];
                              return (
                                <td 
                                  key={header} 
                                  className={`p-3 text-sm ${isMapped ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
                                >
                                  {value || '-'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {csvPreviewData.length >= 10 && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Showing first 10 rows. All {csvAllData.length} rows will be imported.
                </p>
              )}
              {Object.keys(csvValidationErrors).length > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ {Object.keys(csvValidationErrors).length} row(s) have validation errors
                  </p>
                  <p className="text-xs text-yellow-700">
                    Rows with errors are highlighted in red. Please fix them or they will be skipped during import.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
              <button 
                type="button" 
                onClick={() => {
                  setShowPreviewModal(false);
                  setCsvPreviewData([]);
                  setCsvAllData([]);
                  setCsvFieldMapping({});
                  setCsvHeaders([]);
                }}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting || csvPreviewData.length === 0}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing... ({importProgress.current}/{importProgress.total})
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirm Import ({csvAllData.length} rows)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Results Modal */}
      {importResults && !isImporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200 overflow-hidden">
            {/* Header */}
            <div className={`p-6 rounded-t-2xl flex justify-between items-center flex-shrink-0 ${
              importResults.failed === 0 
                ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                : importResults.success > 0 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  : 'bg-gradient-to-r from-red-600 to-pink-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  {importResults.failed === 0 ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <FileText className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Import Complete</h2>
                  <p className="text-xs text-white/80">
                    {importResults.success} successful, {importResults.failed} failed
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setImportResults(null);
                  setImportProgress({ current: 0, total: 0 });
                }}
                className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Results Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
                    <div className="text-sm text-green-600 mb-1">Successfully Imported</div>
                    <div className="text-2xl font-bold text-green-700">{importResults.success}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                    <div className="text-sm text-red-600 mb-1">Failed</div>
                    <div className="text-2xl font-bold text-red-700">{importResults.failed}</div>
                  </div>
                </div>

                {/* Error Details */}
                {importResults.errors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-700 mb-3">Error Details</h3>
                    <div className="bg-gray-50 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="p-2 text-left text-xs text-gray-600">Row</th>
                            <th className="p-2 text-left text-xs text-gray-600">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResults.errors.map((error, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td className="p-2 font-medium text-gray-900">{error.row}</td>
                              <td className="p-2 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importResults.errors.length >= 50 && (
                        <p className="p-3 text-xs text-gray-500 text-center">
                          Showing first 50 errors. There may be more.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {importResults.success > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                    <p className="text-sm text-blue-700">
                      ✓ {importResults.success} patient(s) have been added to your patient list.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="p-6 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button 
                onClick={() => {
                  setImportResults(null);
                  setImportProgress({ current: 0, total: 0 });
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 font-medium"
              >
                Close
              </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default Patients;
