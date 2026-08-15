import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  console.log('🌱 Starting manual database seed script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const seedService = app.get(SeedService);
    await seedService.seed();
    console.log('✅ Manual database seeding complete!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
