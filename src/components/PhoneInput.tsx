import React, { forwardRef } from 'react';
import { parsePhoneNumber, isValidPhoneNumber, isPossiblePhoneNumber } from 'react-phone-number-input';
import { Smartphone } from 'lucide-react';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, defaultCountry = 'IN', className = '', placeholder = 'Enter mobile number', disabled = false }, ref) => {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Smartphone className="w-5 h-5 text-gray-400" />
        </div>
        <input
          ref={ref}
          type="tel"
          value={value || ''}
          onChange={(e) => {
            const inputValue = e.target.value;
            // Allow only numbers, spaces, +, -, and parentheses
            const cleanedValue = inputValue.replace(/[^\d\s\+\-\(\)]/g, '');
            onChange?.(cleanedValue || undefined);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;

