import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { EventTypeFromAbi, LogsType, parseLog } from 'src/utils/parse-logs'
import { sharbiFunAbi } from 'src/utils/sharbi-fun.abi'
import { isAddress, isAddressEqual } from 'viem'
import { EventLogsDocument } from './schema/event-logs.schema'

type SharbiFunEventType = EventTypeFromAbi<typeof sharbiFunAbi>
@Injectable()
export class EventProcessorService {
	private isProcessing = false
	constructor(
		@InjectModel('EventLogs') private eventLogsModel: Model<EventLogsDocument>,
		private readonly configService: ConfigService,
	) {}

	@Cron(CronExpression.EVERY_5_SECONDS)
	async processEvents() {
		if (this.isProcessing) {
			console.log('Already processing events')
			return
		}
		this.isProcessing = true
		try {
			await this.processUnprocessedEvents()
		} catch (error) {
			console.error('Error processing events:', error)
		} finally {
			this.isProcessing = false
		}
	}

	private async processUnprocessedEvents() {
		const unprocessedEvents = await this.eventLogsModel
			.find({ processed: false })
			.sort({ blockNumber: 1, logIndex: 1 })

		for (const event of unprocessedEvents) {
			if (
				isAddressEqual(
					event.address as `0x${string}`,
					this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
				)
			) {
				const sharbiFunEvent = parseLog(
					event as unknown as LogsType,
					sharbiFunAbi,
				)
				if (sharbiFunEvent) {
					await this.handleSharbiFunEvent(sharbiFunEvent)
				}
			}

			// await this.eventLogsModel.findByIdAndUpdate(event._id, {
			// 	processed: true,
			// 	syncedAt: new Date(),
			// })
		}
	}

	private handleSharbiFunEvent(event: SharbiFunEventType) {
		if (this[`handle${event.eventName}SharbiFunEvent`]) {
			this[`handle${event.eventName}SharbiFunEvent`](event)
		} else {
			console.log(`Unhandled event type: ${event.eventName}`)
		}
	}

	private async handleLaunchSharbiFunEvent(
		event: Extract<SharbiFunEventType, { eventName: 'Launch' }>,
	) {
		console.log('Launch event:', event)
	}

	@Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
	async cleanupSyncedEvents() {
		const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

		await this.eventLogsModel.deleteMany({
			syncedAt: { $lt: oneMonthAgo },
			processed: true,
		})
	}
}
