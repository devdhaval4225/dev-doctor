import React, { useEffect, useRef } from 'react';
import PhoneNumberInput from 'react-phone-number-input';
import { parsePhoneNumber } from 'react-phone-number-input';
import en from 'react-phone-number-input/locale/en.json';
import 'react-phone-number-input/style.css';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  defaultCountry?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ 
  value, 
  onChange, 
  onBlur,
  defaultCountry = 'IN', 
  className = '', 
  placeholder = 'Enter mobile number', 
  disabled = false 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentCountry, setCurrentCountry] = React.useState<string>(defaultCountry);

  // Extract country from phone number value
  useEffect(() => {
    if (value && typeof value === 'string' && value.trim().length > 0) {
      try {
        const phoneNumber = parsePhoneNumber(value);
        if (phoneNumber && phoneNumber.country) {
          setCurrentCountry(phoneNumber.country);
        }
      } catch (e) {
        // If parsing fails, keep current country - don't update
      }
    } else {
      setCurrentCountry(defaultCountry);
    }
  }, [value, defaultCountry]);

  // Update country display after render
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let observer: MutationObserver | null = null;

    const updateCountryDisplay = () => {
      try {
        if (!containerRef.current) return;
        
        const countrySelect = containerRef.current.querySelector('.PhoneInputCountrySelect') as HTMLElement;
        if (!countrySelect || !currentCountry) return;

        // Ensure flag icon is visible
        const flagIcon = countrySelect.querySelector('.PhoneInputCountryIcon') as HTMLElement;
        if (flagIcon) {
          flagIcon.style.display = 'block';
          flagIcon.style.visibility = 'visible';
          flagIcon.style.opacity = '1';
        }

        const countryName = en[currentCountry as keyof typeof en] || currentCountry;
        if (!countryName) return;
        
        // Find the country code span
        const codeSpan = countrySelect.querySelector('.PhoneInputCountrySelectCallingCode');
        if (!codeSpan) return;

        // Check if name already exists and is correct
        const existingName = countrySelect.querySelector('.country-name-display');
        if (existingName && existingName.textContent === countryName) {
          return; // Already has correct name
        }
        
        // Remove existing name span if present
        if (existingName) {
          existingName.remove();
        }
        
        // Add country name after the code
        const nameSpan = document.createElement('span');
        nameSpan.className = 'country-name-display';
        nameSpan.textContent = countryName;
        
        // Insert after calling code
        if (codeSpan.nextSibling) {
          codeSpan.parentNode?.insertBefore(nameSpan, codeSpan.nextSibling);
        } else {
          codeSpan.parentNode?.appendChild(nameSpan);
        }
      } catch (e) {
        // Silently ignore errors to prevent page breaks
        console.debug('PhoneInput country name update error:', e);
      }
    };

    // Debounced update function
    const debouncedUpdate = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        updateCountryDisplay();
      }, 150);
    };

    // Initial update with delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      updateCountryDisplay();
    }, 100);

    // Use MutationObserver to watch for DOM changes (with debouncing)
    if (containerRef.current) {
      observer = new MutationObserver((mutations) => {
        // Only update if the mutation is relevant (not our own changes or dropdown)
        const hasRelevantChange = mutations.some(mutation => {
          return Array.from(mutation.addedNodes).some(node => {
            const element = node as HTMLElement;
            // Skip our custom country name display and country dropdown
            if (element && (
              element.classList?.contains('country-name-display') ||
              element.classList?.contains('country-select-custom') ||
              element.closest('.country-select-custom')
            )) {
              return false;
            }
            return element && element.nodeType === Node.ELEMENT_NODE;
          });
        });
        
        if (hasRelevantChange) {
          debouncedUpdate();
        }
      });

      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (initialTimeout) {
        clearTimeout(initialTimeout);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [currentCountry, value]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} style={{ overflow: 'visible' }}>
      <PhoneNumberInput
        international
        country={currentCountry as any}
        defaultCountry={defaultCountry as any}
        value={value}
        onChange={(newValue) => {
          onChange?.(newValue);
          // Update country when value changes
          if (newValue && typeof newValue === 'string' && newValue.trim().length > 0) {
            try {
              const phoneNumber = parsePhoneNumber(newValue);
              if (phoneNumber && phoneNumber.country) {
                setCurrentCountry(phoneNumber.country);
              }
            } catch (e) {
              // Ignore parsing errors - keep current country
            }
          } else if (!newValue) {
            // Reset to default country if value is cleared
            setCurrentCountry(defaultCountry);
          }
        }}
        onCountryChange={(country) => {
          if (country) {
            setCurrentCountry(country);
            // Force update of country display after a short delay
            setTimeout(() => {
              if (containerRef.current) {
                const countrySelect = containerRef.current.querySelector('.PhoneInputCountrySelect') as HTMLElement;
                if (countrySelect) {
                  const flagIcon = countrySelect.querySelector('.PhoneInputCountryIcon') as HTMLElement;
                  if (flagIcon) {
                    flagIcon.style.display = 'block';
                    flagIcon.style.visibility = 'visible';
                    flagIcon.style.opacity = '1';
                  }
                }
              }
            }, 50);
          }
        }}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className="phone-input-custom"
        countrySelectProps={{
          className: 'country-select-custom',
          unicodeFlags: true
        }}
      />
      <style>{`
        .phone-input-custom {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          position: relative;
        }
        .phone-input-custom .PhoneInputInput {
          flex: 1;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-top: 0.625rem;
          padding-bottom: 0.625rem;
          background-color: rgb(249 250 251);
          border: 1px solid rgb(229 231 235);
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s;
          color: rgb(17 24 39);
          font-size: 0.875rem;
          width: 100%;
        }
        .phone-input-custom .PhoneInputInput:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }
        .phone-input-custom .PhoneInputInput:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .phone-input-custom .PhoneInputCountry {
          margin-right: 0;
          display: flex;
          align-items: center;
          position: relative;
        }
        /* Ensure flag icon is visible and always shown */
        .phone-input-custom .PhoneInputCountryIcon,
        .phone-input-custom .PhoneInputCountryIcon--border,
        .phone-input-custom img[class*="PhoneInputCountryIcon"],
        .phone-input-custom .PhoneInputCountrySelect img {
          width: 1.75rem !important;
          height: 1.75rem !important;
          border-radius: 0.375rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.05);
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          flex-shrink: 0;
          object-fit: cover;
        }
        /* Ensure calling code is visible with proper spacing */
        .phone-input-custom .PhoneInputCountrySelect {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
        }
        .phone-input-custom .PhoneInputCountrySelect > * {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .phone-input-custom .PhoneInputCountrySelect {
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(229 231 235);
          border-radius: 0.5rem;
          background-color: white;
          font-size: 0.875rem;
          font-weight: 500;
          margin-right: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
          min-width: auto;
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          color: rgb(17 24 39);
          position: relative;
          z-index: 10;
        }
        /* Ensure flag appears first in the country select */
        .phone-input-custom .PhoneInputCountrySelect .PhoneInputCountryIcon {
          order: 1;
          margin-right: 0.25rem;
        }
        .phone-input-custom .PhoneInputCountrySelect .PhoneInputCountrySelectCallingCode {
          order: 2;
        }
        .phone-input-custom .PhoneInputCountrySelect .country-name-display {
          order: 3;
        }
        .phone-input-custom .PhoneInputCountrySelectCallingCode {
          font-weight: 600;
          color: rgb(17 24 39);
          display: inline-block !important;
          margin-left: 0.25rem;
          font-size: 0.875rem;
          white-space: nowrap;
        }
        .phone-input-custom .country-name-display {
          margin-left: 0.375rem;
          font-size: 0.75rem;
          color: rgb(107 114 128);
          font-weight: 400;
        }
        .phone-input-custom .PhoneInputCountrySelect:hover {
          border-color: rgb(59 130 246);
          background-color: rgb(239 246 255);
          box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
        }
        .phone-input-custom .PhoneInputCountrySelect:focus {
          outline: none;
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          background-color: rgb(239 246 255);
        }
        .phone-input-custom .PhoneInputCountrySelect:hover .PhoneInputCountrySelectArrow {
          opacity: 1;
          transform: translateY(1px);
        }
        /* Ensure dropdown is clickable and visible */
        .phone-input-custom .PhoneInputCountry {
          position: relative;
          z-index: 10;
        }
        .phone-input-custom .PhoneInputCountrySelect .country-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        /* Country dropdown styling */
        .country-select-custom {
          z-index: 9999 !important;
          max-height: 20rem;
          overflow-y: auto;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid rgb(229 231 235);
          background-color: white;
          margin-top: 0.25rem;
          position: absolute !important;
        }
        /* Ensure country select dropdown is above everything */
        .PhoneInputCountrySelect {
          position: relative;
          z-index: 1;
        }
        .PhoneInputCountrySelect[aria-expanded="true"] {
          z-index: 10000;
        }
        .country-select-custom .PhoneInputCountryOption {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.15s;
          border-bottom: 1px solid rgb(243 244 246);
        }
        .country-select-custom .PhoneInputCountryOption:last-child {
          border-bottom: none;
        }
        .country-select-custom .PhoneInputCountryOption:hover {
          background-color: rgb(239 246 255);
          transform: translateX(2px);
        }
        .country-select-custom .PhoneInputCountryOption:active {
          background-color: rgb(219 234 254);
        }
        .country-select-custom .PhoneInputCountryOptionIcon {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 0.375rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
          display: block !important;
        }
        .country-select-custom .PhoneInputCountryOptionName {
          font-weight: 500;
          color: rgb(17 24 39);
          flex: 1;
        }
        .country-select-custom .PhoneInputCountryOptionCallingCode {
          color: rgb(107 114 128);
          font-size: 0.875rem;
          font-weight: 600;
          display: inline-block !important;
        }
        /* Scrollbar styling for country dropdown */
        .country-select-custom::-webkit-scrollbar {
          width: 6px;
        }
        .country-select-custom::-webkit-scrollbar-track {
          background: rgb(249 250 251);
          border-radius: 0.5rem;
        }
        .country-select-custom::-webkit-scrollbar-thumb {
          background: rgb(209 213 219);
          border-radius: 0.5rem;
        }
        .country-select-custom::-webkit-scrollbar-thumb:hover {
          background: rgb(156 163 175);
        }
        .phone-input-custom.border-red-300 .PhoneInputInput,
        .phone-input-custom.border-red-400 .PhoneInputInput {
          border-color: rgb(239 68 68) !important;
          background-color: rgb(254 242 242) !important;
        }
        .phone-input-custom.border-red-300 .PhoneInputInput:focus,
        .phone-input-custom.border-red-400 .PhoneInputInput:focus {
          border-color: rgb(220 38 38) !important;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
        }
        .phone-input-custom.bg-red-50 .PhoneInputInput {
          background-color: rgb(254 242 242) !important;
        }
        .phone-input-custom.bg-red-50\\/50 .PhoneInputInput {
          background-color: rgba(254, 242, 242, 0.5) !important;
        }
        .phone-input-custom.border-red-300 .PhoneInputCountrySelect,
        .phone-input-custom.border-red-400 .PhoneInputCountrySelect {
          border-color: rgb(239 68 68) !important;
        }
      `}</style>
    </div>
  );
};

export default PhoneInput;

