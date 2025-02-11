import { ObjectId } from 'mongodb';

export const validateObjectId = (value: string, helpers: any) => {
  if (!ObjectId.isValid(value)) {
    return helpers.message('Invalid id');
  }
  return value;
};
