import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import {
	TokenHolders,
	TokenHoldersSchema,
} from 'src/tokens/schemas/token-holders.schema'
import {
	TokenTrades,
	TokenTradesSchema,
} from 'src/tokens/schemas/token-trade.schema'
import { Token, TokenSchema } from 'src/tokens/schemas/token.schema'
import {
	UserActivity,
	UserActivitySchema,
} from 'src/users/schemas/user-activity.schema'
import { UsersModule } from 'src/users/users.module'
import { WsUpdatesModule } from 'src/ws-updates/ws-updates.module'
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
			{ name: Token.name, schema: TokenSchema },
			{ name: TokenTrades.name, schema: TokenTradesSchema },
			{ name: TokenHolders.name, schema: TokenHoldersSchema },
			{ name: UserActivity.name, schema: UserActivitySchema },
		]),
		UsersModule,
		WsUpdatesModule,
	],
	providers: [RpcRequestProcessor, EventWatcherService, EventProcessorService],
	controllers: [],
})
export class WatcherModule {}
