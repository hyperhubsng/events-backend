import { Controller, Get, Res } from "@nestjs/common";
import { AppService } from "./app.service";
import { PUBLIC } from "./features/auth/public.decorator";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @PUBLIC()
  @Get()
  getWelcomeMessage(@Res() res: any) {
    return res.status(200).json(this.appService.getWelcomeMessage());
  }
}
