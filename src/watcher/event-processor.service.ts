import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Model } from 'mongoose'
import {
	TokenHolders,
	TokenHoldersDocument,
} from 'src/tokens/schemas/token-holders.schema'
import {
	TokenTrades,
	TokenTradesDocument,
} from 'src/tokens/schemas/token-trade.schema'
import { Token, TokenDocument } from 'src/tokens/schemas/token.schema'
import {
	UserActivity,
	UserActivityDocument,
} from 'src/users/schemas/user-activity.schema'
import { UserDocument } from 'src/users/schemas/user.schemas'
import { UsersService } from 'src/users/users.service'
import { EventTypeFromAbi, LogsType, parseLog } from 'src/utils/parse-logs'
import { sharbiFunAbi } from 'src/utils/sharbi-fun.abi'
import { WsUpdatesGateway } from 'src/ws-updates/ws-updates.gateway'
import {
	http,
	Chain,
	PublicActions,
	WalletActions,
	WalletClient,
	createWalletClient,
	getAddress,
	isAddress,
	isAddressEqual,
	publicActions,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { shibarium, shibariumTestnet } from 'viem/chains'
import { EventLogs, EventLogsDocument } from './schema/event-logs.schema'

type SharbiFunEventType = EventTypeFromAbi<typeof sharbiFunAbi>

@Injectable()
export class EventProcessorService {
	private isProcessing = false
	private userCache = new Map<string, any>()
	private tokenCache = new Map<string, any>()
	private pendingUpdates = new Map<string, boolean>()
	private walletClient: WalletClient & PublicActions
	constructor(
		@InjectModel(EventLogs.name)
		private eventLogsModel: Model<EventLogsDocument>,
		@InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
		@InjectModel(TokenHolders.name)
		private tokenHoldersModel: Model<TokenHoldersDocument>,
		@InjectModel(TokenTrades.name)
		private tokenTradesModel: Model<TokenTradesDocument>,
		@InjectModel(UserActivity.name)
		private userActivityModel: Model<UserActivityDocument>,
		private usersService: UsersService,
		private readonly configService: ConfigService,
		private wsUpdatesGateway: WsUpdatesGateway,
	) {
		let chain: Chain = shibariumTestnet
		if (this.configService.get<string>('CHAIN') === 'mainnet') {
			chain = shibarium
		}
		const account = privateKeyToAccount(
			this.configService.get<`0x${string}`>('PRIVATE_KEY'),
		)
		this.walletClient = createWalletClient({
			account,
			chain,
			transport: http(this.configService.get<string>('RPC_URL')),
		}).extend(publicActions)
	}

	@Cron(CronExpression.EVERY_5_SECONDS)
	async processEvents() {
		if (this.isProcessing) {
			console.log('Already processing events')
			return
		}
		this.isProcessing = true
		try {
			await this.processUnprocessedEvents()
			await this.flushPendingUpdates()
		} catch (error) {
			console.error('Error processing events:', error)
		} finally {
			this.isProcessing = false
		}
	}

	private async processUnprocessedEvents() {
		const unprocessedEvents = await this.eventLogsModel
			.find({ processed: false, removed: false })
			.sort({ blockNumber: 1, logIndex: 1, transactionIndex: 1 })
			.lean()

		if (unprocessedEvents.length === 0) {
			return
		}

		// Group events by address for batch processing
		const eventsByAddress = this.groupEventsByAddress(unprocessedEvents)

		// Process event groups concurrently
		await Promise.all(
			Object.entries(eventsByAddress).map(([address, events]) =>
				this.processEventGroup(address as `0x${string}`, events),
			),
		)

		const eventIds = unprocessedEvents.map(event => event._id)
		await this.eventLogsModel.updateMany(
			{ _id: { $in: eventIds } },
			{ $set: { processed: true, syncedAt: new Date() } },
		)
	}

	private async processEventGroup(
		address: `0x${string}`,
		events: EventLogsDocument[],
	) {
		if (
			isAddressEqual(
				address,
				this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			)
		) {
			// Group events by token address
			const eventsByToken = events.reduce(
				(acc, event) => {
					const parsed = parseLog(event as unknown as LogsType, sharbiFunAbi)
					if (!parsed) {
						return acc
					}

					if ('tokenAddress' in parsed.args) {
						const tokenAddress = getAddress(parsed.args.tokenAddress)
						if (!acc[tokenAddress]) {
							acc[tokenAddress] = []
						}
						acc[tokenAddress].push({ event, parsed })
					}
					return acc
				},
				{} as Record<string, Array<{ event: EventLogsDocument; parsed: any }>>,
			)
			// Process each token's events in sequence
			for (const [tokenAddress, tokenEvents] of Object.entries(eventsByToken)) {
				await this.processTokenEvents(tokenAddress, tokenEvents)
			}
		} else {
			return
		}
	}

	private async processTokenEvents(
		tokenAddress: string,
		events: Array<{ event: EventLogsDocument; parsed: any }>,
	) {
		let token: TokenDocument

		// Process events in sequence for this token
		for (const { event, parsed } of events) {
			if (parsed.eventName === 'Buy' || parsed.eventName === 'Sell') {
				if (!token) {
					token = await this.getToken(tokenAddress)
					if (!token) {
						return
					}

					// Initialize accumulator for this token if it doesn't exist
					if (!this.pendingUpdates.has(token._id.toString())) {
						this.pendingUpdates.set(token._id.toString(), true)
					}
				}

				await this.handleTradeEvent(token, event, parsed)
			} else {
				await this.handleSharbiFunEvent(event, parsed)
			}
		}
	}

	private async handleTradeEvent(
		token: any,
		event: EventLogsDocument,
		eventData: any,
	) {
		const isBuy = eventData.eventName === 'Buy'
		const ethAmount = isBuy
			? eventData.args.ethAmountIn
			: eventData.args.ethAmountOut
		const tokenAmount = isBuy
			? eventData.args.tokenAmountOut
			: eventData.args.tokenAmountIn

		// Store trade information
		await this.handleTrades(
			getAddress(token.address),
			getAddress(isBuy ? eventData.args.buyer : eventData.args.seller),
			ethAmount,
			tokenAmount,
			isBuy ? 'buy' : 'sell',
			event.timestamp,
			event.transactionHash,
		)
	}

	private groupEventsByAddress(events: EventLogsDocument[]) {
		return events.reduce(
			(groups, event) => {
				const address = event.address
				if (!groups[address]) {
					groups[address] = []
				}
				groups[address].push(event)
				return groups
			},
			{} as Record<string, EventLogsDocument[]>,
		)
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

	private async getToken(address: string) {
		if (this.tokenCache.has(address)) {
			return this.tokenCache.get(address)
		}

		const token = await this.tokenModel.findOne({
			address: getAddress(address),
			launched: true,
		})

		if (token) {
			this.tokenCache.set(address, token)
		}
		return token
	}

	private calculateTokenPrice(
		virtualY: bigint,
		virtualX: bigint,
	): {
		priceInBigInt: bigint
		priceInBone: number
	} {
		// Scale up before division to maintain precision
		// biome-ignore lint/style/useNamingConvention: <explanation>
		const SCALE = BigInt(10) ** BigInt(18)
		const scaledPrice = (virtualY * SCALE) / virtualX

		return {
			priceInBigInt: scaledPrice,
			priceInBone: Number(scaledPrice / BigInt(10 ** 14)) / 10000,
		}
	}

	private async flushPendingUpdates() {
		const updates = []

		for (const [tokenId, isUpdate] of this.pendingUpdates.entries()) {
			if (!isUpdate) {
				continue
			}

			const token = await this.tokenModel.findById(tokenId)

			const virtualY = await this.walletClient.readContract({
				abi: sharbiFunAbi,
				address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
				functionName: 'virtualY',
				args: [token.address as `0x${string}`],
			})

			const virtualX = await this.walletClient.readContract({
				abi: sharbiFunAbi,
				address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
				functionName: 'virtualX',
				args: [token.address as `0x${string}`],
			})

			const newTokenPrice = this.calculateTokenPrice(virtualY, virtualX)

			const newMarketCap =
				(newTokenPrice.priceInBone *
					Number(BigInt(token.tokenSupply) / BigInt(10n ** 14n))) /
				10000

			const totalRaisedInBone =
				Number(
					(virtualY - BigInt(token.bondingCurveParams.y0)) / BigInt(10n ** 14n),
				) / 10000

			token.bondingCurveParams.virtualY = virtualY.toString()
			token.bondingCurveParams.virtualX = virtualX.toString()

			updates.push(
				this.tokenModel.updateOne(
					{ _id: tokenId },
					{
						$set: {
							totalRaisedInBone: totalRaisedInBone,
							tokenPriceInBone: newTokenPrice.priceInBone,
							marketCapInBone: newMarketCap,
							bondingCurveParams: token.bondingCurveParams,
						},
					},
				),
			)
			this.handleUpdates(tokenId)
		}

		if (updates.length > 0) {
			await Promise.all(updates)
		}

		// Clear all caches and pending updates
		this.pendingUpdates.clear()
		this.userCache.clear()
		this.tokenCache.clear()
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

		const k = await this.walletClient.readContract({
			abi: sharbiFunAbi,
			address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			functionName: 'K',
			args: [token.address as `0x${string}`],
		})

		const x1 = await this.walletClient.readContract({
			abi: sharbiFunAbi,
			address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			functionName: 'X1',
			args: [token.address as `0x${string}`],
		})

		const y1 = await this.walletClient.readContract({
			abi: sharbiFunAbi,
			address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			functionName: 'Y1',
			args: [token.address as `0x${string}`],
		})

		const x0 = await this.walletClient.readContract({
			abi: sharbiFunAbi,
			address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			functionName: 'X0',
			args: [token.address as `0x${string}`],
		})
		const y0 = await this.walletClient.readContract({
			abi: sharbiFunAbi,
			address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
			functionName: 'Y0',
			args: [token.address as `0x${string}`],
		})

		token.launched = true
		token.address = getAddress(eventData.args.tokenAddress)
		token.name = eventData.args.name
		token.ticker = eventData.args.symbol
		token.tokenSupply = eventData.args.totalSupply.toString()
		token.bondingCurve = eventData.args.curveSize === 0 ? 'beginner' : 'pro'
		token.donate = 'no'
		token.totalRaisedInBone = 0

		token.bondingCurveParams = {
			k: k.toString(),
			x1: x1.toString(),
			y1: y1.toString(),
			x0: x0.toString(),
			y0: y0.toString(),
			virtualX: '0',
			virtualY: '0',
		}

		const tokenPrice = this.calculateTokenPrice(x0, y0)
		const marketCap =
			(tokenPrice.priceInBone *
				Number(eventData.args.totalSupply / BigInt(10n ** 14n))) /
			10000

		token.tokenPriceInBone = tokenPrice.priceInBone
		token.marketCapInBone = marketCap

		await token.save()

		const userActivity = new this.userActivityModel({
			user: creator._id,
			type: 'created',
			boneAmount: 0,
			tokenAmount:
				Number(eventData.args.totalSupply / BigInt(10 ** 14)) / 10000,
			token: token._id,
			timestamp: event.timestamp,
		})
		await userActivity.save()
		this.wsUpdatesGateway.broadcastPublicUpdate('tokenLaunched', {
			address: token.address,
			creator: {
				address: creator.address,
				username: creator.username,
				profileImage: creator.profileImage,
			},
			name: token.name,
			ticker: token.ticker,
			tokenSupply: token.tokenSupply,
			bondingCurve: token.bondingCurve,
			marketCap: token.marketCapInBone,
			totalRaisedInBone: token.totalRaisedInBone,
			twitterLink: token.twitterLink,
			telegramLink: token.telegramLink,
			websiteLink: token.websiteLink,
			description: token.description,
			image: token.image,
		})
	}

	private async handleDonationSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Donation' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
			launched: true,
		})

		if (token) {
			token.donate = 'yes'
			await token.save()
		}
	}

	private async handleUpdates(tokenId: string) {
		const token = await this.tokenModel.findById(tokenId)
		const volume24 = await this.tokenTradesModel
			.aggregate([
				{
					$match: {
						token: token._id,
						createdAt: {
							$gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
						},
					},
				},
				{
					$group: {
						_id: null,
						total: { $sum: '$boneAmount' },
					},
				},
			])
			.exec()

		this.wsUpdatesGateway.broadcastTokenUpdate(token.address, 'tokenUpdate', {
			totalRaisedInBone: token.totalRaisedInBone,
			tokenPriceInBone: token.tokenPriceInBone,
			marketCapInBone: token.marketCapInBone,
			bondingCurveParams: token.bondingCurveParams,
			volume24: volume24[0]?.total || 0,
		})
	}

	private async handleTrades(
		tokenAddress: `0x${string}`,
		trader: `0x${string}`,
		boneAmount: bigint,
		tokenAmount: bigint,
		type: 'buy' | 'sell',
		timestamp: Date,
		txHash: string,
	) {
		const token = await this.getToken(tokenAddress)
		const user = await this.createUserIfNotExists(trader)

		const tradeBoneAmount = Number(boneAmount / BigInt(10 ** 14)) / 10000
		const tradeTokenAmount = Number(tokenAmount / BigInt(10 ** 14)) / 10000

		const tokenTrade = new this.tokenTradesModel({
			token: token._id,
			trader: user._id,
			boneAmount: tradeBoneAmount,
			tokenAmount: tradeTokenAmount,
			type,
			timestamp,
			txHash,
		})
		await tokenTrade.save()

		const userActivity = new this.userActivityModel({
			user: user._id,
			type,
			boneAmount: tradeBoneAmount,
			tokenAmount: tradeTokenAmount,
			token: token._id,
			timestamp,
		})
		await userActivity.save()

		const tokenHolders = await this.tokenHoldersModel.findOne({
			token: token._id,
			holder: user._id,
		})

		if (tokenHolders) {
			if (type === 'buy') {
				tokenHolders.balanceInBig = (
					BigInt(tokenHolders.balanceInBig) + tokenAmount
				).toString()
			} else {
				tokenHolders.balanceInBig = (
					BigInt(tokenHolders.balanceInBig) - tokenAmount
				).toString()
			}
			if (BigInt(tokenHolders.balanceInBig) < BigInt(0)) {
				tokenHolders.balanceInBig = BigInt(0).toString()
			}
			tokenHolders.balance =
				Number(BigInt(tokenHolders.balanceInBig) / BigInt(10 ** 14)) / 10000

			await tokenHolders.save()
		} else {
			const newTokenHolders = new this.tokenHoldersModel({
				token: token._id,
				holder: user._id,
				balanceInBig: type === 'buy' ? tokenAmount.toString() : '0',
				balance: type === 'buy' ? tradeTokenAmount : 0,
			})
			await newTokenHolders.save()
		}

		this.wsUpdatesGateway.broadcastPublicUpdate('trade', {
			token: {
				address: token.address,
				name: token.name,
				ticker: token.ticker,
				image: token.image,
			},
			trader: {
				address: user.address,
				username: user.username,
				profileImage: user.profileImage,
			},
			boneAmount: tradeBoneAmount,
			tokenAmount: tradeTokenAmount,
			type,
			timestamp,
			txHash,
		})

		this.wsUpdatesGateway.broadcastTokenUpdate(token.address, 'trade', {
			trader: {
				address: user.address,
				username: user.username,
				profileImage: user.profileImage,
			},
			boneAmount: tradeBoneAmount,
			tokenAmount: tradeTokenAmount,
			type,
			timestamp,
			txHash,
		})

		this.wsUpdatesGateway.broadcastTokenUpdate(
			token.address,
			'tokenHoldersUpdated',
			{},
		)
	}

	private async handleCompleteSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Complete' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
			launched: true,
			graduated: false,
		})

		if (token) {
			const { request } = await this.walletClient.simulateContract({
				abi: sharbiFunAbi,
				address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
				functionName: 'graduate',
				args: [token.address as `0x${string}`],
			})
			await this.walletClient.writeContract(request)
		}
	}

	private async handleGraduateSharbiFunEvent(
		event: EventLogsDocument,
		eventData: Extract<SharbiFunEventType, { eventName: 'Graduate' }>,
	) {
		const token = await this.tokenModel.findOne({
			address: getAddress(eventData.args.tokenAddress),
			launched: true,
			graduated: false,
		})

		if (token) {
			token.graduated = true
			token.pairAddress = getAddress(eventData.args.pairAddress)
			await token.save()
		}

		this.wsUpdatesGateway.broadcastTokenUpdate(token.address, 'graduate', {
			pairAddress: token.pairAddress,
		})
	}

	@Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
	async cleanupSyncedEvents() {
		const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

		await this.eventLogsModel.deleteMany({
			syncedAt: { $lt: oneMonthAgo },
			processed: true,
		})
	}

	private async createUserIfNotExists(address: string) {
		if (this.userCache.has(address)) {
			return this.userCache.get(address)
		}

		let user = await this.usersService.findByAddress(address)
		if (!user) {
			user = await this.usersService.create({ address })
		}
		this.userCache.set(address, user)
		return user
	}
}
