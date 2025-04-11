import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as mongoose from "mongoose";
import { Model, PipelineStage } from "mongoose";
import { User, UserDocument } from "@/datasources/mongodb/schemas/user.schema";
import {
  Payment,
  PaymentDocument,
} from "@/datasources/mongodb/schemas/payment.schema";
import {
  PaymentLog,
  PaymentLogDocument,
} from "@/datasources/mongodb/schemas/paymentLog.schema";

import {
  Event,
  EventDocument,
} from "@/datasources/mongodb/schemas/event.schema";
import {
  Attendee,
  AttendeeDocument,
} from "@/datasources/mongodb/schemas/attendee.schema";
import {
  Ticket,
  TicketDocument,
} from "@/datasources/mongodb/schemas/ticket.schema";
import { EventLog, EventLogDocument } from "./schemas/eventLog.schema";
import { Discount, DiscountDocument } from "./schemas/discount.schema";
import {
  Permission,
  PermissionDocument,
} from "@/datasources/mongodb/schemas/permission.schema";

import { Role, RoleDocument } from "@/datasources/mongodb/schemas/role.schema";
import {
  Organisation,
  OrganisationDocument,
} from "@/datasources/mongodb/schemas/organisation.schema";

interface IMatch {
  $match: Record<string, any>;
}

interface IUnwind {
  $unwind: string;
}

interface IGroup {
  $group: Record<string, any>;
}

interface IProject {
  $project: Record<string, any>;
}

export type AggregateTypes = IMatch | IUnwind | IGroup | IProject;

export abstract class IGenericRepository<T> {
  abstract aggregateRecords(query: PipelineStage[]): Promise<any>;

  abstract getAll(
    filter: mongoose._FilterQuery<T>,
    projection?: string | string[],
    populate?: string[],
    limit?: number,
    skip?: number,
    sortField?: string,
  ): Promise<T[]>;

  abstract getAllWithNoPagination(
    filter: mongoose._FilterQuery<T>,
    projection?: string | string[],
    populate?: string[],
    sortField?: string,
  ): Promise<T[]>;

  abstract getOne(
    item: mongoose._FilterQuery<T>,
    projection: string | string[],
    populate?: string[],
  ): Promise<any>;

  abstract getOneWithFields(
    item: mongoose._FilterQuery<T>,
    populate?: string[],
  ): Promise<any>;

  abstract getOneWithAllFields(
    item: mongoose._FilterQuery<T>,
    populate?: string[],
  ): Promise<any>;

  abstract create(item: Partial<T>): Promise<T>;

  abstract createWithTransaction(
    item: Partial<T>,
    session: mongoose.ClientSession,
  ): Promise<T>;

  abstract getOneWithTransaction(
    item: mongoose._FilterQuery<T>,
    session: mongoose.ClientSession,
  ): Promise<T>;

  abstract getAllWithTransaction(
    item: mongoose._FilterQuery<T>,
    session: mongoose.ClientSession,
    projection?: string[],
  ): Promise<T[]>;

  abstract updateOne(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): Promise<T>;

  abstract updateOneOrCreate(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): Promise<T>;

  abstract updateOneOrCreateWithOldData(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): Promise<T>;

  abstract updateMany(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
  ): Promise<T>;

  abstract count(filter: mongoose._FilterQuery<T>): Promise<number>;
  abstract search(query: string, limit?: number, skip?: number): Promise<T[]>;

  abstract deleteOne(query: mongoose._FilterQuery<T>): Promise<any>;
  abstract createMany(items: Partial<T>[]): Promise<T[]>;
  abstract deleteMany(query: mongoose._FilterQuery<T>): Promise<any>;
}

export class MongoGenericRepository<T> implements IGenericRepository<T> {
  private readonly _repository: Model<T>;
  private _populateOnFind: string[];

  constructor(repository: Model<T>, populateOnFind: string[] = []) {
    this._repository = repository;
    this._populateOnFind = populateOnFind;
  }

  aggregateRecords(query: PipelineStage[]): Promise<any> {
    return this._repository.aggregate(query).exec();
  }

  getAll(
    filter: mongoose._FilterQuery<T>,
    projection: string | string[],
    populate?: string[],
    limit?: number,
    skip?: number,
    sortField?: string,
  ): Promise<T[]> {
    return this._repository
      .find(filter)
      .populate(populate ? populate : this._populateOnFind)
      .select(projection)
      .limit(limit || 0)
      .skip(skip || 0)
      .sort({ [sortField as string]: -1 } || { _id: -1 })
      .exec();
  }

  getAllWithNoPagination(
    filter: mongoose._FilterQuery<T>,
    projection?: string | string[],
    populate?: string[],
    sortField?: string,
  ): Promise<T[]> {
    return this._repository
      .find(filter)
      .populate(populate ? populate : this._populateOnFind)
      .select(projection)
      .sort({ [sortField as string]: -1 } || { _id: -1 })
      .exec();
  }

  getOne(
    item: mongoose._FilterQuery<T>,
    projection: string | string[],
    populate?: string[],
  ): Promise<any> {
    return this._repository
      .findOne(item, "body")
      .populate(populate ? populate : this._populateOnFind)
      .select(projection)
      .exec();
  }

  getOneWithFields(
    item: mongoose._FilterQuery<T>,
    populate?: string[],
  ): Promise<any> {
    return this._repository
      .findOne(item)
      .populate(populate ? populate : this._populateOnFind)
      .exec();
  }

  getOneWithAllFields(
    item: mongoose._FilterQuery<T>,
    populate?: string[],
  ): Promise<any> {
    return this._repository
      .findOne(item)
      .populate(populate ? populate : this._populateOnFind)
      .exec();
  }

  create(item: Partial<T>): Promise<T> {
    return this._repository.create(item);
  }

  async createWithTransaction(
    item: Partial<T>,
    session: mongoose.ClientSession,
  ): Promise<T> {
    const result = new this._repository(item);
    await result.save({ session });
    return result;
  }

  getOneWithTransaction(
    item: mongoose._FilterQuery<T>,
    session: mongoose.ClientSession,
  ): Promise<any> {
    return this._repository.findOne(item).session(session).exec();
  }

  async getAllWithTransaction(
    item: mongoose._FilterQuery<T>,
    session: mongoose.ClientSession,
    projections: string[],
  ): Promise<any> {
    return this._repository.find(item).session(session).select(projections);
  }

  updateOne(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): any {
    return this._repository.findOneAndUpdate(query, data, {
      session,
      new: true,
    });
  }

  updateOneOrCreate(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): any {
    return this._repository.findOneAndUpdate(query, data, {
      session,
      new: true,
      upsert: true,
    });
  }

  updateOneOrCreateWithOldData(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): any {
    return this._repository.findOneAndUpdate(query, data, {
      session,
      new: false,
      upsert: true,
    });
  }

  updateMany(
    query: mongoose._FilterQuery<T>,
    data: mongoose.UpdateQuery<T>,
    session?: mongoose.ClientSession,
  ): any {
    return this._repository.updateMany(query, data, { session });
  }

  count(query: mongoose._FilterQuery<T>): any {
    return this._repository.countDocuments(query);
  }

  search(query: string, limit: number = 10, skip: number = 0): Promise<T[]> {
    return this._repository
      .find({ $text: { $search: query } }, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  deleteOne(query: mongoose._FilterQuery<T>) {
    return this._repository.findOneAndDelete(query).exec();
  }

  createMany(items: Partial<T>[]): Promise<T[]> {
    return this._repository.insertMany(items);
  }

  deleteMany(query: mongoose._FilterQuery<T>): Promise<any> {
    return this._repository.deleteMany(query).exec();
  }
}

export abstract class MongoDataServices {
  abstract users: IGenericRepository<User>;
  abstract payments: IGenericRepository<Payment>;
  abstract paymentLogs: IGenericRepository<PaymentLog>;
  abstract events: IGenericRepository<Event>;
  abstract tickets: IGenericRepository<Ticket>;
  abstract attendees: IGenericRepository<Attendee>;
  abstract eventLogs: IGenericRepository<EventLog>;
  abstract discounts: IGenericRepository<Discount>;
  abstract permissions: IGenericRepository<Permission>;
  abstract roles: IGenericRepository<Role>;
  abstract organisations: IGenericRepository<Organisation>;
}

@Injectable()
export class NosqlService implements MongoDataServices, OnApplicationBootstrap {
  users: MongoGenericRepository<User>;
  payments: MongoGenericRepository<Payment>;
  paymentLogs: MongoGenericRepository<PaymentLog>;
  events: MongoGenericRepository<Event>;
  tickets: MongoGenericRepository<Ticket>;
  attendees: MongoGenericRepository<Attendee>;
  eventLogs: MongoGenericRepository<EventLog>;
  discounts: MongoGenericRepository<Discount>;
  permissions: MongoGenericRepository<Permission>;
  roles: MongoGenericRepository<Role>;
  organisations: MongoGenericRepository<Organisation>;
  constructor(
    @InjectModel(User.name, "hyperhubs")
    private UserRepository: Model<UserDocument>,
    @InjectModel(Payment.name, "hyperhubs")
    private PaymentRepository: Model<PaymentDocument>,
    @InjectModel(PaymentLog.name, "hyperhubs")
    private PaymentLogRepository: Model<PaymentLogDocument>,
    @InjectModel(Event.name, "hyperhubs")
    private EventRepository: Model<EventDocument>,
    @InjectModel(Ticket.name, "hyperhubs")
    private TicketRepository: Model<TicketDocument>,
    @InjectModel(Attendee.name, "hyperhubs")
    private AttendeeRepository: Model<AttendeeDocument>,
    @InjectModel(EventLog.name, "hyperhubs")
    private EventLogRepository: Model<EventLogDocument>,
    @InjectModel(Discount.name, "hyperhubs")
    private DiscountRepository: Model<DiscountDocument>,
    @InjectModel(Permission.name, "hyperhubs")
    private PermissionRepository: Model<PermissionDocument>,
    @InjectModel(Role.name, "hyperhubs")
    private RoleRepository: Model<RoleDocument>,
    @InjectModel(Organisation.name, "hyperhubs")
    private OrganisationRepository: Model<OrganisationDocument>,
  ) {}

  onApplicationBootstrap() {
    this.users = new MongoGenericRepository<User>(this.UserRepository);
    this.payments = new MongoGenericRepository<Payment>(this.PaymentRepository);
    this.paymentLogs = new MongoGenericRepository<PaymentLog>(
      this.PaymentLogRepository,
    );
    this.events = new MongoGenericRepository<Event>(this.EventRepository);
    this.tickets = new MongoGenericRepository<Ticket>(this.TicketRepository);
    this.attendees = new MongoGenericRepository<Attendee>(
      this.AttendeeRepository,
    );
    this.eventLogs = new MongoGenericRepository<EventLog>(
      this.EventLogRepository,
    );
    this.discounts = new MongoGenericRepository<Discount>(
      this.DiscountRepository,
    );
    this.permissions = new MongoGenericRepository<Permission>(
      this.PermissionRepository,
    );
    this.roles = new MongoGenericRepository<Role>(this.RoleRepository);
    this.organisations = new MongoGenericRepository<Organisation>(
      this.OrganisationRepository,
    );
  }
}
