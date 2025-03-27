import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { PaymentService } from "../payment/payment.service";
import { S3Service } from "../s3/s3.service";
import { UserService } from "../user/user.service";
import { EventService } from "./event.service";
import { Test, TestingModule } from "@nestjs/testing";
import { Request } from "express";
import { HttpQueryDTO } from "./event.dto";
import { User } from "@/datasources/mongodb/schemas/user.schema";

describe("Event Service", () => {
  let eventService: EventService;
  // let userService: UserService;
  // let paymentService: PaymentService;
  // let mongoService: MongoDataServices;

  let mockRequest: Partial<Request>;
  let mockHttpQuery: HttpQueryDTO;
  let mockUser: User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: MongoDataServices,
          useValue: {
            events: {
              count: jest.fn(),
              aggregateRecords: jest.fn(),
            },
          },
        },

        {
          provide: UserService,
          useValue: {},
        },
        {
          provide: S3Service,
          useValue: {},
        },
        {
          provide: PaymentService,
          useValue: {},
        },
      ],
    }).compile();

    eventService = module.get<EventService>(EventService);
    // paymentService = module.get<PaymentService>(PaymentService);
    // userService = module.get<UserService>(UserService);
    // mongoService = module.get<MongoDataServices>(MongoDataServices);

    mockRequest = {
      query: {},
    };

    mockHttpQuery = {} as HttpQueryDTO;
    mockUser = {} as User;

    eventService.aggregateEvent = jest
      .fn()
      .mockResolvedValue([{ event: "Event Title" }]);
  });

  describe("List Events", () => {
    it("Should return all events", async () => {
      const result = await eventService.listEvents(
        mockRequest as Request,
        mockHttpQuery,
        mockUser,
      );

      expect(result).toEqual({
        status: "success",
        data: [{ event: "Event Title" }],
        extraData: expect.any(Object),
      });
    });
  });
});
