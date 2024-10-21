import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import { Token, TokenDocument } from 'src/tokens/schemas/token.schema'
import { UserDocument } from 'src/users/schemas/user.schemas'
import { UsersService } from 'src/users/users.service'
import { EventTypeFromAbi, LogsType, parseLog } from 'src/utils/parse-logs'
import { sharbiFunAbi } from 'src/utils/sharbi-fun.abi'
import { getAddress, isAddress, isAddressEqual } from 'viem'
import { EventLogs, EventLogsDocument } from './schema/event-logs.schema'

type SharbiFunEventType = EventTypeFromAbi<typeof sharbiFunAbi>
@Injectable()
export class EventProcessorService {
	private isProcessing = false
	constructor(
		@InjectModel(EventLogs.name)
		private eventLogsModel: Model<EventLogsDocument>,
		@InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
		private usersService: UsersService,
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
					await this.handleSharbiFunEvent(event, sharbiFunEvent)
				}
			}

			// await this.eventLogsModel.findByIdAndUpdate(event._id, {
			// 	processed: true,
			// 	syncedAt: new Date(),
			// })
		}
	}

	private async handleSharbiFunEvent(
		event: EventLogsDocument,
		eventData: SharbiFunEventType,
	) {
		if (this[`handle${eventData.eventName}SharbiFunEvent`]) {
			await this[`handle${eventData.eventName}SharbiFunEvent`](event, eventData)
		} else {
			console.log(`Unhandled event type: ${eventData.eventName}`)
		}
	}

	private async handleLaunchSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Launch' }>,
	) {
		const creator = await this.createUserIfNotExists(
			getAddress(eventData.args.launcher),
		)

		let token = await this.tokenModel.findOne({
			transactionHash: event.transactionHash,
			creator: creator._id,
			launched: false,
		})

		if (!token) {
			token = new this.tokenModel({
				transactionHash: event.transactionHash,
				creator: creator._id,
			})
		}
		token.launched = true
		token.address = getAddress(eventData.args.tokenAddress)
		token.name = eventData.args.name
		token.ticker = eventData.args.symbol
		token.tokenSupply = eventData.args.totalSupply.toString()
		token.bondingCurve = eventData.args.curveSize === 0 ? 'beginner' : 'pro'
		token.donate = 'no'

		await token.save()
	}

	private async handleDonationSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Donation' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
		})

		if (token) {
			token.donate = 'yes'
			await token.save()
		}
	}

	@Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
	async cleanupSyncedEvents() {
		const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

		await this.eventLogsModel.deleteMany({
			syncedAt: { $lt: oneMonthAgo },
			processed: true,
		})
	}

	async createUserIfNotExists(address: string) {
		let user = await this.usersService.findByAddress(address)
		if (!user) {
			user = await this.usersService.create({ address })
		}
		return user
	}
}
