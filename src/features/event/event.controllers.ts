import { SuccessResponse } from '@/shared/response/success-response';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserDecorator } from '../user/user.decorator';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { PUBLIC } from '../auth/public.decorator';
import { EventService } from './event.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-pipe';
import { Types } from 'mongoose';
import { AddEventDTO, CreateTicketDTO, HttpQueryDTO, PurchaseTicketDTO } from './event.dto';
import { AddEventPipe, CreateTicketPipe, EventQueryPipe, PurchaseTicketPipe } from './event.pipe';
import { PaymentService } from '../payment/payment.service';
import {  FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

const FILE_SIZE_LIMIT = 1000*1000*2
const MAX_FILES = 5;

@Controller('events')
export class EventsController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly eventService : EventService ,
    private readonly paymentService : PaymentService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files' , MAX_FILES  , {
    storage :  multer.memoryStorage()
  }))
  async createEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new AddEventPipe()) body : AddEventDTO , 
    @UploadedFiles() files: Array<Express.Multer.File>,
    @UserDecorator() user: User,
  ) {
    if (!files || files.length === 0 ) {
      throw new BadRequestException('Upload a file ');
    }
    const data = await this.eventService.addEvent(files , body , user)
    await this.successResponse.ok(res, req, { data  });
  }

  @Get()
  async listEvents(
    @Req() req: Request,
    @Res() res: Response , 
    @Query(new EventQueryPipe()) query : HttpQueryDTO , 
    @UserDecorator() user : User
  ) {
    const { data, extraData } = await this.eventService.listEvents(req , query , user);
    await this.successResponse.ok(res, req, { data, pagination: extraData }); 
  }


  @PUBLIC()
  @Get('/verify-paystack-payment')
  async verifyPaystackPayment(@Req() req: Request, @Res() res: Response) {
    const data = await this.paymentService.runPaystackCallback(req);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get("/fetch-for-public")
  async listCommunitiesForAnons(
    @Req() req: Request,
    @Res() res: Response ,
    @Query(new EventQueryPipe()) query : HttpQueryDTO , 
  ) {
    const { data, extraData } = await this.eventService.listEvents(req , query);
    await this.successResponse.ok(res, req, { data, pagination: extraData }); 
  }

  @Post("/:eventId/tickets")
  async createTicket(
    @Req() req: Request,
    @Res() res: Response ,
    @Body(new  CreateTicketPipe()) body : CreateTicketDTO , 
    @UserDecorator() user: User,
    @Param("eventId" , new ObjectIdValidationPipe()) eventId : string
  ) {
    const data = await this.eventService.createTicket(body ,user , eventId );
    await this.successResponse.ok(res, req, { data}); 
  }

  @Get("/:eventId/tickets")
  async listTickets(
    @Req() req: Request,
    @Res() res: Response , 
    @Param("eventId" , new ObjectIdValidationPipe()) eventId : string,
    @UserDecorator() user: User,
  ) {
    const { data, extraData } = await this.eventService.listTickets(req , eventId , user);
    await this.successResponse.ok(res, req, { data, pagination: extraData }); 
  }

  @PUBLIC()
  @Post("/:eventId/purchase")
  async buyTicket(
    @Req() req: Request,
    @Res() res: Response , 
    @Param("eventId" , new ObjectIdValidationPipe()) eventId : string,
    @Body(new PurchaseTicketPipe()) body : PurchaseTicketDTO
  ) {
    const data  = await this.eventService.buyTicket(eventId , body) ;
    await this.successResponse.ok(res, req, { data }); 
  }

  @Get("/:eventId/sales-report")
  async getSalesReport(
    @Req() req: Request,
    @Res() res: Response , 
    @Param("eventId" , new ObjectIdValidationPipe()) eventId : string,
  ) {
    const {data , extraData}  = await this.eventService.getSalesReport(eventId,req) ;
    await this.successResponse.ok(res, req, { data, pagination: extraData }); 
  }
  
  @PUBLIC()
  @Get(':id')
  async getEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ObjectIdValidationPipe) id: string,
  ) {
    const data = await this.eventService.getOneEvent({
      _id: new Types.ObjectId(id),
    });
    await this.successResponse.ok(res, req, { data });
  }
}
