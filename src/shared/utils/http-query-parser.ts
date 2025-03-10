/**
 * @description parses the params that are part of the search query
 * @param {Object} obj query params
 * @return {Object}
 */

import { IHttpQueryParser } from "../interface/interface";

const HTTPQueryParser = (obj: Record<string, any>): IHttpQueryParser => {
  const { page, select, limit, from, to, populate, status, sort } = obj;
  const pageNumber = Math.abs(parseInt(page)) || 1;
  const docLimit = parseInt(limit) || 25;
  const skip = docLimit * (pageNumber - 1);
  let filters: string[] = [];
  let populateFields: string[] = [];
  const dbQueryParam: Record<string, any> = {};

  if (select) {
    filters = select.replace(" ", "").split(",");
  }

  if (populate) {
    populateFields = populate.replace(" ", ",").split(",");
  }

  if (from) {
    const fromDate = new Date(from as string);
    const toDate = to ? new Date(to as string) : fromDate;

    dbQueryParam.createdAt = {
      $gte: fromDate,
      $lte: toDate,
    };
  }

  if (status) {
    dbQueryParam.status = status;
  }

  return {
    skip: skip,
    filters,
    populate: populateFields,
    from,
    to,
    page: pageNumber,
    docLimit,
    dbQueryParam,
    sort: sort || "_id",
  };
};

export default HTTPQueryParser;
