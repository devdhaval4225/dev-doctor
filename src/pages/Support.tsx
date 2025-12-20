import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Mail, Phone, MessageCircle, Loader2, Send, BookOpen, ArrowRight, Headphones, Clock, CheckCircle2 } from 'lucide-react';
import { addNotification } from '../redux/store';

const Support = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const formik = useFormik({
    initialValues: {
      subject: '',
      message: '',
      priority: 'Low'
    },
    validationSchema: Yup.object({
      subject: Yup.string().required('Subject is required'),
      message: Yup.string().required('Message is required').min(10, 'Message must be at least 10 characters'),
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      // Simulate API call
      setTimeout(() => {
        dispatch(addNotification({
          id: `success-${Date.now()}`,
          title: 'Success',
          message: 'Support ticket submitted successfully! We will contact you shortly.',
          type: 'success',
          timestamp: new Date().toISOString()
        }));
        resetForm();
        setSubmitting(false);
      }, 1500);
    },
  });

  const priorityOptions = [
    { value: 'Low', label: 'Low Priority', desc: 'General Inquiry / Feedback', color: 'text-green-600 bg-green-50' },
    { value: 'Normal', label: 'Normal Priority', desc: 'Account / Billing / Minor Issue', color: 'text-blue-600 bg-blue-50' },
    { value: 'High', label: 'High Priority', desc: 'Functional Issue / Bug Report', color: 'text-orange-600 bg-orange-50' },
    { value: 'Critical', label: 'Critical Priority', desc: 'System Outage / Data Emergency', color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Help & Support</h1>
        <p className="text-base sm:text-lg text-gray-600">We're here to help. Get in touch with our support team or find answers to common questions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Main Contact Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Form Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Contact Support</h2>
                  <p className="text-sm text-gray-500">Send us a message and we'll get back to you</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/faqs')}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg font-medium transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                View FAQs
              </button>
            </div>

            <form onSubmit={formik.handleSubmit} className="space-y-6">
              {/* Subject Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  placeholder="What is the issue about?"
                  className={`w-full bg-gray-50 text-gray-900 border-2 ${formik.touched.subject && formik.errors.subject ? 'border-red-300' : 'border-gray-200'} rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all`}
                  value={formik.values.subject}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.subject && formik.errors.subject && (
                  <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                    {formik.errors.subject}
                  </p>
                )}
              </div>

              {/* Priority Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {priorityOptions.map((option) => {
                    const isSelected = formik.values.priority === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => formik.setFieldValue('priority', option.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `${option.color} border-current`
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${isSelected ? 'text-current' : 'text-gray-600'}`}>
                            {option.label}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <p className={`text-xs ${isSelected ? 'text-current opacity-80' : 'text-gray-500'}`}>
                          {option.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant information..."
                  className={`w-full bg-gray-50 text-gray-900 border-2 ${formik.touched.message && formik.errors.message ? 'border-red-300' : 'border-gray-200'} rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 resize-none transition-all`}
                  value={formik.values.message}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.message && formik.errors.message && (
                  <p className="text-red-500 text-xs mt-1.5">{formik.errors.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">Minimum 10 characters required</p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formik.isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Support Ticket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Tips Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Tips for Faster Support
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Include specific error messages or screenshots if applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Describe the steps you took before encountering the issue</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Mention your browser and device information if relevant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Check our FAQs page for quick answers to common questions</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Contact Card */}
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Headphones className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Need Immediate Help?</h3>
            </div>
            <div className="space-y-4">
              <a
                href="tel:+18001234567"
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl hover:bg-white/20 transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-100 uppercase font-semibold mb-1">Support Hotline</p>
                  <p className="font-bold text-lg">+1 (800) 123-4567</p>
                  <p className="text-xs text-blue-200 mt-1">24/7 Available</p>
                </div>
              </a>
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-100 uppercase font-semibold mb-1">Live Chat</p>
                  <p className="font-bold text-lg">Available Now</p>
                  <p className="text-xs text-blue-200 mt-1">9am - 5pm EST</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs Quick Link Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">FAQs</h3>
                <p className="text-xs text-gray-500">Quick answers</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              Browse our comprehensive FAQ section to find instant answers to common questions about using MediNexus.
            </p>
            <button
              onClick={() => navigate('/faqs')}
              className="w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-600 px-4 py-3 rounded-xl hover:bg-purple-100 transition-colors font-semibold text-sm"
            >
              <BookOpen className="w-4 h-4" />
              View All FAQs
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Response Time Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Response Times</h3>
                <p className="text-xs text-gray-500">Based on priority</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-700">Critical</span>
                <span className="text-sm font-bold text-red-600">&lt; 1 hour</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-700">High</span>
                <span className="text-sm font-bold text-orange-600">&lt; 4 hours</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-700">Normal</span>
                <span className="text-sm font-bold text-blue-600">&lt; 24 hours</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Low</span>
                <span className="text-sm font-bold text-gray-600">&lt; 48 hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
