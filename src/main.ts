import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import * as useragent from "express-useragent";
import * as compression from "compression";
import { NotFoundFilter } from "./not-found.filter";
import { appConfig } from "./config";

(async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(helmet());
  app.use(useragent.express());
  app.use(compression());
  app.useGlobalFilters(new NotFoundFilter());
  await app.listen(3002);
})();
