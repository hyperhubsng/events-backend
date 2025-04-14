/**
 * @description Takes a date object and returns a formatted string
 * in this format YYYY-MM-DD
 * @param {Date} date
 * @returns {String}
 */
export const dateParser = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};
