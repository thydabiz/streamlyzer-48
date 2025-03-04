
/**
 * Utility functions to ensure privacy compliance
 */

// Anonymize any identifiable data before storing
export const anonymizeData = (data: any) => {
  const safeData = { ...data };
  
  // Remove any personally identifiable information
  const piiFields = [
    'email', 
    'name', 
    'firstName', 
    'first_name',
    'lastName', 
    'last_name',
    'phone', 
    'address', 
    'macAddress', 
    'mac_address',
    'serialNumber', 
    'serial_number',
    'username', 
    'password',
    'ip',
    'ip_address'
  ];
  
  piiFields.forEach(field => {
    if (safeData[field]) {
      delete safeData[field];
    }
  });
  
  return safeData;
};

// Generate anonymous identifiers that can't be traced back to individuals
export const generateAnonymousId = () => {
  return `anon_${Math.random().toString(36).substring(2, 10)}`;
};

// Creates a safe credentials object without PII
export const createSafeCredentials = (streamUrl: string, type: string = 'xtream') => {
  return {
    url: streamUrl,
    type: type,
    // Use a generated anonymous ID instead of actual user details
    username: generateAnonymousId(),
    password: generateAnonymousId(),
    // Only country code is allowed
    country_code: null,
  };
};
