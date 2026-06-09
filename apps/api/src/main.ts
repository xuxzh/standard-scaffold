import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { HttpExceptionFilter } from "@/common/http/http-exception.filter";
import { HttpResponseInterceptor } from "@/common/http/http-response.interceptor";
import { createValidationPipe } from "@/common/http/validation";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new HttpResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Standard Scaffold API")
      .setDescription("Self-hosted API contracts for the web workspace.")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(Number(process.env.PORT ?? 3000), "127.0.0.1");
}

void bootstrap();
