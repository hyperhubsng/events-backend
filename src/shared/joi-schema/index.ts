import { validationMessages } from '../utils/validation-messages';
import * as Joi from 'joi';
import * as joiDate from '@joi/date';
import { rejectPastDate } from '../utils/reject-past-date';
import { validateObjectId } from '../utils/objectid-joi-validator';
const joi = Joi.extend(joiDate);

export const addMatchSchema = joi
  .object({
    comment: joi
      .string()
      .optional()
      .messages({
        'string.empty': validationMessages('comment').empty,
        'any.only': validationMessages('comment').only,
      }),
    status: joi
      .string()
      .optional()
      .messages({
        'string.empty': validationMessages('status').empty,
        'any.only': validationMessages('status').only,
      }),
    isPaid: joi
      .boolean()
      .optional()
      .messages({
        'string.empty': validationMessages('isPaid').empty,
        'any.only': validationMessages('isPaid').only,
        'any.required': validationMessages('isPaid').required,
        'boolean.base': validationMessages('isPaid').boolean,
      }),
    amount: joi
      .number()
      .when('isPaid', {
        is: true,
        then: joi.number().positive().precision(2).strict().min(1000),
        otherwise: joi.number().min(0),
      })
      .required()
      .messages({
        'string.empty': validationMessages('amount').empty,
        'any.only': validationMessages('amount').only,
        'number.base': validationMessages('amount').number,
        'any.required': validationMessages('amount').required,
        'number.min': validationMessages('amount').min,
        'number.positive': validationMessages('amount').positive,
      }),
    slot: joi
      .number()
      .required()
      .messages({
        'string.empty': validationMessages('slot').empty,
        'any.only': validationMessages('slot').only,
      }),
    matchDate: joi
      .date()
      .custom(rejectPastDate)
      .format('YYYY-MM-DD HH:mm')
      .required()
      .messages({
        'any.required': validationMessages('matchDate').required,
        'string.pattern.base':
          'Provide a valid matchDate in YYYY-MM-DD HH:mm format',
        'string.empty': validationMessages('matchDate').empty,
        'any.only': validationMessages('matchDate').only,
        'string.base': validationMessages('matchDate').string,
      }),
  })
  .options({ stripUnknown: true });

export const addStatsCategorySchema = joi
  .object({
    comment: joi
      .string()
      .optional()
      .messages({
        'string.empty': validationMessages('comment').empty,
        'any.only': validationMessages('comment').only,
      }),
    title: joi
      .string()
      .required()
      .messages({
        'string.empty': validationMessages('title').empty,
        'any.only': validationMessages('title').only,
        'any.required': validationMessages('title').required,
      }),
    value: joi
      .number()
      .required()
      .messages({
        'string.empty': validationMessages('value').empty,
        'any.only': validationMessages('value').only,
        'number.base': validationMessages('value').number,
        'any.required': validationMessages('value').required,
        'number.min': validationMessages('value').min,
        'number.positive': validationMessages('value').positive,
      }),
  })
  .options({ stripUnknown: true });

export const addStatsSchema = joi
  .object({
    memberId: joi
      .string()
      .required()
      .custom(validateObjectId)
      .messages({
        'string.empty': validationMessages('memberId').empty,
        'any.only': validationMessages('memberId').only,
        objectId: 'User ID must be a valid MongoDB ObjectId',
      }),
    matchId: joi
      .string()
      .required()
      .custom(validateObjectId)
      .messages({
        'string.empty': validationMessages('matchId').empty,
        'any.only': validationMessages('matchId').only,
      }),
    statsCategoryId: joi
      .string()
      .required()
      .custom(validateObjectId)
      .messages({
        'string.empty': validationMessages('statsCategoryId').empty,
        'any.only': validationMessages('statsCategoryId').only,
      }),
    points: joi
      .number()
      .required()
      .min(0)
      .messages({
        'string.empty': validationMessages('points').empty,
        'any.only': validationMessages('points').only,
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
        'string.empty': validationMessages('email').empty,
        'any.required': validationMessages('email').required,
        'any.only': validationMessages('email').only,
      }),
    password: joi
      .string()
      .min(8)
      .required()
      .messages({
        'string.empty': validationMessages('password').empty,
        'any.required': validationMessages('password').required,
        'any.only': validationMessages('password').only,
        'string.length': validationMessages('password').length,
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .min(8)
      .optional()
      .messages({
        'any.required': validationMessages('confirmPassword').required,
        'any.only': 'Passwords do not match',
        'string.length': validationMessages('conifrmPassword').length,
      }),
    firstName: joi
      .string()
      .required()
      .messages({
        'any.required': validationMessages('firstName').required,
        'string.empty': validationMessages('firstName').empty,
        'any.only': validationMessages('firstName').only,
        'string.base': validationMessages('firstName').string,
      }),
    lastName: joi
      .string()
      .required()
      .messages({
        'any.required': validationMessages('lastName').required,
        'string.empty': validationMessages('lastName').empty,
        'any.only': validationMessages('lastName').only,
        'string.base': validationMessages('lastName').string,
      }),
    companyName: joi
      .string()
      .optional()
      .messages({
        'any.required': validationMessages('companyName').required,
        'string.empty': validationMessages('companyName').empty,
        'any.only': validationMessages('companyName').only,
        'string.base': validationMessages('companyName').string,
      }),
    website: joi
      .string()
      .optional()
      .messages({
        'any.required': validationMessages('website').required,
        'string.empty': validationMessages('website').empty,
        'any.only': validationMessages('website').only,
        'string.base': validationMessages('website').string,
      }),
    phoneNumber: joi
      .string()
      .required()
      .pattern(new RegExp('^(\\+?234|0)?[789][01]\\d{8}$'))
      .messages({
        'string.pattern.base': 'Provide a valid phone number',
        'string.empty': validationMessages('phoneNumber').empty,
        'any.required': validationMessages('phoneNumber').required,
        'any.only': validationMessages('phoneNumber').only,
        'string.base': validationMessages('phoneNumber').string,
      }),
  })
  .options({ stripUnknown: true });


export const verifyAccountSchema = joi.object({
    otp: joi
      .string()
      .required()
      .messages({
        'any.required': validationMessages('otp').required,
        'any.only': validationMessages('otp').only,
        'string.base': validationMessages('otp').string,
      }),
    otpEmail: joi
      .string()
      .email({
        minDomainSegments: 2,
      })
      .required()
      .messages({
        'any.only': validationMessages('otpEmail').only,
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
      'any.only': validationMessages('otpEmail').only,
    }),
});

export const setPasswordSchema = joi
  .object({
    identifier: joi
      .string()
      .optional()
      .messages({
        'string.empty': validationMessages('identifier').empty,
        'any.required': validationMessages('identifier').required,
        'any.only': validationMessages('identifier').only,
      }),
    password: joi
      .string()
      .required()
      .messages({
        'string.empty': validationMessages('password').empty,
        'any.required': validationMessages('password').required,
        'any.only': validationMessages('password').only,
      }),
    confirmPassword: joi
      .string()
      .required()
      .valid(Joi.ref('password'))
      .messages({
        'string.empty': validationMessages('confirmPassword').empty,
        'any.required': validationMessages('confirmPassword').required,
        'any.only': 'Passwords do not match',
      }),
    resetToken: joi
      .string()
      .required()
      .messages({
        'string.empty': validationMessages('resetToken').empty,
        'any.required': validationMessages('resetToken').required,
        'any.only': validationMessages('resetToken').only,
      }),
  })
  .options({ stripUnknown: true });