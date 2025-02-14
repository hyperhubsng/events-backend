export const validationMessages = (field: string) => {
  return {
    empty: `${field} cannot be empty`,
    required: `${field} is a required field`,
    only: `Please, provide a value for ${field}`,
    integer: `${field} must be an integer`,
    positive: `${field} is not a valid value`,
    string: `${field} should be string`,
    boolean: `${field} must be either true or false`,
    length: `${field} cannot be more than  {#limit} characters`,
    number: `${field} should be numeric`,
    precision: `${field} is not a valid amount`,
    min: `${field} cannot be less than 200`,
    max: `${field} cannot be greater than 50000`,
    base: `${field} must be an array`,
    numberBase: `${field} must contain only numbers`,
  };
};
