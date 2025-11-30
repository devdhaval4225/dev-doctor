
import React from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Mail, Phone, MessageCircle, HelpCircle, Loader2, Send } from 'lucide-react';

const Support = () => {
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
        alert('Support ticket submitted successfully! We will contact you shortly.');
        resetForm();
        setSubmitting(false);
      }, 1500);
    },
  });

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "Go to Settings > Security and click on 'Change Password'. If you cannot login, use the 'Forgot Password' link on the login page."
    },
    {
      question: "Can I export patient data?",
      answer: "Currently, bulk export is handled by the admin team. Please submit a request if you need a full data dump."
    },
    {
      question: "How do I change my clinic availability?",
      answer: "Navigate to Settings > Availability to manage your weekly schedule and working hours."
    }
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-500">Find answers or contact our support team.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" /> Contact Support
            </h2>
            <form onSubmit={formik.handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  placeholder="What is the issue?"
                  className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.subject && formik.errors.subject ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`}
                  value={formik.values.subject}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.subject && formik.errors.subject && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.subject}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority Level</label>
                <div className="relative">
                  <select
                    name="priority"
                    className="w-full bg-gray-50 text-gray-900 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none"
                    value={formik.values.priority}
                    onChange={formik.handleChange}
                  >
                    <option value="Low">Low - General Inquiry / Feedback</option>
                    <option value="Normal">Normal - Account / Billing / Minor Issue</option>
                    <option value="High">High - Functional Issue / Bug Report</option>
                    <option value="Critical">Critical - System Outage / Data Emergency</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1 ml-1">Select the urgency of your request to help us triage faster.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Describe your issue in detail..."
                  className={`w-full bg-gray-50 text-gray-900 border ${formik.touched.message && formik.errors.message ? 'border-red-500' : 'border-gray-200'} rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none`}
                  value={formik.values.message}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                />
                {formik.touched.message && formik.errors.message && (
                  <div className="text-red-500 text-xs mt-1">{formik.errors.message}</div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {formik.isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info & FAQ Sidebar */}
        <div className="space-y-6">
          {/* Quick Contact Info */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
            <h3 className="font-bold text-lg mb-4">Need Immediate Help?</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <Phone className="w-5 h-5 text-blue-200" />
                <div>
                  <p className="text-xs text-blue-200 uppercase font-semibold">Support Hotline</p>
                  <p className="font-medium">+1 (800) 123-4567</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                <MessageCircle className="w-5 h-5 text-blue-200" />
                <div>
                  <p className="text-xs text-blue-200 uppercase font-semibold">Live Chat</p>
                  <p className="font-medium">Available 9am - 5pm EST</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-500" /> Common Questions
            </h3>
            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">{faq.question}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
