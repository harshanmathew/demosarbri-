import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { UploadsController } from './uploads.controller'

@Module({
	imports: [HttpModule],
	controllers: [UploadsController],
})
export class UploadsModule {}
