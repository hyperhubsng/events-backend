import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "@/shared/interface/interface";

@Injectable()
export class RoleCreatorGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;

    if (
      user &&
      ["superadmin", "admin", "vendor"].includes(user.userType.toLowerCase())
    ) {
      return true;
    }
    throw new HttpException(
      "Sorry, you cannot access this",
      HttpStatus.UNAUTHORIZED,
    );
  }
}
