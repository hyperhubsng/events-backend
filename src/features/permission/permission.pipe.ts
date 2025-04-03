import { pipeTransformer } from "@/shared/utils/pipe.transformer";
import { PipeTransform } from "@nestjs/common";
import { addPermissionSchema, addRoleSchema } from "@/shared/joi-schema";
import { responseHash } from "@/constants";
import { CreatePermissionDTO, CreateRoleDTO } from "./permission.dto";

export class CreatePermissionPipe implements PipeTransform {
  transform(value: CreatePermissionDTO) {
    return pipeTransformer<CreatePermissionDTO>(value, addPermissionSchema);
  }
}

export class CreateRolePipe implements PipeTransform {
  transform(value: CreateRoleDTO) {
    return pipeTransformer<CreateRoleDTO>(value, addRoleSchema);
  }
}
