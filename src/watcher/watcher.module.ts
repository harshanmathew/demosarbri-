import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { EventProcessorService } from './event-processor.service'
import { EventWatcherService } from './event-watcher.service'
import { RpcRequestProcessor } from './rpc-queue.processor'
import { EventLogs, EventLogsSchema } from './schema/event-logs.schema'
import { SyncDetails, SyncDetailsSchema } from './schema/sync-details.schema'

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'rpc-requests',
			defaultJobOptions: {
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 1000,
				},
				removeOnComplete: true,
				removeOnFail: false,
			},
		}),
		MongooseModule.forFeature([
			{ name: SyncDetails.name, schema: SyncDetailsSchema },
			{ name: EventLogs.name, schema: EventLogsSchema },
		]),
	],
	providers: [RpcRequestProcessor, EventWatcherService, EventProcessorService],
	controllers: [],
})
export class WatcherModule {}
