import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, MessageSquare, Settings, LogOut, HelpCircle, BookOpen, Stethoscope, Heart, Activity, Cross } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/store';

const Sidebar = () => {
  const dispatch = useDispatch();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: Users, label: 'My Patient', path: '/patients' },
    // { icon: MessageSquare, label: 'Message', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const bottomNavItems = [
    { icon: BookOpen, label: 'FAQs', path: '/faqs' },
    { icon: HelpCircle, label: 'Support', path: '/support' },
  ];

  return (
    <div className="hidden md:flex flex-col w-72 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200/50 h-screen sticky top-0 shadow-sm">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200/80 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/40 transform hover:scale-105 transition-transform">
              <Stethoscope className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
              MediNexus
            </span>
            <span className="text-xs text-gray-500 font-medium">Clinic Platform</span>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        <div className="px-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Menu</span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out relative ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 font-semibold'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-500 group-hover:text-blue-600'
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={`flex-1 transition-colors duration-200 ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200/80 bg-white/30 backdrop-blur-sm space-y-2">
        <div className="px-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Support</span>
        </div>
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 font-semibold'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive 
                      ? 'text-white' 
                      : 'text-gray-500 group-hover:text-blue-600'
                  }`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                <span className={`transition-colors duration-200 ${isActive ? 'text-white' : ''}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        
        <div className="pt-4 border-t border-gray-200/80 mt-2">
          <button 
            onClick={() => dispatch(logout())}
            className="group w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 ease-in-out hover:shadow-md"
          >
            <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-600 transition-colors duration-200" strokeWidth={2} />
            <span className="font-medium transition-colors duration-200 group-hover:text-red-600">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
