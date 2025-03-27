import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "@/shared/interface/interface";

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (user && user.userType === "admin") {
      return true;
    }

    throw new HttpException(
      "Sorry, you cannot access this",
      HttpStatus.UNAUTHORIZED,
    );
  }
}
