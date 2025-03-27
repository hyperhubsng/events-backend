export class AddUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName: string;
  website: string;
}

export class UserQueryDTO {
  q: string;
  userType: string;
  status: string;
}
