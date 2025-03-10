import { IPagination } from "../interface/interface";
import HTTPQueryParser from "./http-query-parser";
import { Request } from "express";

export const ResponseExtraData = (
  req: Request,
  documentCount: number,
  totalResult: number,
): IPagination => {
  const { docLimit, skip, page } = HTTPQueryParser(req.query);

  const totalPages = Math.max(Math.ceil(documentCount / docLimit), 1);
  const isLastPage = page >= totalPages;
  const nextPage = isLastPage ? null : page + 1;
  const prevPage = isLastPage ? page - 1 : null;
  return {
    prevPage,
    nextPage,
    perPage: docLimit,
    offset: skip,
    total: totalResult,
    currentPage: page,
    totalPages,
  };
};
