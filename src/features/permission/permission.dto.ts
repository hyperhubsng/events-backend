import { Types } from "mongoose";

export class CreatePermissionDTO {
  resource: string;
  title: string;
  description: string;
}

export class CreateRoleDTO {
  title: string;
  description: string;
  permissions: string[];
  organisationId: Types.ObjectId;
  tag: string;
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

export class UpdateRoleDTO {
  title: string;
  description: string;
  permissions: string[];
  organisationId: Types.ObjectId;
  tag: string;
  action: string;
}
