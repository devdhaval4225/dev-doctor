
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setPatients, addPatient, updatePatient } from '../redux/store';
import { apiService } from '../services/api';
import { Patient } from '../types';
import { getPatientId, findPatientById } from '../utils/patientUtils';
import { Plus, Search, X, Edit, Loader2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Clock, FileText, Upload, Check, Phone, Mail, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const Patients = () => {
  const { patients } = useSelector((state: RootState) => state.data);
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
  
  // Pagination & Sort & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<keyof Patient>('lastVisitDate'); // Default sort
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const location = useLocation();

  useEffect(() => {
    const loadPatients = async () => {
        // Only fetch if patients are not already loaded
        if (patients.length === 0) {
            try {
                const data = await apiService.patients.getAll();
                dispatch(setPatients(data));
            } catch (e) {
                console.error("Failed to fetch patients", e);
            }
        }
    };
    loadPatients();
    
    // Check for state from Dashboard
    if (location.state) {
        const state = location.state as any;
        if (state.openCreateModal) {
            handleOpenModal();
        }
        window.history.replaceState({}, document.title);
    }
  }, [location, dispatch, patients.length]);

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

  const handleOpenModal = (patient?: Patient) => {
    if (patient) {
      setEditingPatient(patient);
    } else {
      setEditingPatient(null);
    }
    setShowModal(true);
  };

  const handleOpenDetails = (patient: Patient) => {
      setSelectedPatientDetails(patient);
      setShowDetailsModal(true);
  };

  const handleSort = (field: keyof Patient) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const renderSortIndicator = (field: keyof Patient) => {
    if (sortField !== field) return <span className="w-4 h-4 ml-1 inline-block" />; // Spacer to maintain layout
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" /> 
      : <ArrowDown className="w-4 h-4 ml-1 inline-block text-blue-600 animate-in fade-in" />;
  };

  // Inline Editing Handlers
  const startInlineEdit = (p: Patient, field: keyof Patient) => {
    setEditingId(getPatientId(p));
    setEditingField(field);
    setEditValue(String(p[field] || ''));
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const saveInlineEdit = async (p: Patient) => {
    if (!editingField) return;
    setIsSavingInline(true);
    try {
        const updatedPatient = { ...p, [editingField]: editValue };
        const result = await apiService.patients.update(updatedPatient);
        dispatch(updatePatient(result));
        cancelInlineEdit();
    } catch (error) {
        console.error("Failed to update patient", error);
        alert("Failed to update patient info.");
    } finally {
        setIsSavingInline(false);
    }
  };

  const filteredAndSortedPatients = useMemo(() => {
    let result = patients.filter(p => 
       p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Create a copy before sorting to ensure we don't mutate frozen objects from Redux
    return [...result].sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [patients, searchTerm, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSortedPatients.length / itemsPerPage);
  const paginatedPatients = filteredAndSortedPatients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Import Handler
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            const rows = text.split('\n');
            if (rows.length < 2) {
                alert("CSV file is empty or missing data.");
                setIsImporting(false);
                return;
            }

            // Simple CSV parser
            const headers = rows[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
            
            let count = 0;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                
                if (values.length < 2) continue; 

                const newPatient: any = {
                    lastVisitDate: new Date().toISOString().split('T')[0],
                    appointmentDate: '-',
                    visits: []
                };

                headers.forEach((header, index) => {
                    const value = values[index];
                    if (!value) return;

                    if (header.includes('name')) newPatient.name = value;
                    else if (header.includes('email')) newPatient.email = value;
                    else if (header.includes('mobile') || header.includes('phone')) newPatient.mobileNumber = value;
                    else if (header.includes('gender')) newPatient.gender = value as any;
                    else if (header.includes('address')) newPatient.address = value;
                });

                // Fallback
                if (!newPatient.name && values[0]) newPatient.name = values[0];
                if (!newPatient.email && values[1] && values[1].includes('@')) newPatient.email = values[1];
                if (!newPatient.mobileNumber && values[2]) newPatient.mobileNumber = values[2];

                if (newPatient.name && newPatient.email) {
                    try {
                        const created = await apiService.patients.create(newPatient);
                        dispatch(addPatient(created));
                        count++;
                    } catch (err) {
                        console.error("Error creating patient from CSV", err);
                    }
                }
            }
            alert(`Successfully imported ${count} patients.`);
        } catch (error) {
            console.error("CSV Import Error", error);
            alert("Failed to parse CSV file. Please ensure it is formatted correctly.");
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    reader.onerror = () => {
        alert("Failed to read file.");
        setIsImporting(false);
    };

    reader.readAsText(file);
  };

  // Formik Configuration
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editingPatient?.name || '',
      email: editingPatient?.email || '',
      mobileNumber: editingPatient?.mobileNumber || '',
      gender: editingPatient?.gender || 'Male',
      address: editingPatient?.address || '',
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      email: Yup.string().email('Invalid email').required('Email is required'),
      mobileNumber: Yup.string().required('Phone number is required'),
      address: Yup.string().required('Address is required'),
    }),
    onSubmit: async (values) => {
      try {
        if (editingPatient) {
          const updated = await apiService.patients.update({ ...editingPatient, ...values });
          dispatch(updatePatient(updated));
        } else {
          const created = await apiService.patients.create({
             ...values,
             lastVisitDate: new Date().toISOString().split('T')[0],
             appointmentDate: '-',
             visits: []
          } as any);
          dispatch(addPatient(created));
        }
        setShowModal(false);
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

      {/* Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm font-medium border-b border-gray-100">
                <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                   <div className="flex items-center">Name {renderSortIndicator('name')}</div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('email')}>
                    <div className="flex items-center">Contact Info {renderSortIndicator('email')}</div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('lastVisitDate')}>
                    <div className="flex items-center">Last Visit {renderSortIndicator('lastVisitDate')}</div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('appointmentDate')}>
                    <div className="flex items-center">Next Appointment {renderSortIndicator('appointmentDate')}</div>
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPatients.length > 0 ? paginatedPatients.map((patient) => (
                <tr key={getPatientId(patient)} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div 
                        onClick={() => handleOpenDetails(patient)}
                        className="font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        {patient.name}
                    </div>
                    <div className="text-xs text-gray-500">{patient.gender} • ID: {getPatientId(patient)}</div>
                  </td>
                  
                  {/* Contact Info with Inline Edit */}
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                        {/* Email Edit */}
                        <div className="flex items-center gap-2 group h-6">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {editingId === getPatientId(patient) && editingField === 'email' ? (
                                <div className="flex items-center gap-1 animate-in fade-in">
                                    <input 
                                        autoFocus
                                        disabled={isSavingInline}
                                        className={`w-40 text-sm border ${isSavingInline ? 'border-blue-400 bg-blue-50 text-gray-500' : 'border-blue-300'} rounded px-1 py-0.5 outline-none transition-colors`}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (isSavingInline) return;
                                            if(e.key === 'Enter') saveInlineEdit(patient);
                                            if(e.key === 'Escape') cancelInlineEdit();
                                        }}
                                    />
                                    {isSavingInline ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                    ) : (
                                        <>
                                            <button onClick={() => saveInlineEdit(patient)} className="text-green-600 hover:bg-green-50 p-0.5 rounded"><Check className="w-3 h-3"/></button>
                                            <button onClick={cancelInlineEdit} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X className="w-3 h-3"/></button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <span className="text-sm text-gray-700">{patient.email}</span>
                                    <button 
                                        onClick={() => startInlineEdit(patient, 'email')}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Phone Edit */}
                        <div className="flex items-center gap-2 group h-6">
                             <Phone className="w-3 h-3 text-gray-400" />
                             {editingId === getPatientId(patient) && editingField === 'mobileNumber' ? (
                                <div className="flex items-center gap-1 animate-in fade-in">
                                    <input 
                                        autoFocus
                                        disabled={isSavingInline}
                                        className={`w-32 text-sm border ${isSavingInline ? 'border-blue-400 bg-blue-50 text-gray-500' : 'border-blue-300'} rounded px-1 py-0.5 outline-none transition-colors`}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (isSavingInline) return;
                                            if(e.key === 'Enter') saveInlineEdit(patient);
                                            if(e.key === 'Escape') cancelInlineEdit();
                                        }}
                                    />
                                    {isSavingInline ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                    ) : (
                                        <>
                                            <button onClick={() => saveInlineEdit(patient)} className="text-green-600 hover:bg-green-50 p-0.5 rounded"><Check className="w-3 h-3"/></button>
                                            <button onClick={cancelInlineEdit} className="text-red-500 hover:bg-red-50 p-0.5 rounded"><X className="w-3 h-3"/></button>
                                        </>
                                    )}
                                </div>
                             ) : (
                                <>
                                    <span className="text-xs text-gray-500">{patient.mobileNumber}</span>
                                    <button 
                                        onClick={() => startInlineEdit(patient, 'mobileNumber')}
                                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-opacity"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                </>
                             )}
                        </div>
                    </div>
                  </td>

                  <td className="p-4 text-sm text-gray-600">{patient.lastVisitDate}</td>
                  <td className="p-4">
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        {patient.appointmentDate}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                        onClick={() => handleOpenModal(patient)}
                        className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No patients found.</td>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingPatient ? 'Edit Patient' : 'Add New Patient'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={formik.handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                    name="name"
                    type="text" 
                    placeholder="Enter full name"
                    className={`w-full bg-white text-gray-900 border ${formik.touched.name && formik.errors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                />
                {formik.touched.name && formik.errors.name && <div className="text-red-500 text-xs mt-1">{formik.errors.name}</div>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input 
                        name="email"
                        type="email" 
                        placeholder="email@example.com"
                        className={`w-full bg-white text-gray-900 border ${formik.touched.email && formik.errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.email && formik.errors.email && <div className="text-red-500 text-xs mt-1">{formik.errors.email}</div>}
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input 
                        name="mobileNumber"
                        type="tel" 
                        placeholder="+1 234 567 890"
                        className={`w-full bg-white text-gray-900 border ${formik.touched.mobileNumber && formik.errors.mobileNumber ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none`}
                        value={formik.values.mobileNumber}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                    />
                    {formik.touched.mobileNumber && formik.errors.mobileNumber && <div className="text-red-500 text-xs mt-1">{formik.errors.mobileNumber}</div>}
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select 
                        name="gender"
                        className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formik.values.gender}
                        onChange={formik.handleChange}
                    >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                 </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea 
                    name="address"
                    rows={2}
                    placeholder="Enter full address"
                    className={`w-full bg-white text-gray-900 border ${formik.touched.address && formik.errors.address ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none`}
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                />
                {formik.touched.address && formik.errors.address && <div className="text-red-500 text-xs mt-1">{formik.errors.address}</div>}
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
                  disabled={formik.isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  {formik.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingPatient ? 'Update Patient' : 'Add Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPatientDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
                     <button 
                        onClick={() => setShowDetailsModal(false)}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
                     >
                        <X className="w-5 h-5" />
                     </button>
                     <div className="absolute -bottom-12 left-8 flex items-end">
                        <div className="w-24 h-24 bg-white rounded-2xl shadow-lg p-1">
                            <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-3xl font-bold text-gray-400">
                                {selectedPatientDetails.name.charAt(0)}
                            </div>
                        </div>
                        <div className="ml-4 mb-2">
                             <h2 className="text-2xl font-bold text-gray-900">{selectedPatientDetails.name}</h2>
                             <p className="text-sm text-gray-500">{selectedPatientDetails.gender} • ID: {getPatientId(selectedPatientDetails)}</p>
                        </div>
                     </div>
                </div>
                
                <div className="pt-16 px-8 pb-8 space-y-8">
                     {/* Info Grids */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Info */}
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Info</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                    {selectedPatientDetails.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-700">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    {selectedPatientDetails.mobileNumber}
                                </div>
                                <div className="flex items-start gap-3 text-sm text-gray-700">
                                    <div className="w-4 h-4 mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-500 mx-auto"></div></div>
                                    {selectedPatientDetails.address}
                                </div>
                            </div>
                        </div>
                        
                         {/* Key Dates */}
                         <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Key Dates</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Last Visit</span>
                                    <span className="font-medium text-gray-900">{selectedPatientDetails.lastVisitDate}</span>
                                </div>
                                 <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Next Appt.</span>
                                    <span className="font-medium text-blue-600">{selectedPatientDetails.appointmentDate}</span>
                                </div>
                            </div>
                        </div>
                     </div>

                     {/* Medical History */}
                     <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" /> Medical History
                        </h3>
                        {selectedPatientDetails.visits && selectedPatientDetails.visits.length > 0 ? (
                            <div className="space-y-4">
                                {[...selectedPatientDetails.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((visit) => (
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

export default Patients;
