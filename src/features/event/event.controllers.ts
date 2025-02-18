import { SuccessResponse } from '@/shared/response/success-response';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserDecorator } from '../user/user.decorator';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import { AddUserDTO } from '../user/user.dto';
import { PUBLIC } from '../auth/public.decorator';
import { EventService } from './event.service';
import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-pipe';
import { Types } from 'mongoose';
import { AddEventDTO, CreateTicketDTO, HttpQueryDTO } from './event.dto';
import { AddEventPipe, CreateTicketPipe, EventQueryPipe } from './event.pipe';

@Controller('events')
export class EventsController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly eventService : EventService 
  ) {}

  @Post()
  async createEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new AddEventPipe()) body : AddEventDTO , 
    @UserDecorator() user: User,
  ) {
    const data = await this.eventService.addEvent(body , user)
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
    @Query(new EventQueryPipe()) query : HttpQueryDTO , 
  ) {
    const { data, extraData } = await this.eventService.listTickets();
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
