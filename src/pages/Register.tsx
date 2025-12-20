import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { apiService } from '../services/api';
import { login, setUser, addNotification } from '../redux/store';
import { 
  Loader2, Mail, Lock, Eye, EyeOff, User, Phone, MapPin, 
  Clock, Briefcase, ChevronRight, ChevronLeft, CheckCircle2, XCircle,
  Sparkles, Shield, CheckCircle, Building2, Image as ImageIcon, FileText, Upload, X
} from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import SearchableSelect from '../components/SearchableSelect';
import { indiaStates, getCitiesByState } from '../data/indiaStatesCities';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Image states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  
  // City and State selection
  const [selectedState, setSelectedState] = useState<string>('');
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Step 1: Name and Email
  const step1Formik = useFormik({
    initialValues: {
      name: '',
      email: ''
    },
    validationSchema: Yup.object({
      name: Yup.string().min(2, 'Name must be at least 2 characters').required('Name is required'),
      email: Yup.string().email('Invalid email address').required('Email is required')
    }),
    onSubmit: async (values) => {
      setIsCheckingEmail(true);
      setEmailExists(null);
      try {
        const result = await apiService.auth.checkEmail(values.email);
        if (result.exists) {
          setEmailExists(true);
          dispatch(addNotification({
            id: `error-${Date.now()}`,
            title: 'Email Already Exists',
            message: 'This email is already registered. Please use a different email or try logging in.',
            type: 'error',
            timestamp: new Date().toISOString()
          }));
        } else {
          setEmailExists(false);
          setCurrentStep(2);
        }
      } catch (error: any) {
        console.error('Email check failed:', error);
        dispatch(addNotification({
          id: `error-${Date.now()}`,
          title: 'Error',
          message: 'Failed to check email. Please try again.',
          type: 'error',
          timestamp: new Date().toISOString()
        }));
      } finally {
        setIsCheckingEmail(false);
      }
    }
  });

  // Step 2: Password, Mobile, Specialization, Clinic Name, Clinic Address, City, State
  const step2Formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: '',
      mobile_number: '',
      specialization: '',
      clinic_name: '',
      clinic_address: '',
      city: '',
      state: ''
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
      mobile_number: Yup.string().required('Mobile number is required'),
      specialization: Yup.string().required('Specialization is required'),
      clinic_name: Yup.string().required('Clinic name is required'),
      clinic_address: Yup.string().required('Clinic address is required'),
      city: Yup.string().optional(),
      state: Yup.string().optional()
    }),
    onSubmit: async (values, { setSubmitting }) => {
      const errors = await step2Formik.validateForm();
      if (Object.keys(errors).length === 0) {
        setCurrentStep(3);
      }
      setSubmitting(false);
    }
  });

  // Step 3: Profile Image, Cover Image, About
  const step3Formik = useFormik({
    initialValues: {
      about: ''
    },
    validationSchema: Yup.object({
      about: Yup.string().max(1000, 'About must be less than 1000 characters').optional()
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setCurrentStep(4);
      setSubmitting(false);
    }
  });

  // Step 4: Availability
  const step4Formik = useFormik({
    initialValues: {
      availability: {}
    },
    onSubmit: async (values, { setSubmitting }) => {
      setSubmitting(false);
      // Registration will be handled in the submit handler
    }
  });

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      dispatch(addNotification({
        id: `error-${Date.now()}`,
        title: 'Invalid File',
        message: 'Please select an image file',
        type: 'error',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      dispatch(addNotification({
        id: `error-${Date.now()}`,
        title: 'File Too Large',
        message: 'Image must be less than 5MB',
        type: 'error',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    if (type === 'profile') {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const handleRemoveImage = (type: 'profile' | 'cover') => {
    if (type === 'profile') {
      setProfileImage(null);
      setProfileImagePreview(null);
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = '';
      }
    } else {
      setCoverImage(null);
      setCoverImagePreview(null);
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
    }
  };

  // Final registration submission
  const handleFinalRegistration = async () => {
    setIsRegistering(true);
    
    try {
      // Prepare registration data (without images first)
      const registrationData = {
        name: step1Formik.values.name,
        email: step1Formik.values.email,
        password: step2Formik.values.password,
        mobile_number: step2Formik.values.mobile_number,
        address: step2Formik.values.clinic_address,
        city: step2Formik.values.city || undefined,
        state: step2Formik.values.state || undefined,
        specialization: step2Formik.values.specialization,
        clinic_name: step2Formik.values.clinic_name,
        about: step3Formik.values.about || undefined,
        availability: step4Formik.values.availability
      };

      // Register first to get authentication token
      const result = await apiService.auth.register(registrationData);
      dispatch(login(result.token));
      dispatch(setUser(result.user));

      // Now upload images if provided (after authentication)
      setUploadingImages(true);
      
      if (profileImage) {
        try {
          await apiService.user.uploadProfileImage(profileImage, 'avatar');
        } catch (error) {
          console.error('Failed to upload profile image:', error);
          // Continue even if image upload fails
        }
      }

      if (coverImage) {
        try {
          await apiService.user.uploadProfileImage(coverImage, 'cover_image');
        } catch (error) {
          console.error('Failed to upload cover image:', error);
          // Continue even if image upload fails
        }
      }

      setUploadingImages(false);
      
      dispatch(addNotification({
        id: `success-${Date.now()}`,
        title: 'Success',
        message: 'Registration successful! Welcome to MediNexus.',
        type: 'success',
        timestamp: new Date().toISOString()
      }));

      navigate('/', { replace: true });
    } catch (error: any) {
      console.error('Registration failed:', error);
      setUploadingImages(false);
    } finally {
      setIsRegistering(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: User, description: 'Name & Email' },
    { number: 2, title: 'Details', icon: Briefcase, description: 'Password & Clinic' },
    { number: 3, title: 'Profile', icon: ImageIcon, description: 'Images & About' },
    { number: 4, title: 'Availability', icon: Clock, description: 'Schedule' }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <form onSubmit={step1Formik.handleSubmit} className="space-y-6">
            <div className="space-y-1 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Let's get started</h3>
              <p className="text-gray-600">Enter your basic information to begin</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className={`w-5 h-5 transition-colors ${
                    step1Formik.touched.name && step1Formik.errors.name
                      ? 'text-red-400'
                      : 'text-gray-400 group-focus-within:text-blue-500'
                  }`} />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                    step1Formik.touched.name && step1Formik.errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step1Formik.values.name}
                  onChange={step1Formik.handleChange}
                  onBlur={step1Formik.handleBlur}
                />
              </div>
              {step1Formik.touched.name && step1Formik.errors.name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step1Formik.errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className={`w-5 h-5 transition-colors ${
                    step1Formik.touched.email && step1Formik.errors.email || emailExists === true
                      ? 'text-red-400'
                      : emailExists === false
                      ? 'text-green-500'
                      : 'text-gray-400 group-focus-within:text-blue-500'
                  }`} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                    step1Formik.touched.email && step1Formik.errors.email || emailExists === true
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : emailExists === false
                      ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20 bg-green-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step1Formik.values.email}
                  onChange={(e) => {
                    step1Formik.handleChange(e);
                    setEmailExists(null);
                  }}
                  onBlur={step1Formik.handleBlur}
                />
                {emailExists === false && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                )}
                {emailExists === true && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}
              </div>
              {step1Formik.touched.email && step1Formik.errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step1Formik.errors.email}
                </p>
              )}
              {emailExists === true && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  This email is already registered. Please use a different email.
                </p>
              )}
              {emailExists === false && (
                <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Email is available
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={async () => {
                const errors = await step1Formik.validateForm();
                if (Object.keys(errors).length === 0) {
                  step1Formik.handleSubmit();
                } else {
                  step1Formik.setTouched({
                    name: true,
                    email: true
                  });
                }
              }}
              disabled={isCheckingEmail || step1Formik.isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isCheckingEmail ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking Email...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={step2Formik.handleSubmit} className="space-y-6">
            <div className="space-y-1 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Account & Clinic Details</h3>
              <p className="text-gray-600">Set your password and clinic information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className={`w-5 h-5 transition-colors ${
                      step2Formik.touched.password && step2Formik.errors.password
                        ? 'text-red-400'
                        : 'text-gray-400 group-focus-within:text-blue-500'
                    }`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a password (min. 6 characters)"
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                      step2Formik.touched.password && step2Formik.errors.password
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                    }`}
                    value={step2Formik.values.password}
                    onChange={step2Formik.handleChange}
                    onBlur={step2Formik.handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {step2Formik.touched.password && step2Formik.errors.password && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    {step2Formik.errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Shield className={`w-5 h-5 transition-colors ${
                      step2Formik.touched.confirmPassword && step2Formik.errors.confirmPassword
                        ? 'text-red-400'
                        : step2Formik.values.confirmPassword && step2Formik.values.password === step2Formik.values.confirmPassword
                        ? 'text-green-500'
                        : 'text-gray-400 group-focus-within:text-blue-500'
                    }`} />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                      step2Formik.touched.confirmPassword && step2Formik.errors.confirmPassword
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                        : step2Formik.values.confirmPassword && step2Formik.values.password === step2Formik.values.confirmPassword
                        ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20 bg-green-50'
                        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                    }`}
                    value={step2Formik.values.confirmPassword}
                    onChange={step2Formik.handleChange}
                    onBlur={step2Formik.handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {step2Formik.touched.confirmPassword && step2Formik.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    {step2Formik.errors.confirmPassword}
                  </p>
                )}
                {step2Formik.values.confirmPassword && step2Formik.values.password === step2Formik.values.confirmPassword && !step2Formik.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                value={step2Formik.values.mobile_number}
                onChange={(value) => step2Formik.setFieldValue('mobile_number', value || '')}
                defaultCountry="IN"
                placeholder="Enter mobile number"
                className={step2Formik.touched.mobile_number && step2Formik.errors.mobile_number ? 'border-red-300 focus:border-red-500 bg-red-50' : ''}
              />
              {step2Formik.touched.mobile_number && step2Formik.errors.mobile_number && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step2Formik.errors.mobile_number}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Specialization <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className={`w-5 h-5 transition-colors ${
                    step2Formik.touched.specialization && step2Formik.errors.specialization
                      ? 'text-red-400'
                      : 'text-gray-400 group-focus-within:text-blue-500'
                  }`} />
                </div>
                <input
                  type="text"
                  name="specialization"
                  placeholder="e.g., Cardiologist, General Physician"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                    step2Formik.touched.specialization && step2Formik.errors.specialization
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step2Formik.values.specialization}
                  onChange={step2Formik.handleChange}
                  onBlur={step2Formik.handleBlur}
                />
              </div>
              {step2Formik.touched.specialization && step2Formik.errors.specialization && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step2Formik.errors.specialization}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Clinic Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className={`w-5 h-5 transition-colors ${
                    step2Formik.touched.clinic_name && step2Formik.errors.clinic_name
                      ? 'text-red-400'
                      : 'text-gray-400 group-focus-within:text-blue-500'
                  }`} />
                </div>
                <input
                  type="text"
                  name="clinic_name"
                  placeholder="Enter your clinic name"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all text-gray-900 placeholder-gray-400 ${
                    step2Formik.touched.clinic_name && step2Formik.errors.clinic_name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step2Formik.values.clinic_name}
                  onChange={step2Formik.handleChange}
                  onBlur={step2Formik.handleBlur}
                />
              </div>
              {step2Formik.touched.clinic_name && step2Formik.errors.clinic_name && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step2Formik.errors.clinic_name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                Clinic Address <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-4 pointer-events-none">
                  <MapPin className={`w-5 h-5 transition-colors ${
                    step2Formik.touched.clinic_address && step2Formik.errors.clinic_address
                      ? 'text-red-400'
                      : 'text-gray-400 group-focus-within:text-blue-500'
                  }`} />
                </div>
                <textarea
                  name="clinic_address"
                  rows={3}
                  placeholder="Enter your clinic address"
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all resize-none text-gray-900 placeholder-gray-400 ${
                    step2Formik.touched.clinic_address && step2Formik.errors.clinic_address
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step2Formik.values.clinic_address}
                  onChange={step2Formik.handleChange}
                  onBlur={step2Formik.handleBlur}
                />
              </div>
              {step2Formik.touched.clinic_address && step2Formik.errors.clinic_address && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step2Formik.errors.clinic_address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  State
                </label>
                <SearchableSelect
                  options={indiaStates}
                  value={step2Formik.values.state}
                  onChange={(value) => {
                    step2Formik.setFieldValue('state', value || '');
                    setSelectedState(value || '');
                    if (value) {
                      const cities = getCitiesByState(value);
                      setAvailableCities(cities);
                      step2Formik.setFieldValue('city', ''); // Reset city when state changes
                    } else {
                      setAvailableCities([]);
                      step2Formik.setFieldValue('city', '');
                    }
                  }}
                  placeholder="Select state"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  City
                </label>
                <SearchableSelect
                  options={availableCities}
                  value={step2Formik.values.city}
                  onChange={(value) => step2Formik.setFieldValue('city', value || '')}
                  placeholder={selectedState ? "Select city" : "Select state first"}
                  disabled={!selectedState}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  const errors = await step2Formik.validateForm();
                  if (Object.keys(errors).length === 0) {
                    setCurrentStep(3);
                  } else {
                    step2Formik.setTouched({
                      password: true,
                      confirmPassword: true,
                      mobile_number: true,
                      specialization: true,
                      clinic_name: true,
                      clinic_address: true
                    });
                  }
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 3:
        return (
          <form onSubmit={step3Formik.handleSubmit} className="space-y-6">
            <div className="space-y-1 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Profile Images & About</h3>
              <p className="text-gray-600">Add your profile picture, cover image, and bio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Profile Image
                </label>
                <div className="relative">
                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'profile')}
                    className="hidden"
                  />
                  {profileImagePreview ? (
                    <div className="relative">
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('profile')}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div className="p-3 bg-blue-100 rounded-full">
                        <ImageIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">Upload Profile Image</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Cover Image
                </label>
                <div className="relative">
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e, 'cover')}
                    className="hidden"
                  />
                  {coverImagePreview ? (
                    <div className="relative">
                      <img
                        src={coverImagePreview}
                        alt="Cover preview"
                        className="w-full h-48 object-cover rounded-xl border-2 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage('cover')}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => coverImageInputRef.current?.click()}
                      className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      <div className="p-3 bg-blue-100 rounded-full">
                        <ImageIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-700">Upload Cover Image</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                About
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-4 pointer-events-none">
                  <FileText className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <textarea
                  name="about"
                  rows={5}
                  placeholder="Tell us about yourself, your experience, and your practice..."
                  className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all resize-none text-gray-900 placeholder-gray-400 ${
                    step3Formik.touched.about && step3Formik.errors.about
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 bg-red-50'
                      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 focus:bg-white'
                  }`}
                  value={step3Formik.values.about}
                  onChange={step3Formik.handleChange}
                  onBlur={step3Formik.handleBlur}
                />
              </div>
              {step3Formik.touched.about && step3Formik.errors.about && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {step3Formik.errors.about}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {step3Formik.values.about.length}/1000 characters
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(4);
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        );

      case 4:
        return (
          <form onSubmit={step4Formik.handleSubmit} className="space-y-6">
            <div className="space-y-1 mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Set your availability</h3>
              <p className="text-gray-600">You can configure this later in Settings</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-8">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Availability Setup</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Don't worry about setting your availability right now. You can easily configure your schedule, working hours, and time slots after completing registration in the Settings section.
                  </p>
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">Quick Tip</p>
                        <p className="text-xs text-gray-600">
                          After registration, go to <strong>Settings → Availability</strong> to set up your weekly schedule, time slots, and manage your calendar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleFinalRegistration}
                disabled={isRegistering || uploadingImages}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isRegistering || uploadingImages ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {uploadingImages ? 'Uploading Images...' : 'Creating Account...'}
                  </>
                ) : (
                  <>
                    Complete Registration
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl mb-4 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all transform hover:scale-105">
            <span className="text-2xl font-bold text-white">M</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Create Your Account
          </h1>
          <p className="text-gray-600 text-lg">Join MediNexus and start managing your practice</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Progress Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 sm:px-8 py-6">
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.number;
                const isCompleted = currentStep > step.number;
                
                return (
                  <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center flex-1 z-10">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border-2 transition-all transform ${
                        isCompleted
                          ? 'bg-gradient-to-br from-green-500 to-green-600 border-green-500 text-white shadow-lg shadow-green-500/30 scale-105'
                          : isActive
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
                        ) : (
                          <StepIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                        )}
                      </div>
                      <div className="mt-3 text-center">
                        <p className={`text-xs sm:text-sm font-bold ${
                          isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {step.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          isActive || isCompleted ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-all ${
                        isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="p-6 sm:p-8 lg:p-12 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
