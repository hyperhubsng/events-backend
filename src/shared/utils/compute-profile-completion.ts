export const computeProfileCompletionStatus = (...args: any[]): number => {
  const notCompletedFields = args.filter((elem: any) => !!elem);
  const percentCompleted = Math.floor(
    (notCompletedFields.length / args.length) * 100,
  );
  return percentCompleted;
};

export const stringnifyPercent = (percent: number): string => {
  return percent === 100
    ? "Completed"
    : percent !== 0
    ? `${percent}%`
    : "Pending";
};
