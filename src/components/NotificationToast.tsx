import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, removeNotification } from '../redux/store';
import { X, Bell, AlertCircle, CheckCircle, Info } from 'lucide-react';

const NotificationToast = () => {
  const { notifications } = useSelector((state: RootState) => state.data);
  const dispatch = useDispatch();

  useEffect(() => {
    // Auto remove notifications after 6 seconds
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeNotification(notifications[0].id));
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notifications, dispatch]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map((notif) => (
        <div 
          key={notif.id}
          className={`
            pointer-events-auto w-80 shadow-lg rounded-xl p-4 flex gap-3 animate-in slide-in-from-right-full duration-300
            ${notif.type === 'error' ? 'bg-red-50 border border-red-200' : 
              notif.type === 'warning' ? 'bg-orange-50 border border-orange-200' : 
              notif.type === 'success' ? 'bg-green-50 border border-green-200' : 
              'bg-white border border-gray-200'}
          `}
        >
          <div className={`
             flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
             ${notif.type === 'error' ? 'bg-red-100 text-red-600' : 
               notif.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
               notif.type === 'success' ? 'bg-green-100 text-green-600' : 
               'bg-blue-100 text-blue-600'}
          `}>
             {notif.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
              notif.type === 'warning' ? <Bell className="w-5 h-5" /> :
              notif.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
              <Info className="w-5 h-5" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={`font-bold text-sm ${
                notif.type === 'error' ? 'text-red-800' : 'text-gray-800'
            }`}>
                {notif.title}
            </h4>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {notif.message}
            </p>
            <p className="text-[10px] text-gray-400 mt-2">
                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <button 
            onClick={() => dispatch(removeNotification(notif.id))}
            className="text-gray-400 hover:text-gray-600 self-start"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;