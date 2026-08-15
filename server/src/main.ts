import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Authorization',
    }),
  );

  // Global prefix — all routes are under /api
  app.setGlobalPrefix('api');

  // Swagger OpenAPI Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('BlogNest API')
    .setDescription('RESTful API documentation for BlogNest publishing platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Server is running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger API Docs available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap();
