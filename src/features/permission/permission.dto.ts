import { Types } from "mongoose";

export class CreatePermissionDTO {
  resource: string;
  title: string;
}

export class CreateRoleDTO {
  title: string;
  description: string;
  permissions: string[];
  userId: Types.ObjectId;
}

export class PermissionsQueryDTO {
  q: string;
  distance: number;
  lat: number;
  long: number;
  country: string;
  cost: number;
  status: string;
  owner: Types.ObjectId;
}
