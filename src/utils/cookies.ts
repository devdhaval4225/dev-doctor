/**
 * Cookie utility functions
 */

/**
 * Get a cookie value by name
 * @param name - Cookie name
 * @returns Cookie value or null if not found
 */
export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

/**
 * Check if a cookie exists
 * @param name - Cookie name
 * @returns true if cookie exists, false otherwise
 */
export const hasCookie = (name: string): boolean => {
  return getCookie(name) !== null;
};

/**
 * Delete a cookie
 * @param name - Cookie name
 * @param path - Cookie path (default: '/')
 * @param domain - Cookie domain (optional)
 */
export const deleteCookie = (name: string, path: string = '/', domain?: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  
  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  document.cookie = cookieString;
};

