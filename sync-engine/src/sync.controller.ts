import { Controller, Get, Post, Body } from '@nestjs/common';
import { SyncService, SyncPayloadDto } from './sync.service';

@Controller('api')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  getStatus() {
    return {
      status: 'online',
      service: 'sync-engine',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('sync/import')
  async importSyncPayload(@Body() payload: SyncPayloadDto): Promise<SyncPayloadDto> {
    return this.syncService.importSyncData(payload);
  }

  @Get('sync/export')
  async exportSyncPayload(): Promise<SyncPayloadDto> {
    return this.syncService.exportSyncData();
  }
}
