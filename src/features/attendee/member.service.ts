// import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
// import { Attendee } from '@/datasources/mongodb/schemas/attendee.schema';
// import { Injectable } from '@nestjs/common';
// import { UserService } from '../user/user.service';
// import { IPagination, JwtUnion } from '@/shared/interface/interface';
// import { User } from '@/datasources/mongodb/schemas/user.schema';
// import { AddUserDTO } from '../user/user.dto';
// import { responseHash } from '@/constants';
// import HTTPQueryParser from '@/shared/utils/http-query-parser';
// import { Request } from 'express';
// import { ResponseExtraData } from '@/shared/utils/http-response-extra-data';
// import { Types, _FilterQuery } from 'mongoose';

// @Injectable()
// export class MemberService {
//   constructor(
//     private readonly mongoService: MongoDataServices,
//     private readonly userService: UserService,
//   ) {}
//   async addMember(member: Partial<Member>) {
//     try {
//       return await this.mongoService.members.create(member);
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async onboardMember(payload: AddUserDTO, manager: JwtUnion) {
//     try {
//       if (!manager.communtityManaged) {
//         return Promise.reject(responseHash.forbiddenAction);
//       }
//       const { email } = payload;
//       await this.userService.checkUserUniqueness([{ email }], true);
//       const user = await this.userService.addUser(payload); //Create the member as a new user
//       await this.addMember({
//         // Add the user to the community
//         userId: user._id,
//         communityId: new Types.ObjectId(manager.communtityManaged),
//       });
//       return {
//         message: 'Member added successfully',
//       };
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async listCommunityMembers(req: Request, user: User) {
//     try {
//       const { skip, docLimit } = HTTPQueryParser(req.query);
//       const query: Record<string, any> = {
//         communityId: user.currentCommunityManaged,
//       };

//       const members = await this.aggregateMembers(query, skip, docLimit);
//       const membersCount = await this.mongoService.members.count(query);
//       const extraData: IPagination = ResponseExtraData(
//         req,
//         members.length,
//         membersCount,
//       );

//       return {
//         status: 'success',
//         data: members,
//         extraData: extraData,
//       };
//     } catch (e) {
//       return Promise.reject(e);
//     }
//   }

//   async aggregateMembers(query: any, skip: number = 0, limit: number = 1000) {
//     try {
//       const result = await this.mongoService.members.aggregateRecords([
//         {
//           $match: query,
//         },
//         {
//           $lookup: {
//             from: 'users',
//             let: {
//               userId: '$userId',
//             },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ['$_id', '$$userId'],
//                   },
//                 },
//               },
//               {
//                 $project: {
//                   firstName: 1,
//                   lastName: 1,
//                   nickName: 1,
//                   currentUserType: 1,
//                   profileImageUrl: {
//                     $cond: [
//                       {
//                         $gt: ['$profileImageUrl', null],
//                       },
//                       '$profileImageUrl',
//                       '',
//                     ],
//                   },
//                   role: {
//                     $cond: [
//                       {
//                         $gt: ['$designation', null],
//                       },
//                       '$designation',
//                       'utility player',
//                     ],
//                   },
//                   _id: 0,
//                 },
//               },
//             ],
//             as: 'member',
//           },
//         },
//         {
//           $project: {
//             member: {
//               $arrayElemAt: ['$member', 0],
//             },
//             createdAt: 1,
//             dateJoined: 1,
//             status: 1,
//             membershipId: '$_id',
//             userId: 1,
//             _id: 0,
//           },
//         },
//         {
//           $skip: skip,
//         },
//         {
//           $limit: limit,
//         },
//         {
//           $sort: {
//             createdAt: -1,
//           },
//         },
//       ]);
//       return result;
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async getMember(query: _FilterQuery<Member>) {
//     try {
//       return await this.mongoService.members.getOneWithAllFields(query);
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async rejectNonMember(query: _FilterQuery<Member>): Promise<Member> {
//     try {
//       const member = await this.getMember(query);
//       if (!member) {
//         return Promise.reject({
//           ...responseHash.notFound,
//           message: `not a community member`,
//         });
//       }
//       return member;
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async rejectExistingMember(query: _FilterQuery<Member>): Promise<Member> {
//     try {
//       const member = await this.getMember(query);
//       if (member) {
//         return Promise.reject({
//           ...responseHash.forbiddenAction,
//           message: `you are already a member of this community`,
//         });
//       }
//       return member;
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }
// }
