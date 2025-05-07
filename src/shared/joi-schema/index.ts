import { validationMessages } from "../utils/validation-messages";
import * as Joi from "joi";
import * as joiDate from "@joi/date";
import { rejectPastDate } from "../utils/reject-past-date";
import { validateObjectId } from "../utils/objectid-joi-validator";
import { dateChecker } from "../utils/date-checker";
const joi = Joi.extend(joiDate);

export const addEventSchema = joi
  .object({
    description: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    title: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    eventType: joi
      .string()
      .valid("free", "paid")
      .optional()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    venue: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("venue").empty,
        "any.only": validationMessages("venue").only,
      }),
    coordinates: joi
      .array()
      .items(joi.number().strict().required())
      .length(2)
      .optional()
      .messages({
        "string.empty": validationMessages("coordinates").empty,
        "any.only": validationMessages("coordinates").only,
        "array.base": validationMessages("coordinates").base,
        "array.length": validationMessages("coordinates").length,
        "number.base": validationMessages("coordinates").numberBase,
      }),
    ownerId: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("ownerId").empty,
        "any.only": validationMessages("ownerId").only,
      }),
    cost: joi
      .number()
      .positive()
      .precision(2)
      .strict()
      .min(500)
      .optional()
      .messages({
        "string.empty": validationMessages("cost").empty,
        "any.only": validationMessages("cost").only,
        "number.base": validationMessages("cost").number,
        "any.required": validationMessages("cost").required,
        "number.min": validationMessages("cost").min,
        "number.positive": validationMessages("cost").positive,
      }),
    availableSlots: joi
      .number()
      .optional()
      .messages({
        "string.empty": validationMessages("availableSlots").empty,
        "any.only": validationMessages("availableSlots").only,
      }),
    startDate: joi
      .date()
      .custom(rejectPastDate)
      .format("YYYY-MM-DD HH:mm")
      .required()
      .messages({
        "any.required": validationMessages("startDate").required,
        "string.pattern.base":
          "Provide a valid startDate in YYYY-MM-DD HH:mm format",
        "string.empty": validationMessages("startDate").empty,
        "any.only": validationMessages("startDate").only,
        "string.base": validationMessages("startDate").string,
      }),
    endDate: joi
      .date()
      .custom(dateChecker)
      .format("YYYY-MM-DD HH:mm")
      .optional()
      .messages({
        "any.required": validationMessages("endDate").required,
        "string.pattern.base":
          "Provide a valid matchDate in YYYY-MM-DD HH:mm format",
        "string.empty": validationMessages("endDate").empty,
        "any.only": validationMessages("endDate").only,
        "string.base": validationMessages("endDate").string,
      }),
    tickets: joi
      .array()
      .items(
        joi.object({
          ticketId: joi.string().custom(validateObjectId).optional(),
          description: joi.when("ticketId", {
            is: null,
            then: joi
              .string()
              .required()
              .messages({
                "string.empty": validationMessages("description").empty,
                "any.only": validationMessages("description").only,
              }),
            otherwise: joi
              .string()
              .optional()
              .messages({
                "string.empty": validationMessages("description").empty,
                "any.only": validationMessages("description").only,
              }),
          }),
          title: joi.when("ticketId", {
            is: null,
            then: joi
              .string()
              .required()
              .messages({
                "string.empty": validationMessages("title").empty,
                "any.only": validationMessages("title").only,
              }),
            otherwise: joi
              .string()
              .required()
              .messages({
                "string.empty": validationMessages("title").empty,
                "any.only": validationMessages("title").only,
              }),
          }),
          price: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .min(500)
              .required()
              .messages({
                "string.empty": validationMessages("price").empty,
                "any.only": validationMessages("price").only,
                "number.base": validationMessages("price").number,
                "any.required": validationMessages("price").required,
                "number.min": validationMessages("price").min,
                "number.positive": validationMessages("price").positive,
              }),
            otherwise: joi
              .number()
              .min(500)
              .optional()
              .messages({
                "string.empty": validationMessages("price").empty,
                "any.only": validationMessages("price").only,
                "number.base": validationMessages("price").number,
                "any.required": validationMessages("price").required,
                "number.min": validationMessages("price").min,
                "number.positive": validationMessages("price").positive,
              }),
          }),
          quantity: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .required()
              .messages({
                "string.empty": validationMessages("quantity").empty,
                "any.only": validationMessages("quantity").only,
              }),
            otherwise: joi
              .number()
              .optional()
              .messages({
                "string.empty": validationMessages("quantity").empty,
                "any.only": validationMessages("quantity").only,
              }),
          }),
          orderLimit: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .positive()
              .min(0)
              .required()
              .messages({
                "string.empty": validationMessages("orderLimit").empty,
                "any.only": validationMessages("orderLimit").only,
                "number.min": validationMessages("orderLimit").min,
                "number.positive": validationMessages("orderLimit").positive,
              }),
            otherwise: joi
              .number()
              .positive()
              .min(0)
              .optional()
              .messages({
                "string.empty": validationMessages("orderLimit").empty,
                "any.only": validationMessages("orderLimit").only,
                "number.min": validationMessages("orderLimit").min,
                "number.positive": validationMessages("orderLimit").positive,
              }),
          }),
        }),
      )
      .optional()
      .messages({
        "any.required": validationMessages("tickets").required,
        "any.only": validationMessages("tickets").only,
      }),
  })
  .options({ stripUnknown: true });

export const signupSchema = joi
  .object({
    email: joi
      .string()
      .email({
        minDomainSegments: 2,
      })
      .required()
      .messages({
        "string.empty": validationMessages("email").empty,
        "any.required": validationMessages("email").required,
        "any.only": validationMessages("email").only,
      }),
    userType: joi
      .string()
      .valid("vendor", "vendoruser", "adminuser")
      .optional()
      .messages({
        "string.empty": validationMessages("userType").empty,
        "any.required": validationMessages("userType").required,
        "any.only": validationMessages("userType").only,
      }),
    password: joi
      .string()
      .min(8)
      .required()
      .messages({
        "string.empty": validationMessages("password").empty,
        "any.required": validationMessages("password").required,
        "any.only": validationMessages("password").only,
        "string.length": validationMessages("password").length,
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref("password"))
      .min(8)
      .optional()
      .messages({
        "any.required": validationMessages("confirmPassword").required,
        "any.only": "Passwords do not match",
        "string.length": validationMessages("conifrmPassword").length,
      }),
    firstName: joi
      .string()
      .required()
      .messages({
        "any.required": validationMessages("firstName").required,
        "string.empty": validationMessages("firstName").empty,
        "any.only": validationMessages("firstName").only,
        "string.base": validationMessages("firstName").string,
      }),
    lastName: joi
      .string()
      .required()
      .messages({
        "any.required": validationMessages("lastName").required,
        "string.empty": validationMessages("lastName").empty,
        "any.only": validationMessages("lastName").only,
        "string.base": validationMessages("lastName").string,
      }),
    companyName: joi
      .string()
      .optional()
      .messages({
        "any.required": validationMessages("companyName").required,
        "string.empty": validationMessages("companyName").empty,
        "any.only": validationMessages("companyName").only,
        "string.base": validationMessages("companyName").string,
      }),
    website: joi
      .string()
      .optional()
      .messages({
        "any.required": validationMessages("website").required,
        "string.empty": validationMessages("website").empty,
        "any.only": validationMessages("website").only,
        "string.base": validationMessages("website").string,
      }),
    phoneNumber: joi.when("userType", {
      is: ["vendor"],
      then: joi
        .string()
        .required()
        .pattern(new RegExp("^(\\+?234|0)?[789][01]\\d{8}$"))
        .messages({
          "string.pattern.base": "Provide a valid phone number",
          "string.empty": validationMessages("phoneNumber").empty,
          "any.required": validationMessages("phoneNumber").required,
          "any.only": validationMessages("phoneNumber").only,
          "string.base": validationMessages("phoneNumber").string,
        }),
      otherwise: joi
        .string()
        .optional()
        .pattern(new RegExp("^(\\+?234|0)?[789][01]\\d{8}$"))
        .messages({
          "string.pattern.base": "Provide a valid phone number",
          "string.empty": validationMessages("phoneNumber").empty,
          "any.required": validationMessages("phoneNumber").required,
          "any.only": validationMessages("phoneNumber").only,
          "string.base": validationMessages("phoneNumber").string,
        }),
    }),
    role: joi.when("userType", {
      is: ["adminuser", "vendoruser"],
      then: joi
        .string()
        .custom(validateObjectId)
        .optional()
        .messages({
          "string.empty": validationMessages("role").empty,
          "any.required": validationMessages("role").required,
          "any.only": validationMessages("role").only,
          "string.base": validationMessages("role").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "role is not an allowed field for this action",
      }),
    }),
  })
  .options({ stripUnknown: true });

export const verifyAccountSchema = joi.object({
  otp: joi
    .string()
    .required()
    .messages({
      "any.required": validationMessages("otp").required,
      "any.only": validationMessages("otp").only,
      "string.base": validationMessages("otp").string,
    }),
  otpEmail: joi
    .string()
    .email({
      minDomainSegments: 2,
    })
    .required()
    .messages({
      "any.only": validationMessages("otpEmail").only,
    }),
});

export const forgotPasswordSchema = joi.object({
  email: joi
    .string()
    .email({
      minDomainSegments: 2,
    })
    .required()
    .messages({
      "any.only": validationMessages("otpEmail").only,
    }),
});

export const setPasswordSchema = joi
  .object({
    identifier: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("identifier").empty,
        "any.required": validationMessages("identifier").required,
        "any.only": validationMessages("identifier").only,
      }),
    password: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("password").empty,
        "any.required": validationMessages("password").required,
        "any.only": validationMessages("password").only,
      }),
    confirmPassword: joi
      .string()
      .required()
      .valid(Joi.ref("password"))
      .messages({
        "string.empty": validationMessages("confirmPassword").empty,
        "any.required": validationMessages("confirmPassword").required,
        "any.only": "Passwords do not match",
      }),
    resetToken: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("resetToken").empty,
        "any.required": validationMessages("resetToken").required,
        "any.only": validationMessages("resetToken").only,
      }),
  })
  .options({ stripUnknown: true });

export const eventListSchema = joi
  .object({
    q: joi
      .string()
      .optional()
      .messages({
        "string.base": validationMessages("q").string,
      }),
    select: joi
      .string()
      .optional()
      .messages({
        "string.base": validationMessages("select").string,
        "string.empty": validationMessages("select").empty,
      }),
    country: joi
      .string()
      .optional()
      .messages({
        "string.base": validationMessages("country").string,
      }),
    distance: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("distance").number,
        "number.empty": validationMessages("distance").empty,
      }),
    lat: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("lat").number,
        "number.empty": validationMessages("lat").empty,
      }),
    long: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("long").number,
        "number.empty": validationMessages("long").empty,
      }),
    page: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("page").number,
        "number.empty": validationMessages("page").empty,
      }),
    cost: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("cost").number,
        "number.empty": validationMessages("cost").empty,
      }),
    limit: joi.number().messages({
      "number.base": "limit should be of type number",
      "number.empty": "limit cannot be an empty param",
      "any.required": validationMessages("limit").required,
    }),
    from: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("from").required,
        "string.pattern.base": "Provide a valid from in YYYY-MM-DD format",
        "string.empty": validationMessages("from").empty,
        "any.only": validationMessages("from").only,
        "string.base": validationMessages("from").string,
      }),
    to: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("to").required,
        "string.pattern.base": "Provide a valid to in YYYY-MM-DD format",
        "string.empty": validationMessages("to").empty,
        "any.only": validationMessages("to").only,
        "string.base": validationMessages("to").string,
      }),
    status: joi
      .string()
      .valid(
        "pending",
        "ongoing",
        "completed",
        "deleted",
        "rejected",
        "cancelled",
        "upcoming",
        "past",
        "active",
      )
      .optional()
      .messages({
        "any.required": validationMessages("status").required,
        "string.empty": validationMessages("status").empty,
        "any.only": validationMessages("status").only,
        "string.base": validationMessages("status").string,
      }),
    owner: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("owner").empty,
        "any.only": validationMessages("owner").only,
      }),
  })
  .options({ stripUnknown: true });

export const createTicketSchema = joi
  .object({
    description: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    title: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    price: joi
      .number()
      .min(500)
      .required()
      .messages({
        "string.empty": validationMessages("price").empty,
        "any.only": validationMessages("price").only,
        "number.base": validationMessages("price").number,
        "any.required": validationMessages("price").required,
        "number.min": validationMessages("price").min,
        "number.positive": validationMessages("price").positive,
      }),
    quantity: joi
      .number()
      .required()
      .messages({
        "string.empty": validationMessages("quantity").empty,
        "any.only": validationMessages("quantity").only,
      }),
    orderLimit: joi
      .number()
      .positive()
      .min(0)
      .optional()
      .messages({
        "string.empty": validationMessages("orderLimit").empty,
        "any.only": validationMessages("orderLimit").only,
        "number.min": validationMessages("orderLimit").min,
        "number.positive": validationMessages("orderLimit").positive,
      }),
  })
  .options({ stripUnknown: true });

export const purchaseTicketSchema = joi
  .object({
    email: joi
      .string()
      .email({
        minDomainSegments: 2,
      })
      .required()
      .messages({
        "string.empty": validationMessages("email").empty,
        "any.required": validationMessages("email").required,
        "any.only": validationMessages("email").only,
      }),
    phoneNumber: joi
      .string()
      .required()
      .pattern(new RegExp("^(\\+?234|0)?[789][01]\\d{8}$"))
      .messages({
        "string.pattern.base": "Provide a valid phone number",
        "string.empty": validationMessages("phoneNumber").empty,
        "any.required": validationMessages("phoneNumber").required,
        "any.only": validationMessages("phoneNumber").only,
        "string.base": validationMessages("phoneNumber").string,
      }),
    firstName: joi
      .string()
      .required()
      .messages({
        "any.required": validationMessages("firstName").required,
        "string.empty": validationMessages("firstName").empty,
        "any.only": validationMessages("firstName").only,
        "string.base": validationMessages("firstName").string,
      }),
    lastName: joi
      .string()
      .required()
      .messages({
        "any.required": validationMessages("lastName").required,
        "string.empty": validationMessages("lastName").empty,
        "any.only": validationMessages("lastName").only,
        "string.base": validationMessages("lastName").string,
      }),
    tickets: joi
      .array()
      .items(
        joi.object({
          ticketId: joi.string().custom(validateObjectId).required(),
          quantity: joi.number().required(),
        }),
      )
      .required()
      .messages({
        "any.required": validationMessages("tickets").required,
        "any.only": validationMessages("tickets").only,
      }),
    charges: joi
      .array()
      .items(
        joi.object({
          title: joi.string().required(),
          amount: joi.number().required(),
        }),
      )
      .optional()
      .messages({
        "any.required": validationMessages("charg").required,
        "any.only": validationMessages("charg").only,
      }),
    callbackUrl: joi
      .string()
      .optional()
      .messages({
        "any.required": validationMessages("callbackUrl").required,
        "string.empty": validationMessages("callbackUrl").empty,
        "any.only": validationMessages("callbackUrl").only,
        "string.base": validationMessages("callbackUrl").string,
      }),
    paymentProcessor: joi
      .string()
      .valid("paystack", "flutterWave")
      .optional()
      .messages({
        "any.required": validationMessages("paymentProcessor").required,
        "string.empty": validationMessages("paymentProcessor").empty,
        "any.only": validationMessages("paymentProcessor").only,
        "string.base": validationMessages("paymentProcessor").string,
      }),
    discountCode: joi
      .string()
      .optional()
      .messages({
        "any.required": validationMessages("discountCode").required,
        "string.empty": validationMessages("discountCode").empty,
        "any.only": validationMessages("discountCode").only,
        "string.base": validationMessages("discountCode").string,
      }),
  })
  .options({ stripUnknown: true });

export const attendeeQuerySchema = joi
  .object({
    action: joi
      .string()
      .valid("checkin", "checkout", "view")
      .required()
      .messages({
        "any.required": validationMessages("action").required,
        "string.empty": validationMessages("action").empty,
        "any.only": validationMessages("action").only,
        "string.base": validationMessages("action").string,
      }),
    actionType: joi.when("action", {
      is: ["checkin", "checkout"],
      then: joi
        .string()
        .valid("scan", "code", "click")
        .required()
        .messages({
          "any.required": validationMessages("actionType").required,
          "string.empty": validationMessages("actionType").empty,
          "any.only": validationMessages("actionType").only,
          "string.base": validationMessages("actionType").string,
        }),
      otherwise: joi.allow(null, ""),
    }),
  })
  .options({ stripUnknown: true });

export const createDiscountSchema = joi
  .object({
    targets: joi
      .array()
      .items(
        joi.object({
          targetId: joi.string().custom(validateObjectId).required(),
          targetType: joi
            .string()
            .valid("ticket")
            .required()
            .messages({
              "any.required": validationMessages("targetType").required,
              "string.empty": validationMessages("targetType").empty,
              "any.only": validationMessages("targetType").only,
              "string.base": validationMessages("targetType").string,
            }),
        }),
      )
      .required()
      .messages({
        "any.required": validationMessages("targets").required,
        "any.only": validationMessages("targets").only,
      }),
    ownerId: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("ownerId").empty,
        "any.only": validationMessages("ownerId").only,
      }),
    code: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("code").empty,
        "any.only": validationMessages("code").only,
      }),
    hasExpiration: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasExpiration").empty,
        "any.only": validationMessages("hasExpiration").only,
        "any.required": validationMessages("hasExpiration").required,
        "boolean.base": validationMessages("hasExpiration").boolean,
      }),
    hasMaxCap: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasMaxCap").empty,
        "any.only": validationMessages("hasMaxCap").only,
        "any.required": validationMessages("hasMaxCap").required,
        "boolean.base": validationMessages("hasMaxCap").boolean,
      }),
    maxCap: joi.when("hasMaxCap", {
      is: true,
      then: joi
        .number()
        .positive()
        .precision(2)
        .strict()
        .min(10)
        .messages({
          "string.empty": validationMessages("maxCap").empty,
          "any.only": validationMessages("maxCap").only,
          "number.base": validationMessages("maxCap").number,
          "any.required": validationMessages("maxCap").required,
          "number.min": validationMessages("maxCap").min,
          "number.positive": validationMessages("maxCap").positive,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "maxCap is never allowed if hasMaxCap is false",
      }),
    }),
    hasUsageLimit: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasUsageLimit").empty,
        "any.only": validationMessages("hasUsageLimit").only,
        "any.required": validationMessages("hasUsageLimit").required,
        "boolean.base": validationMessages("hasUsageLimit").boolean,
      }),
    usageLimit: joi.number().when("hasUsageLimit", {
      is: true,
      then: joi
        .number()
        .positive()
        .precision(2)
        .strict()
        .min(1)
        .required()
        .messages({
          "string.empty": validationMessages("usageLimit").empty,
          "any.only": validationMessages("usageLimit").only,
          "number.base": validationMessages("usageLimit").number,
          "any.required": validationMessages("usageLimit").required,
          "number.min": validationMessages("usageLimit").min,
          "number.positive": validationMessages("usageLimit").positive,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "usageLimit is not allowed if hasUsageLimit is false",
      }),
    }),
    discountType: joi
      .string()
      .valid("flat", "percent")
      .optional()
      .messages({
        "any.required": validationMessages("discountType").required,
        "string.empty": validationMessages("discountType").empty,
        "any.only": validationMessages("discountType").only,
        "string.base": validationMessages("discountType").string,
        "any.valid": "discountType should be either flat or percent",
      }),
    value: joi
      .number()
      .strict()
      .required()
      .messages({
        "string.empty": validationMessages("value").empty,
        "any.only": validationMessages("value").only,
        "number.base": validationMessages("value").number,
        "any.required": validationMessages("value").required,
        "number.positive": validationMessages("value").positive,
      }),
    quantity: joi
      .number()
      .positive()
      .min(0)
      .optional()
      .messages({
        "string.empty": validationMessages("quantity").empty,
        "any.only": validationMessages("quantity").only,
        "number.min": validationMessages("quantity").min,
        "number.positive": validationMessages("quantity").positive,
      }),
    startDate: joi.when("hasExpiration", {
      is: true,
      then: joi
        .date()
        .custom(rejectPastDate)
        .format("YYYY-MM-DD")
        .required()
        .messages({
          "any.required": validationMessages("startDate").required,
          "string.pattern.base":
            "Provide a valid startDate in YYYY-MM-DD format",
          "string.empty": validationMessages("startDate").empty,
          "any.only": validationMessages("startDate").only,
          "string.base": validationMessages("startDate").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown":
          "startDate is never allowed if hasExpiration is false or undefined",
      }),
    }),
    endDate: joi.when("startDate", {
      is: joi.exist(),
      then: joi
        .date()
        .custom(dateChecker)
        .format("YYYY-MM-DD")
        .required()
        .messages({
          "any.required": validationMessages("endDate").required,
          "string.pattern.base":
            "Provide a valid matchDate in YYYY-MM-DD format",
          "string.empty": validationMessages("endDate").empty,
          "any.only": validationMessages("endDate").only,
          "string.base": validationMessages("endDate").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "endDate is not allowed if there is no startDate",
      }),
    }),
  })
  .options({ stripUnknown: true });

export const updateDiscountSchema = joi
  .object({
    targets: joi
      .array()
      .items(
        joi.object({
          targetId: joi.string().custom(validateObjectId).required(),
          targetType: joi
            .string()
            .valid("event", "ticket")
            .required()
            .messages({
              "any.required": validationMessages("targetType").required,
              "string.empty": validationMessages("targetType").empty,
              "any.only": validationMessages("targetType").only,
              "string.base": validationMessages("targetType").string,
            }),
        }),
      )
      .required()
      .messages({
        "any.required": validationMessages("targets").required,
        "any.only": validationMessages("targets").only,
      }),
    code: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("code").empty,
        "any.only": validationMessages("code").only,
      }),
    hasExpiration: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasExpiration").empty,
        "any.only": validationMessages("hasExpiration").only,
        "any.required": validationMessages("hasExpiration").required,
        "boolean.base": validationMessages("hasExpiration").boolean,
      }),
    hasMaxCap: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasMaxCap").empty,
        "any.only": validationMessages("hasMaxCap").only,
        "any.required": validationMessages("hasMaxCap").required,
        "boolean.base": validationMessages("hasMaxCap").boolean,
      }),
    maxCap: joi.when("hasMaxCap", {
      is: true,
      then: joi
        .number()
        .positive()
        .precision(2)
        .strict()
        .min(10)
        .messages({
          "string.empty": validationMessages("maxCap").empty,
          "any.only": validationMessages("maxCap").only,
          "number.base": validationMessages("maxCap").number,
          "any.required": validationMessages("maxCap").required,
          "number.min": validationMessages("maxCap").min,
          "number.positive": validationMessages("maxCap").positive,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "maxCap is never allowed if hasMaxCap is false",
      }),
    }),
    hasUsageLimit: joi
      .boolean()
      .optional()
      .messages({
        "string.empty": validationMessages("hasUsageLimit").empty,
        "any.only": validationMessages("hasUsageLimit").only,
        "any.required": validationMessages("hasUsageLimit").required,
        "boolean.base": validationMessages("hasUsageLimit").boolean,
      }),
    usageLimit: joi.number().when("hasUsageLimit", {
      is: true,
      then: joi
        .number()
        .positive()
        .precision(2)
        .strict()
        .min(1)
        .required()
        .messages({
          "string.empty": validationMessages("usageLimit").empty,
          "any.only": validationMessages("usageLimit").only,
          "number.base": validationMessages("usageLimit").number,
          "any.required": validationMessages("usageLimit").required,
          "number.min": validationMessages("usageLimit").min,
          "number.positive": validationMessages("usageLimit").positive,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "usageLimit is not allowed if hasUsageLimit is false",
      }),
    }),
    discountType: joi
      .string()
      .valid("flat", "percent")
      .optional()
      .messages({
        "any.required": validationMessages("discountType").required,
        "string.empty": validationMessages("discountType").empty,
        "any.only": validationMessages("discountType").only,
        "string.base": validationMessages("discountType").string,
        "any.valid": "discountType should be either flat or percent",
      }),
    value: joi
      .number()
      .strict()
      .required()
      .messages({
        "string.empty": validationMessages("value").empty,
        "any.only": validationMessages("value").only,
        "number.base": validationMessages("value").number,
        "any.required": validationMessages("value").required,
        "number.positive": validationMessages("value").positive,
      }),
    quantity: joi
      .number()
      .positive()
      .min(0)
      .optional()
      .messages({
        "string.empty": validationMessages("quantity").empty,
        "any.only": validationMessages("quantity").only,
        "number.min": validationMessages("quantity").min,
        "number.positive": validationMessages("quantity").positive,
      }),
    startDate: joi.when("hasExpiration", {
      is: true,
      then: joi
        .date()
        .custom(rejectPastDate)
        .format("YYYY-MM-DD")
        .required()
        .messages({
          "any.required": validationMessages("startDate").required,
          "string.pattern.base":
            "Provide a valid startDate in YYYY-MM-DD format",
          "string.empty": validationMessages("startDate").empty,
          "any.only": validationMessages("startDate").only,
          "string.base": validationMessages("startDate").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown":
          "startDate is never allowed if hasExpiration is false or undefined",
      }),
    }),
    endDate: joi.when("startDate", {
      is: joi.exist(),
      then: joi
        .date()
        .custom(dateChecker)
        .format("YYYY-MM-DD")
        .required()
        .messages({
          "any.required": validationMessages("endDate").required,
          "string.pattern.base":
            "Provide a valid matchDate in YYYY-MM-DD format",
          "string.empty": validationMessages("endDate").empty,
          "any.only": validationMessages("endDate").only,
          "string.base": validationMessages("endDate").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "endDate is not allowed if there is no startDate",
      }),
    }),
  })
  .options({ stripUnknown: true });

export const userListSchema = joi
  .object({
    q: joi
      .string()
      .optional()
      .messages({
        "string.base": validationMessages("q").string,
      }),
    page: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("page").number,
        "number.empty": validationMessages("page").empty,
      }),

    limit: joi.number().messages({
      "number.base": "limit should be of type number",
      "number.empty": "limit cannot be an empty param",
      "any.required": validationMessages("limit").required,
    }),
    from: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("from").required,
        "string.pattern.base": "Provide a valid from in YYYY-MM-DD format",
        "string.empty": validationMessages("from").empty,
        "any.only": validationMessages("from").only,
        "string.base": validationMessages("from").string,
      }),
    to: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("to").required,
        "string.pattern.base": "Provide a valid to in YYYY-MM-DD format",
        "string.empty": validationMessages("to").empty,
        "any.only": validationMessages("to").only,
        "string.base": validationMessages("to").string,
      }),
    status: joi
      .string()
      .valid("active", "inactive")
      .optional()
      .messages({
        "any.required": validationMessages("status").required,
        "string.empty": validationMessages("status").empty,
        "any.only": validationMessages("status").only,
        "string.base": validationMessages("status").string,
      }),

    userType: joi
      .string()
      .valid("vendor", "vendoruser", "admin", "adminuser")
      .optional()
      .messages({
        "any.required": validationMessages("userType").required,
        "string.empty": validationMessages("userType").empty,
        "any.only": validationMessages("userType").only,
        "string.base": validationMessages("userType").string,
      }),
  })
  .options({ stripUnknown: true });

export const addPermissionSchema = joi
  .object({
    resource: joi
      .string()
      .valid("events", "tickets", "discounts", "attendees", "users")
      .required()
      .messages({
        "string.empty": validationMessages("resource").empty,
        "any.only": validationMessages("resource").only,
      }),
    title: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    description: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
  })
  .options({ stripUnknown: true });

export const addRoleSchema = joi
  .object({
    permissions: joi
      .array()
      .items(joi.string())
      .required()
      .messages({
        "string.empty": validationMessages("resource").empty,
        "any.only": validationMessages("resource").only,
      }),
    title: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    description: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    organisationId: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("organisationId").empty,
        "any.only": validationMessages("organisationId").only,
      }),
  })
  .options({ stripUnknown: true });

export const analyticsQuerySchema = joi
  .object({
    q: joi
      .string()
      .optional()
      .messages({
        "string.base": validationMessages("q").string,
      }),
    page: joi
      .number()
      .optional()
      .messages({
        "number.base": validationMessages("page").number,
        "number.empty": validationMessages("page").empty,
      }),

    limit: joi.number().messages({
      "number.base": "limit should be of type number",
      "number.empty": "limit cannot be an empty param",
      "any.required": validationMessages("limit").required,
    }),
    from: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("from").required,
        "string.pattern.base": "Provide a valid from in YYYY-MM-DD format",
        "string.empty": validationMessages("from").empty,
        "any.only": validationMessages("from").only,
        "string.base": validationMessages("from").string,
      }),
    to: joi
      .date()
      .format("YYYY-MM-DD")
      .optional()
      .messages({
        "any.required": validationMessages("to").required,
        "string.pattern.base": "Provide a valid to in YYYY-MM-DD format",
        "string.empty": validationMessages("to").empty,
        "any.only": validationMessages("to").only,
        "string.base": validationMessages("to").string,
      }),
    status: joi
      .string()
      .valid("active", "inactive")
      .optional()
      .messages({
        "any.required": validationMessages("status").required,
        "string.empty": validationMessages("status").empty,
        "any.only": validationMessages("status").only,
        "string.base": validationMessages("status").string,
      }),

    userType: joi
      .string()
      .valid("vendor", "vendorUser", "admin", "adminUser")
      .optional()
      .messages({
        "any.required": validationMessages("userType").required,
        "string.empty": validationMessages("userType").empty,
        "any.only": validationMessages("userType").only,
        "string.base": validationMessages("userType").string,
      }),
    presentation: joi
      .string()
      .valid("weekly", "monthly", "yearly")
      .optional()
      .messages({
        "any.required": validationMessages("presentation").required,
        "string.empty": validationMessages("presentation").empty,
        "any.only": validationMessages("presentation").only,
        "string.base": validationMessages("presentation").string,
      }),
  })
  .options({ stripUnknown: true });

export const updateEventSchema = joi
  .object({
    description: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    title: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    eventType: joi
      .string()
      .valid("free", "paid")
      .optional()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    venue: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("venue").empty,
        "any.only": validationMessages("venue").only,
      }),
    coordinates: joi
      .array()
      .items(joi.number().strict().required())
      .length(2)
      .optional()
      .messages({
        "string.empty": validationMessages("coordinates").empty,
        "any.only": validationMessages("coordinates").only,
        "array.base": validationMessages("coordinates").base,
        "array.length": validationMessages("coordinates").length,
        "number.base": validationMessages("coordinates").numberBase,
      }),
    ownerId: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("ownerId").empty,
        "any.only": validationMessages("ownerId").only,
      }),
    cost: joi
      .number()
      .positive()
      .precision(2)
      .strict()
      .min(500)
      .optional()
      .messages({
        "string.empty": validationMessages("cost").empty,
        "any.only": validationMessages("cost").only,
        "number.base": validationMessages("cost").number,
        "any.required": validationMessages("cost").required,
        "number.min": validationMessages("cost").min,
        "number.positive": validationMessages("cost").positive,
      }),
    availableSlots: joi
      .number()
      .optional()
      .messages({
        "string.empty": validationMessages("availableSlots").empty,
        "any.only": validationMessages("availableSlots").only,
      }),
    startDate: joi
      .date()
      .custom(rejectPastDate)
      .format("YYYY-MM-DD HH:mm")
      .optional()
      .messages({
        "any.required": validationMessages("startDate").required,
        "string.pattern.base":
          "Provide a valid startDate in YYYY-MM-DD HH:mm format",
        "string.empty": validationMessages("startDate").empty,
        "any.only": validationMessages("startDate").only,
        "string.base": validationMessages("startDate").string,
      }),
    endDate: joi.when("startDate", {
      is: joi.exist(),
      then: joi
        .date()
        .custom(dateChecker)
        .format("YYYY-MM-DD HH:mm")
        .required()
        .messages({
          "any.required": validationMessages("endDate").required,
          "string.pattern.base":
            "Provide a valid matchDate in YYYY-MM-DD HH:mm format",
          "string.empty": validationMessages("endDate").empty,
          "any.only": validationMessages("endDate").only,
          "string.base": validationMessages("endDate").string,
        }),
      otherwise: joi.forbidden().messages({
        "any.unknown": "endDate is not allowed if startDate is not provided",
      }),
    }),
    tickets: joi
      .array()
      .items(
        joi.object({
          ticketId: joi.string().custom(validateObjectId).optional(),
          description: joi.when("ticketId", {
            is: null,
            then: joi
              .string()
              .required()
              .messages({
                "string.empty": validationMessages("description").empty,
                "any.only": validationMessages("description").only,
              }),
            otherwise: joi
              .string()
              .optional()
              .messages({
                "string.empty": validationMessages("description").empty,
                "any.only": validationMessages("description").only,
              }),
          }),
          title: joi.when("ticketId", {
            is: null,
            then: joi
              .string()
              .required()
              .messages({
                "string.empty": validationMessages("title").empty,
                "any.only": validationMessages("title").only,
              }),
            otherwise: joi
              .string()
              .optional()
              .messages({
                "string.empty": validationMessages("title").empty,
                "any.only": validationMessages("title").only,
              }),
          }),
          price: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .min(500)
              .required()
              .messages({
                "string.empty": validationMessages("price").empty,
                "any.only": validationMessages("price").only,
                "number.base": validationMessages("price").number,
                "any.required": validationMessages("price").required,
                "number.min": validationMessages("price").min,
                "number.positive": validationMessages("price").positive,
              }),
            otherwise: joi
              .number()
              .min(500)
              .optional()
              .messages({
                "string.empty": validationMessages("price").empty,
                "any.only": validationMessages("price").only,
                "number.base": validationMessages("price").number,
                "any.required": validationMessages("price").required,
                "number.min": validationMessages("price").min,
                "number.positive": validationMessages("price").positive,
              }),
          }),
          quantity: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .required()
              .messages({
                "string.empty": validationMessages("quantity").empty,
                "any.only": validationMessages("quantity").only,
              }),
            otherwise: joi
              .number()
              .optional()
              .messages({
                "string.empty": validationMessages("quantity").empty,
                "any.only": validationMessages("quantity").only,
              }),
          }),
          isAvailable: joi
            .boolean()
            .valid(true, false)
            .optional()
            .messages({
              "string.empty": validationMessages("isAvailable").empty,
              "any.only": validationMessages("isAvailable").only,
            }),
          orderLimit: joi.when("ticketId", {
            is: null,
            then: joi
              .number()
              .positive()
              .min(0)
              .required()
              .messages({
                "string.empty": validationMessages("orderLimit").empty,
                "any.only": validationMessages("orderLimit").only,
                "number.min": validationMessages("orderLimit").min,
                "number.positive": validationMessages("orderLimit").positive,
              }),
            otherwise: joi
              .number()
              .positive()
              .min(0)
              .optional()
              .messages({
                "string.empty": validationMessages("orderLimit").empty,
                "any.only": validationMessages("orderLimit").only,
                "number.min": validationMessages("orderLimit").min,
                "number.positive": validationMessages("orderLimit").positive,
              }),
          }),
        }),
      )
      .optional()
      .messages({
        "any.required": validationMessages("tickets").required,
        "any.only": validationMessages("tickets").only,
      }),
  })
  .options({ stripUnknown: true });

export const updateTicketSchema = joi
  .object({
    description: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    title: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    price: joi
      .number()
      .min(500)
      .optional()
      .messages({
        "string.empty": validationMessages("price").empty,
        "any.only": validationMessages("price").only,
        "number.base": validationMessages("price").number,
        "any.required": validationMessages("price").required,
        "number.min": validationMessages("price").min,
        "number.positive": validationMessages("price").positive,
      }),
    quantity: joi
      .number()
      .optional()
      .messages({
        "string.empty": validationMessages("quantity").empty,
        "any.only": validationMessages("quantity").only,
      }),
    orderLimit: joi
      .number()
      .optional()
      .min(0)
      .optional()
      .messages({
        "string.empty": validationMessages("orderLimit").empty,
        "any.only": validationMessages("orderLimit").only,
        "number.min": validationMessages("orderLimit").min,
        "number.positive": validationMessages("orderLimit").positive,
      }),
  })
  .options({ stripUnknown: true });

export const removeEventImageSchema = joi
  .object({
    images: joi
      .array()
      .items(joi.string().required())
      .messages({
        "string.empty": validationMessages("images").empty,
        "any.only": validationMessages("images").only,
      }),
  })
  .options({ stripUnknown: true });
export const updateRoleSchema = joi
  .object({
    permissions: joi
      .array()
      .items(joi.string())
      .optional()
      .messages({
        "string.empty": validationMessages("resource").empty,
        "any.only": validationMessages("resource").only,
      }),
    title: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("title").empty,
        "any.only": validationMessages("title").only,
      }),
    description: joi
      .string()
      .optional()
      .messages({
        "string.empty": validationMessages("description").empty,
        "any.only": validationMessages("description").only,
      }),
    organisationId: joi
      .string()
      .optional()
      .custom(validateObjectId)
      .messages({
        "string.empty": validationMessages("organisationId").empty,
        "any.only": validationMessages("organisationId").only,
      }),
  })
  .options({ stripUnknown: true });
