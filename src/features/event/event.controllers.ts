import { SuccessResponse } from "@/shared/response/success-response";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  SetMetadata,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { PUBLIC } from "../auth/public.decorator";
import { EventService } from "./event.service";
import { ObjectIdValidationPipe } from "@/shared/pipes/object-id-pipe";
import { Types } from "mongoose";
import {
  AddEventDTO,
  CreateTicketDTO,
  HttpQueryDTO,
  PurchaseTicketDTO,
} from "./event.dto";
import {
  AddEventPipe,
  CreateTicketPipe,
  EventQueryPipe,
  PurchaseTicketPipe,
  UpdateEventPipe,
  UpdateTicketPipe,
} from "./event.pipe";
import { PaymentService } from "../payment/payment.service";
import { FilesInterceptor } from "@nestjs/platform-express";
import * as multer from "multer";
import { PermissionsMeta } from "../permission/permission.decorator";

const MAX_FILES = 5;

@Controller()
export class EventsController {
  constructor(
    private readonly successResponse: SuccessResponse,
    private readonly eventService: EventService,
    private readonly paymentService: PaymentService
  ) {}

  @Post("events")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      storage: multer.memoryStorage(),
    })
  )
  async createEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new AddEventPipe()) body: AddEventDTO,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @UserDecorator() user: User
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException("Upload a file ");
    }
    const data = await this.eventService.addEvent(files, body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("events")
  @SetMetadata("accessTitle", "ListEvents")
  @PermissionsMeta("ListEvents")
  async listEvents(
    @Req() req: Request,
    @Res() res: Response,
    @Query(new EventQueryPipe()) query: HttpQueryDTO,
    @UserDecorator() user: User
  ) {
    const { data, extraData } = await this.eventService.listEvents(
      req,
      query,
      user
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @PUBLIC()
  @Get("/events/verify-paystack-payment")
  async verifyPaystackPayment(@Req() req: Request, @Res() res: Response) {
    const data = await this.paymentService.runPaystackCallback(
      req.query.reference as string
    );
    await this.successResponse.ok(res, req, { data });
  }

  @Delete("/tickets/:ticketId")
  async removeTicket(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Param("ticketId", new ObjectIdValidationPipe()) ticketId: string
  ) {
    const data = await this.eventService.removeTicket(ticketId, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Put("/tickets/:ticketId")
  async updateTicket(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new UpdateTicketPipe()) body: CreateTicketDTO,
    @UserDecorator() user: User,
    @Param("ticketId", new ObjectIdValidationPipe()) ticketId: string
  ) {
    const data = await this.eventService.updateTicket(ticketId, body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get("/events/fetch-for-public")
  async listCommunitiesForAnons(
    @Req() req: Request,
    @Res() res: Response,
    @Query(new EventQueryPipe()) query: HttpQueryDTO
  ) {
    query.status = "upcoming";
    const { data, extraData } = await this.eventService.listEvents(req, query);
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @Post("/events/:eventId/tickets")
  async createTicket(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new CreateTicketPipe()) body: CreateTicketDTO,
    @UserDecorator() user: User,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string
  ) {
    const data = await this.eventService.createTicket(body, user, eventId);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get("/events/:eventId/tickets")
  async listTickets(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string,
    @UserDecorator() user: User
  ) {
    const data = await this.eventService.listTickets(req, eventId, user);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Post("/events/:eventId/purchase")
  async buyTicket(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string,
    @Body(new PurchaseTicketPipe()) body: PurchaseTicketDTO
  ) {
    const data = await this.eventService.buyTicket(eventId, body);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Post("/events/:eventId/apply-discount")
  async applyDiscountToTicketPurchase(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string,
    @Body(new PurchaseTicketPipe()) body: PurchaseTicketDTO
  ) {
    const data = await this.eventService.buyTicket(eventId, body);
    await this.successResponse.ok(res, req, { data });
  }

  @Get("/events/:eventId/sales-report")
  async getSalesReport(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string
  ) {
    const { data, extraData } = await this.eventService.getSalesReport(
      eventId,
      req
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @Get("/events/:eventId/guests")
  async getEventGuests(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string
  ) {
    const { data, extraData } = await this.eventService.getEventAttendees(
      eventId,
      req
    );
    await this.successResponse.ok(res, req, { data, pagination: extraData });
  }

  @Delete("/events/:eventId")
  async removeEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string,
    @UserDecorator() user: User
  ) {
    const data = await this.eventService.removeEvent(eventId, user);
    await this.successResponse.ok(res, req, { data });
  }

  @Put("/events/:eventId")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      storage: multer.memoryStorage(),
    })
  )
  async editEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new UpdateEventPipe()) body: AddEventDTO,
    @Param("eventId", new ObjectIdValidationPipe()) eventId: string,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @UserDecorator() user: User
  ) {
    const data = await this.eventService.editEvent(files, eventId, body, user);
    await this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Get("/events/:id")
  async getEvent(
    @Req() req: Request,
    @Res() res: Response,
    @Param("id", ObjectIdValidationPipe) id: string
  ) {
    const data = await this.eventService.getOneEvent({
      _id: new Types.ObjectId(id),
    });
    await this.successResponse.ok(res, req, { data });
  }
}
