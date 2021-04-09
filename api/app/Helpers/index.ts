import slugify from 'slugify';

/**
 * Returns a slug
 */
export const getSlug = (string: string): string => {
  const slug = slugify(string, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  return slug;
};

/**
 * Return the sanitized surname
 */
export const sanitizeSurname = (value: string) => {
  const array = value.split(' ');
  const result: Array<string> = [];
  const values = ['de', 'da', 'das', 'do', 'dos', 'del', 'e', 'DE', 'DA', 'DAS', 'DO', 'DOS', 'DEL', 'E'];
  for (const word of array) {
    if (values.includes(word)) {
      result.push(word.toLowerCase());
    } else {
      result.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    }
  }
  return result.join(' ');
};

/**
 * Validates a phone number
 *
 * Base phone must have 8 or 9 digits and DDD must have 2 digits
 *
 * @param phoneNumber number to be validated
 * @returns true if is a valid number, false otherwise
 */
export const validatePhone = (phoneNumber: string): boolean => {
  const onlyNumber = phoneNumber.replace(/\D/g, '');
  return !!onlyNumber && !!onlyNumber.match(/^\d{10,11}$/);
};

/**
 * Format phone number to E.164 standard
 * @param phoneNumber number to be formated
 * @returns the formated phone number
 */
export const formatPhoneToE164 = (phoneNumber: string) => {
  let formatedNumber = phoneNumber.replace(/\D/g, '');
  // If the phone number is missing +55
  if (formatedNumber.length <= 11) {
    formatedNumber = `55${formatedNumber}`;
  }
  if (formatedNumber[0] !== '+') {
    formatedNumber = `+${formatedNumber}`;
  }
  return formatedNumber;
};
