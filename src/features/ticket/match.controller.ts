import { SuccessResponse } from '@/shared/response/success-response';
import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { MatchService } from './match.service';
import { UserDecorator } from '../user/user.decorator';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { AddMatchPipe } from './match.pipe';
import { AddMatchDTO } from './match.dto';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-pipe';
import { PUBLIC } from '../auth/public.decorator';
import { PaymentService } from '../payment/payment.service';
import { Types } from 'mongoose';

@Controller('matches')
export class MatchController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly matchService: MatchService,
    private readonly paymentService: PaymentService,
  ) {}
  @Post()
  async createMatch(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new AddMatchPipe()) body: AddMatchDTO,
    @UserDecorator() user: User,
  ) {
    const data = await this.matchService.createNewMatch(body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get()
  async listMatches(@Req() req: Request, @Res() res: Response) {
    const { data, extraData } = await this.matchService.listMatches(req);
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @PUBLIC()
  @Get('/verify-paystack-payment')
  async verifyPaystackPayment(@Req() req: Request, @Res() res: Response) {
    const data = await this.paymentService.runPaystackCallback(req);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get(':id')
  async viewMatch(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param('id', ObjectIdValidationPipe) id: string,
  ) {
    const data = await this.matchService.getOneMatch({
      _id: new Types.ObjectId(id),
    });
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Post(':id/pay')
  async payForMatch(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: any,
    @Param('id', ObjectIdValidationPipe) matchId: string,
  ) {
    const data = await this.matchService.payForMatch(matchId, body);
    await this.successResponse.ok(res, req, { data });
  }
}
