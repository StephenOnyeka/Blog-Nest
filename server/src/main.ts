import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from "cors";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // CORS configuration
  app.use(cors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true,
    // methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // allowedHeaders: 'Content-Type, Authorization',
  }));
  
  // Add global prefix if desired (e.g., /api)
  // app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Server is running on: ${await app.getUrl()}`);
}
bootstrap();
