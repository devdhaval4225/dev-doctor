/**
 * CSV Parser Utility
 * Handles CSV parsing with proper quote handling
 */

export interface CSVRow {
  [key: string]: string;
}

/**
 * Parse a single CSV row, handling quoted values and escaped quotes
 */
export const parseCSVRow = (row: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

/**
 * Auto-detect field mapping from CSV headers
 */
export const detectFieldMapping = (headers: string[]): Record<string, string> => {
  const fieldMapping: Record<string, string> = {};
  const headersLower = headers.map(h => h.toLowerCase().trim().replace(/"/g, ''));
  
  const fieldPatterns: Record<string, string[]> = {
    name: ['name', 'patient name', 'full name'],
    email: ['email', 'e-mail', 'email address'],
    mobileNumber: ['mobile', 'phone', 'contact', 'tel'],
    gender: ['gender', 'sex'],
    bloodGroup: ['blood', 'blood group', 'bloodgroup'],
    age: ['age'],
    city: ['city'],
    state: ['state', 'province'],
    address: ['address', 'addr'],
  };
  
  headersLower.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    
    for (const [field, patterns] of Object.entries(fieldPatterns)) {
      if (patterns.some(pattern => cleanHeader === pattern || cleanHeader.includes(pattern))) {
        fieldMapping[headers[index]] = field;
        break;
      }
    }
  });
  
  return fieldMapping;
};

/**
 * Parse CSV file content into structured data
 */
export const parseCSVFile = (content: string): {
  headers: string[];
  rows: CSVRow[];
  fieldMapping: Record<string, string>;
} => {
  const rows = content.split('\n').filter(row => row.trim());
  
  if (rows.length < 2) {
    throw new Error('CSV file is empty or missing data');
  }
  
  const headers = parseCSVRow(rows[0]);
  const fieldMapping = detectFieldMapping(headers);
  
  const parsedRows: CSVRow[] = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;
    
    const values = parseCSVRow(row);
    if (values.length === 0) continue;
    
    const rowData: CSVRow = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });
    
    parsedRows.push(rowData);
  }
  
  return { headers, rows: parsedRows, fieldMapping };
};

