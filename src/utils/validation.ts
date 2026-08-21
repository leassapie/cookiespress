/**
 * Check if string is numeric
 */
export const isNumeric = (val: string): boolean => {
  return !isNaN(Number(val));
};

/**
 * Error response helper
 */
export function maybeError(success: boolean, message: string) {
  return { success, message };
}

/**
 * Remove non-numeric characters from a string
 */
export function removeNonNumeric(input: string) {
  return input.replace(/[^0-9]/g, "");
}