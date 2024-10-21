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
		token.totalRaisedInBone = 0
		token.totalRaisedInBoneBig = '0'

		let virtualY = BigInt(0)
		const virtualX =
			(eventData.args.totalSupply * BigInt(11000)) / BigInt(10000)

		if (eventData.args.curveSize === 0) {
			virtualY = BigInt(700000000) * BigInt(10) ** BigInt(12)
		} else {
			virtualY = BigInt(3000000000) * BigInt(10) ** BigInt(12)
		}
		token.virtualY = virtualY.toString()
		token.virtualX = virtualX.toString()
		const tokenPrice = virtualY / virtualX
		const marketCap =
			(tokenPrice * eventData.args.totalSupply) / BigInt(10 ** 18)

		token.tokenPriceInBoneBig = tokenPrice.toString()
		token.tokenPriceInBone = Number(Number(tokenPrice).toFixed(2))
		token.marketCapInBoneBig = marketCap.toString()
		token.marketCapInBone = Number(Number(marketCap).toFixed(2))

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

	private async handleBuySharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Buy' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
		})

		if (token) {
			token.totalRaisedInBoneBig = (
				BigInt(token.totalRaisedInBoneBig) + BigInt(eventData.args.ethAmountIn)
			).toString()
			token.totalRaisedInBone = Number(
				Number(BigInt(token.totalRaisedInBoneBig) / BigInt(10 ** 12)).toFixed(
					2,
				),
			)
			const newVirtualY =
				BigInt(token.virtualY) + BigInt(eventData.args.ethAmountIn)
			const newVirtualX =
				BigInt(token.virtualX) - BigInt(eventData.args.tokenAmountOut)
			token.virtualY = newVirtualY.toString()
			token.virtualX = newVirtualX.toString()

			const newTokenPrice = newVirtualY / newVirtualX
			token.tokenPriceInBoneBig = newTokenPrice.toString()
			token.tokenPriceInBone = Number(Number(newTokenPrice).toFixed(2))

			const newMarketCap =
				(newTokenPrice * BigInt(token.tokenSupply)) / BigInt(10 ** 18)
			token.marketCapInBoneBig = newMarketCap.toString()
			token.marketCapInBone = Number(Number(newMarketCap).toFixed(2))

			await token.save()
		}
	}

	private async handleSellSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Sell' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
		})

		if (token) {
			token.totalRaisedInBoneBig = (
				BigInt(token.totalRaisedInBoneBig) - BigInt(eventData.args.ethAmountOut)
			).toString()
			token.totalRaisedInBone = Number(
				Number(BigInt(token.totalRaisedInBoneBig) / BigInt(10 ** 12)).toFixed(
					2,
				),
			)
			const newVirtualY =
				BigInt(token.virtualY) - BigInt(eventData.args.ethAmountOut)
			const newVirtualX =
				BigInt(token.virtualX) + BigInt(eventData.args.tokenAmountIn)
			token.virtualY = newVirtualY.toString()
			token.virtualX = newVirtualX.toString()

			const newTokenPrice = newVirtualY / newVirtualX
			token.tokenPriceInBoneBig = newTokenPrice.toString()
			token.tokenPriceInBone = Number(Number(newTokenPrice).toFixed(2))

			const newMarketCap =
				(newTokenPrice * BigInt(token.tokenSupply)) / BigInt(10 ** 18)
			token.marketCapInBoneBig = newMarketCap.toString()
			token.marketCapInBone = Number(Number(newMarketCap).toFixed(2))

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
