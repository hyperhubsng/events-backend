import { SetMetadata } from "@nestjs/common";

export const PermissionsMeta = (...permissions: string[]) =>
  SetMetadata("permissions", permissions);
