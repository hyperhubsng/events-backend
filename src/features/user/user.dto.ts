import { Types } from "mongoose";

export class AddUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName: string;
  website: string;
  userType: string;
  role: Types.ObjectId;
  accountStatus: string;
  needsToChangePassword: boolean;
  organisations: Types.ObjectId[];
  currentOrganisation: Types.ObjectId;
}

export class UserQueryDTO {
  q: string;
  userType: string;
  status: string;
  organization: string;
  presentation: string;
  from: string;
}

export class AddOrganisationDTO {
  name: string;
  owner: Types.ObjectId;
}
