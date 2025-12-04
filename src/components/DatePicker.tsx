import React, { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/datepicker.css';

interface CustomDatePickerProps {
  selectedDate: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  selectedDate, 
  onChange, 
  placeholder = "Select date" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePreviousDay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() - 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      date.setDate(date.getDate() + 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  return (
    <div className="relative" ref={datePickerRef}>
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {/* Previous Day Button */}
        <button
          type="button"
          onClick={handlePreviousDay}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          title="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Date Input */}
        <div className="relative min-w-[200px]">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={selectedDate ? formatDisplayDate(selectedDate) : ''}
            onClick={() => setIsOpen(!isOpen)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 bg-transparent text-gray-900 border-0 rounded-lg focus:outline-none cursor-pointer transition-all font-medium text-sm"
          />
          
          {/* Date Picker Popup */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-2">
              <DatePicker
                selected={selectedDateObj}
                onChange={handleDateChange}
                inline
                calendarClassName="!border-0 !shadow-none"
                className="react-datepicker-wrapper"
              />
            </div>
          )}
        </div>

        {/* Next Day Button */}
        <button
          type="button"
          onClick={handleNextDay}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
          title="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CustomDatePicker;

