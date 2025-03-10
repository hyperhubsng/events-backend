import { SetMetadata } from "@nestjs/common";
import { PUBLIC_ROUTE } from "@/constants";
export const PUBLIC = () => SetMetadata(PUBLIC_ROUTE, true);
