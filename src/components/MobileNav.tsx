
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, MessageSquare, Settings, Menu, X, LogOut, HelpCircle, BookOpen, Stethoscope } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/store';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Calendar, label: 'Appointments', path: '/appointments' },
    { icon: Users, label: 'My Patient', path: '/patients' },
    { icon: MessageSquare, label: 'Message', path: '/messages' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const bottomNavItems = [
    { icon: BookOpen, label: 'FAQs', path: '/faqs' },
    { icon: HelpCircle, label: 'Support', path: '/support' },
  ];

  return (
    <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/30 flex-shrink-0">
              <Stethoscope className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-gray-800 leading-tight truncate">MediNexus</span>
              <span className="text-[10px] text-gray-500 font-medium">Medical Platform</span>
            </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-600">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-lg flex flex-col p-4 gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
           <button 
            onClick={() => dispatch(logout())}
            className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 w-full rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileNav;
