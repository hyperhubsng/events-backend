import { validationMessages } from "../utils/validation-messages";
import * as Joi from "joi";
import * as joiDate from "@joi/date";
import { rejectPastDate } from "../utils/reject-past-date";
import { validateObjectId } from "../utils/objectid-joi-validator";
import { dateChecker } from "../utils/date-checker";
import { ObjectIdValidationPipe } from "../pipes/object-id-pipe";
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
      .required()
      .messages({
        "any.required": validationMessages("endDate").required,
        "string.pattern.base":
          "Provide a valid matchDate in YYYY-MM-DD HH:mm format",
        "string.empty": validationMessages("endDate").empty,
        "any.only": validationMessages("endDate").only,
        "string.base": validationMessages("endDate").string,
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
      .valid("vendor")
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
        "upcoming"
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
        })
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
        })
      )
      .optional()
      .messages({
        "any.required": validationMessages("charg").required,
        "any.only": validationMessages("charg").only,
      }),
  })
  .options({ stripUnknown: true });
