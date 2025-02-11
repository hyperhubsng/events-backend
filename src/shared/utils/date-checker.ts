export const dateChecker = (value: string, helpers: any) => {
  const { startDate } = helpers.state.ancestors[0];
  const fromDate = new Date(startDate);
  const toDate = new Date(value);
  const toDateErrMessage = 'endDate must be greater than or equal to startDate';
  if (toDate < fromDate) {
    return helpers.message(toDateErrMessage);
  }
  return value;
};
