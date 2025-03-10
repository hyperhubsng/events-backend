export const rejectPastDate = (value: string, helpers: any) => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 1);
  const yesterdayTime = currentDate.getTime();
  const startTime = new Date(value).getTime();
  const toDateErrMessage = "startDate cannot be in the past";
  if (startTime <= yesterdayTime) {
    return helpers.message(toDateErrMessage);
  }
  return value;
};
