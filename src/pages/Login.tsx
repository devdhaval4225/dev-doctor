
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { RootState, login, setUser, addNotification } from '../redux/store';
import { apiService } from '../services/api';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Loader2, Mail, Lock, Eye, EyeOff, Check, Stethoscope, Calendar, Users, Activity, ArrowRight, Shield, Clock, Heart, Zap } from 'lucide-react';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      // If user is authenticated, redirect to dashboard
      if (isAuthenticated && token) {
        // Optionally verify token is still valid
        try {
          // Try to get user profile to verify token is valid
          await apiService.user.getProfile();
          navigate('/', { replace: true });
        } catch (error) {
          // Token might be invalid, clear auth and show login
          console.log('Token validation failed, showing login page');
          setIsCheckingAuth(false);
        }
      } else {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, token, navigate]);

  const handleSocialLogin = async (provider: string) => {
    try {
        console.log(`Logging in with ${provider}`);
        const result = await apiService.auth.login(provider);
        dispatch(login(result.token));
        if (result.user) {
          dispatch(setUser(result.user));
        }
        // Redirect to dashboard after successful login
        navigate('/', { replace: true });
    } catch (e) {
        console.error("Login failed", e);
        dispatch(addNotification({
          id: `warning-${Date.now()}`,
          title: 'Warning',
          message: 'Social login is not fully supported in this demo environment.',
          type: 'warning',
          timestamp: new Date().toISOString()
        }));
    }
  };

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema: Yup.object({
      email: Yup.string().email('Invalid email address').required('Email is required'),
      password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required')
    }),
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const result = await apiService.auth.login(values.email, values.password);
        dispatch(login(result.token));
        if (result.user) {
          dispatch(setUser(result.user));
        }
        // Redirect to dashboard after successful login
        navigate('/', { replace: true });
      } catch (e) {
        console.error("Login failed", e);
        // Error notification is handled by apiService
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white z-10">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start items-center gap-2 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/30">
                    M
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight">MediNexus</span>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please enter your details to sign in.
            </p>
          </div>

          <div className="mt-8">

            <div className="mt-6">
              <form onSubmit={formik.handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={`block w-full pl-10 pr-3 py-3 border ${formik.touched.email && formik.errors.email ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'} rounded-xl focus:outline-none focus:ring-2 sm:text-sm bg-gray-50 focus:bg-white transition-colors`}
                      placeholder="Enter your email"
                      value={formik.values.email}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                  </div>
                  {formik.touched.email && formik.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{formik.errors.email}</p>
                  )}
                </div>
                  
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className={`block w-full pl-10 pr-10 py-3 border ${formik.touched.password && formik.errors.password ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'} rounded-xl focus:outline-none focus:ring-2 sm:text-sm bg-gray-50 focus:bg-white transition-colors`}
                      placeholder="Enter your password"
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                  </div>
                  {formik.touched.password && formik.errors.password && (
                    <p className="mt-1 text-xs text-red-600">{formik.errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)} 
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-transparent' : 'bg-white border-gray-300'}`}
                    >
                        {rememberMe && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                      Forgot your password?
                    </a>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={formik.isSubmitting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.01]"
                  >
                    {formik.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Sign in
                  </button>
                </div>
              </form>
            </div>
            
             <p className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
                    Register for free
                </Link>
             </p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-900 z-0"></div>
        <img
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-40"
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80"
          alt="Medical Team"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-20 z-10 text-white">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
                <blockquote className="space-y-4">
                    <p className="text-lg font-medium leading-relaxed">
                    "MediNexus has completely transformed how we manage patient records and appointments. It's intuitive, fast, and secure."
                    </p>
                    <footer className="flex items-center gap-4 pt-4 border-t border-white/10">
                        <img 
                            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80" 
                            className="w-12 h-12 rounded-full border-2 border-blue-200" 
                            alt="Dr. Sarah"
                        />
                        <div>
                            <div className="font-bold">Dr. Sarah Smith</div>
                            <div className="text-blue-200 text-sm">Chief of Cardiology</div>
                        </div>
                    </footer>
                </blockquote>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
