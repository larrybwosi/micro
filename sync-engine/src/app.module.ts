import { Module } from '@nestjs/common';
import { SyncModule } from './sync.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [SyncModule],
  providers: [PrismaService],
})
export class AppModule {}
