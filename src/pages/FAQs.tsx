import React, { useState, useMemo } from 'react';
import { Search, HelpCircle, ChevronDown, ChevronUp, BookOpen, Shield, Clock, Users, Settings, FileText, MessageCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const FAQs = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', name: 'All Questions', icon: HelpCircle, color: 'bg-gray-100 text-gray-700' },
    { id: 'getting-started', name: 'Getting Started', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
    { id: 'account', name: 'Account & Security', icon: Shield, color: 'bg-green-100 text-green-700' },
    { id: 'appointments', name: 'Appointments', icon: Clock, color: 'bg-purple-100 text-purple-700' },
    { id: 'patients', name: 'Patients', icon: Users, color: 'bg-pink-100 text-pink-700' },
    { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-orange-100 text-orange-700' },
    { id: 'billing', name: 'Billing & Plans', icon: FileText, color: 'bg-indigo-100 text-indigo-700' },
    { id: 'support', name: 'Support', icon: MessageCircle, color: 'bg-teal-100 text-teal-700' },
  ];

  const faqs: FAQ[] = [
    // Getting Started
    {
      id: '1',
      category: 'getting-started',
      question: 'How do I get started with MediNexus?',
      answer: 'After logging in, you\'ll be taken to your dashboard. From there, you can start by adding patients, setting up your availability in Settings, and creating appointments. We recommend completing your profile first in Settings > My Profile.',
    },
    {
      id: '2',
      category: 'getting-started',
      question: 'What features are available in the platform?',
      answer: 'MediNexus offers comprehensive features including patient management, appointment scheduling, medical records, prescriptions, diagnoses, messaging with patients, and detailed analytics. All features are accessible from the main navigation sidebar.',
    },
    {
      id: '3',
      category: 'getting-started',
      question: 'Is there a mobile app available?',
      answer: 'Currently, MediNexus is a web-based platform that works seamlessly on all devices including smartphones and tablets. Simply access it through your mobile browser for a responsive experience.',
    },

    // Account & Security
    {
      id: '4',
      category: 'account',
      question: 'How do I reset my password?',
      answer: 'Go to Settings > Security and click on "Change Password". Enter your current password and your new password. If you cannot login, use the "Forgot Password" link on the login page to reset it via email.',
    },
    {
      id: '5',
      category: 'account',
      question: 'How do I view my login activity?',
      answer: 'Navigate to Settings > Security > Recent Login Activity. Here you can see all your active sessions, including device type, location, IP address, and login time. You can logout any session by clicking the "Log out" button.',
    },
    {
      id: '6',
      category: 'account',
      question: 'Is my data secure?',
      answer: 'Yes, we use industry-standard encryption to protect your data. All communications are encrypted using SSL/TLS, and we follow HIPAA compliance guidelines for medical data protection. Your patient information is stored securely and only accessible to you.',
    },
    {
      id: '7',
      category: 'account',
      question: 'Can I enable two-factor authentication?',
      answer: 'Two-factor authentication is currently being developed and will be available soon. In the meantime, we recommend using a strong password and regularly reviewing your login activity in Settings.',
    },

    // Appointments
    {
      id: '8',
      category: 'appointments',
      question: 'How do I schedule an appointment?',
      answer: 'Go to the Appointments page and click the "New Appointment" button. Select a patient, choose a date and time, set the appointment type (Consulting or Video), and add any notes. The appointment will be created and visible in your calendar.',
    },
    {
      id: '9',
      category: 'appointments',
      question: 'How do I manage my availability?',
      answer: 'Navigate to Settings > Availability. You can set your weekly schedule by selecting a day, configuring time slots, and saving. You can also copy schedules to multiple days and set different availability for different weeks of the year.',
    },
    {
      id: '10',
      category: 'appointments',
      question: 'Can patients book appointments directly?',
      answer: 'Currently, appointments are created by doctors. Patient self-booking functionality is planned for a future update. For now, patients can request appointments through messages, and you can create them from the Appointments page.',
    },
    {
      id: '11',
      category: 'appointments',
      question: 'How do I cancel or reschedule an appointment?',
      answer: 'Go to the Appointments page, find the appointment you want to modify, and click on it. You can change the status to "Cancelled" or update the date/time to reschedule. The patient will be notified of any changes.',
    },

    // Patients
    {
      id: '12',
      category: 'patients',
      question: 'How do I add a new patient?',
      answer: 'Go to the Patients page and click the "Add Patient" button. Fill in the patient\'s information including name, email, phone number, address, gender, and other details. Once saved, the patient will appear in your patient list.',
    },
    {
      id: '13',
      category: 'patients',
      question: 'Can I export patient data?',
      answer: 'Currently, bulk export is handled by the admin team. Please submit a request through Support if you need a full data export. Individual patient records can be viewed and printed from the patient detail page.',
    },
    {
      id: '14',
      category: 'patients',
      question: 'How do I add medical records to a patient?',
      answer: 'Open a patient\'s profile from the Patients page, then go to their visit history. You can add diagnoses, prescriptions, and notes for each visit. All medical information is securely stored and linked to the patient\'s record.',
    },
    {
      id: '15',
      category: 'patients',
      question: 'Can I import patients in bulk?',
      answer: 'Yes, you can import multiple patients at once using the bulk import feature. Go to Patients page, click "Bulk Import", and upload a CSV file with patient data. Make sure the file follows the required format.',
    },

    // Settings
    {
      id: '16',
      category: 'settings',
      question: 'How do I update my profile information?',
      answer: 'Go to Settings > My Profile. You can update your name, email, phone number, specialization, and clinic address. You can also upload a profile picture and cover image. Click "Save Changes" when done.',
    },
    {
      id: '17',
      category: 'settings',
      question: 'How do I change my clinic availability?',
      answer: 'Navigate to Settings > Availability. Select the year and week you want to modify, then choose a day to configure. You can generate time slots automatically or add them manually. Changes are saved per week and year.',
    },
    {
      id: '18',
      category: 'settings',
      question: 'Can I customize notification settings?',
      answer: 'Notification preferences are currently being developed. For now, you\'ll receive notifications for important events like new appointments, messages, and system updates. Full customization will be available in a future update.',
    },

    // Billing & Plans
    {
      id: '19',
      category: 'billing',
      question: 'How does billing work?',
      answer: 'Billing information and subscription management are handled through your account dashboard. You can view your current plan, billing history, and upgrade or downgrade your subscription at any time.',
    },
    {
      id: '20',
      category: 'billing',
      question: 'What payment methods are accepted?',
      answer: 'We accept all major credit cards, debit cards, and bank transfers. Payment is processed securely through our payment gateway. You can update your payment method in your account settings.',
    },
    {
      id: '21',
      category: 'billing',
      question: 'Can I cancel my subscription?',
      answer: 'Yes, you can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period. No refunds are provided for partial months.',
    },

    // Support
    {
      id: '22',
      category: 'support',
      question: 'How do I contact support?',
      answer: 'You can contact support through the Support page where you can submit a ticket. You can also call our support hotline at +1 (800) 123-4567 or use live chat (available 9am - 5pm EST).',
    },
    {
      id: '23',
      category: 'support',
      question: 'What is the response time for support tickets?',
      answer: 'Response times vary by priority: Critical issues - within 1 hour, High priority - within 4 hours, Normal priority - within 24 hours, Low priority - within 48 hours. We aim to resolve all issues as quickly as possible.',
    },
    {
      id: '24',
      category: 'support',
      question: 'Do you offer training or onboarding?',
      answer: 'Yes, we offer comprehensive onboarding sessions for new users. Contact support to schedule a training session. We also provide video tutorials and documentation to help you get started.',
    },
  ];

  const filteredFAQs = useMemo(() => {
    let filtered = faqs;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectedCategoryInfo = categories.find(cat => cat.id === selectedCategory);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/support')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Support
        </button>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
        <p className="text-base sm:text-lg text-gray-600">Find instant answers to common questions about MediNexus</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for questions or topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-5 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-gray-900 placeholder-gray-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Categories Sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isActive = selectedCategory === category.id;
                const count = category.id === 'all' 
                  ? faqs.length 
                  : faqs.filter(f => f.category === category.id).length;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all text-left ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold border-2 border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isActive ? category.color : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${isActive ? 'text-current' : 'text-gray-500'}`} />
                      </div>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="flex-1">
          {filteredFAQs.length > 0 ? (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => {
                const isOpen = openItems.has(faq.id);
                const categoryInfo = categories.find(cat => cat.id === faq.category);

                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl shadow-sm border-2 border-gray-100 overflow-hidden transition-all hover:shadow-md hover:border-gray-200"
                  >
                    <button
                      onClick={() => toggleItem(faq.id)}
                      className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1 pr-4">
                        <div className="flex-shrink-0">
                          {categoryInfo && (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${categoryInfo.color}`}>
                              {React.createElement(categoryInfo.icon, { className: "w-6 h-6" })}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                            {faq.question}
                          </h3>
                          <span className="inline-block text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-600">
                            {categoryInfo?.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pl-20 border-t border-gray-100">
                        <div className="pt-4">
                          <p className="text-sm sm:text-base text-gray-600 leading-relaxed whitespace-pre-line">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? `We couldn't find any FAQs matching "${searchQuery}". Try a different search term.`
                  : 'No FAQs available in this category.'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Clear search and show all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 sm:p-10 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-3">Still have questions?</h3>
            <p className="text-blue-100 text-lg">Can't find what you're looking for? Our support team is here to help you 24/7.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/support')}
              className="bg-white text-blue-600 px-6 py-3.5 rounded-xl font-bold hover:bg-blue-50 transition-colors whitespace-nowrap"
            >
              Contact Support
            </button>
            <a
              href="tel:+18001234567"
              className="bg-white/10 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl font-bold hover:bg-white/20 transition-colors whitespace-nowrap text-center border-2 border-white/20"
            >
              Call Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQs;
