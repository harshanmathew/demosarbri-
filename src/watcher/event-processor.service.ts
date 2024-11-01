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
interface TokenUpdate {
	totalRaisedInBoneBig: bigint
	virtualY: bigint
	virtualX: bigint
	tokenAmountChange: bigint
	ethAmountChange: bigint
}

@Injectable()
export class EventProcessorService {
	private isProcessing = false
	private userCache = new Map<string, any>()
	private tokenCache = new Map<string, any>()
	private pendingUpdates = new Map<string, TokenUpdate>()
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
		//this.processTestScenario()
	}
	// private async processTestScenario() {
	// 	const tokenAddress = '0x6E0d01A76C3Cf4288372a29124A26D4353EE51BE'
	// 	const sampleEvents = [
	// 		// Launch Event
	// 		{
	// 			event: {
	// 				blockNumber: 1,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx1',
	// 			},
	// 			parsed: {
	// 				eventName: 'Launch',
	// 				args: {
	// 					launcher: '0x599333629bA154aF829a8880f18313311CfcE6EA',
	// 					tokenAddress: tokenAddress,
	// 					name: 'Test Token',
	// 					symbol: 'TEST',
	// 					totalSupply: BigInt('10000000000000000000000'), // 10,000 tokens
	// 					curveSize: 0, // beginner curve
	// 				},
	// 			},
	// 		},
	// 		// First Buy Event
	// 		{
	// 			event: {
	// 				blockNumber: 2,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx2',
	// 			},
	// 			parsed: {
	// 				eventName: 'Buy',
	// 				args: {
	// 					buyer: '0x599333629bA154aF829a8880f18313311CfcE6EA',
	// 					tokenAddress: tokenAddress,
	// 					ethAmountIn: BigInt('100000000000000000000'), // 100 BONE
	// 					tokenAmountOut: BigInt('1500000000000000000000'), // 1,500 tokens
	// 				},
	// 			},
	// 		},
	// 		// Second Buy Event
	// 		{
	// 			event: {
	// 				blockNumber: 3,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx3',
	// 			},
	// 			parsed: {
	// 				eventName: 'Buy',
	// 				args: {
	// 					buyer: '0x60D9637A7ad741a7F60595045d29960326c1843A',
	// 					tokenAddress: tokenAddress,
	// 					ethAmountIn: BigInt('50000000000000000000'), // 50 BONE
	// 					tokenAmountOut: BigInt('700000000000000000000'), // 700 tokens
	// 				},
	// 			},
	// 		},
	// 		// Third Buy Event
	// 		{
	// 			event: {
	// 				blockNumber: 4,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx4',
	// 			},
	// 			parsed: {
	// 				eventName: 'Buy',
	// 				args: {
	// 					buyer: '0xfFfFD00d331C3Ff80D8F7d82A2f9A2312E0124b4',
	// 					tokenAddress: tokenAddress,
	// 					ethAmountIn: BigInt('30000000000000000000'), // 30 BONE
	// 					tokenAmountOut: BigInt('400000000000000000000'), // 400 tokens
	// 				},
	// 			},
	// 		},
	// 		// Sell Event
	// 		{
	// 			event: {
	// 				blockNumber: 5,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx5',
	// 			},
	// 			parsed: {
	// 				eventName: 'Sell',
	// 				args: {
	// 					seller: '0x599333629bA154aF829a8880f18313311CfcE6EA',
	// 					tokenAddress: tokenAddress,
	// 					ethAmountOut: BigInt('75000000000000000000'), // 75 BONE
	// 					tokenAmountIn: BigInt('1000000000000000000000'), // 1000 tokens
	// 				},
	// 			},
	// 		},
	// 	]

	// 	console.log('=== Processing Complete Token Lifecycle Events ===')
	// 	await this.processTokenEvents(tokenAddress, sampleEvents as any)

	// 	// Create sample events for a pro curve token
	// 	const proTokenAddress = '0xb794f5ea0ba39494ce839613fffba74279579268'
	// 	const proTokenEvents = [
	// 		{
	// 			event: {
	// 				blockNumber: 1,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx6',
	// 			},
	// 			parsed: {
	// 				eventName: 'Launch',
	// 				args: {
	// 					launcher: '0x60D9637A7ad741a7F60595045d29960326c1843A',
	// 					tokenAddress: proTokenAddress,
	// 					name: 'Pro Token',
	// 					symbol: 'PRO',
	// 					totalSupply: BigInt('10000000000000000000000'), // 10,000 tokens
	// 					curveSize: 1, // pro curve
	// 				},
	// 			},
	// 		},
	// 		// Sample buy for pro token
	// 		{
	// 			event: {
	// 				blockNumber: 2,
	// 				timestamp: new Date(),
	// 				transactionHash: 'tx7',
	// 			},
	// 			parsed: {
	// 				eventName: 'Buy',
	// 				args: {
	// 					buyer: '0x60D9637A7ad741a7F60595045d29960326c1843A',
	// 					tokenAddress: proTokenAddress,
	// 					ethAmountIn: BigInt('200000000000000000000'), // 200 BONE
	// 					tokenAmountOut: BigInt('1000000000000000000000'), // 1,000 tokens
	// 				},
	// 			},
	// 		},
	// 	]

	// 	console.log('\n=== Processing Pro Token Events ===')
	// 	await this.processTokenEvents(proTokenAddress, proTokenEvents as any)

	// 	console.log('\n=== Flushing Pending Updates ===')
	// 	await this.flushPendingUpdates()
	// }

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
			.find({ processed: false })
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
						this.pendingUpdates.set(token._id.toString(), {
							totalRaisedInBoneBig: BigInt(token.totalRaisedInBoneBig),
							virtualY: BigInt(token.virtualY),
							virtualX: BigInt(token.virtualX),
							tokenAmountChange: BigInt(0),
							ethAmountChange: BigInt(0),
						})
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

		// Get current accumulated updates
		const updates = this.pendingUpdates.get(token._id.toString())

		// Update the accumulator
		updates.ethAmountChange = isBuy
			? updates.ethAmountChange + BigInt(ethAmount)
			: updates.ethAmountChange - BigInt(ethAmount)

		updates.tokenAmountChange = isBuy
			? updates.tokenAmountChange - BigInt(tokenAmount)
			: updates.tokenAmountChange + BigInt(tokenAmount)

		// Calculate new totals
		updates.totalRaisedInBoneBig =
			BigInt(token.totalRaisedInBoneBig) + updates.ethAmountChange
		updates.virtualY = BigInt(token.virtualY) + updates.ethAmountChange
		updates.virtualX = BigInt(token.virtualX) + updates.tokenAmountChange

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
			priceInBone: Number(
				Number(Number(scaledPrice) / Number(SCALE)).toFixed(4),
			),
		}
	}

	private async flushPendingUpdates() {
		const updates = []

		for (const [tokenId, accumulatedUpdates] of this.pendingUpdates.entries()) {
			const { totalRaisedInBoneBig, virtualY, virtualX } = accumulatedUpdates

			console.log('virtualY', virtualY)
			console.log('virtualX', virtualX)
			const newTokenPrice = this.calculateTokenPrice(virtualY, virtualX)

			console.log('newTokenPrice', newTokenPrice)
			const token = await this.tokenModel.findById(tokenId)
			const newMarketCap =
				newTokenPrice.priceInBone *
				Number(BigInt(token.tokenSupply) / BigInt(10n ** 18n))

			const newMarketCapBig = BigInt(newMarketCap * 10 ** 18)

			updates.push(
				this.tokenModel.updateOne(
					{ _id: tokenId },
					{
						$set: {
							totalRaisedInBoneBig: totalRaisedInBoneBig.toString(),
							totalRaisedInBone: Number(
								Number(totalRaisedInBoneBig / BigInt(10n ** 18n)).toFixed(2),
							),
							virtualY: virtualY.toString(),
							virtualX: virtualX.toString(),
							tokenPriceInBoneBig: newTokenPrice.priceInBigInt.toString(),
							tokenPriceInBone: newTokenPrice.priceInBone,
							marketCapInBoneBig: newMarketCapBig.toString(),
							marketCapInBone: Number(Number(newMarketCap).toFixed(4)),
						},
					},
				),
			)
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

		const userActivity = new this.userActivityModel({
			user: creator._id,
			type: 'created',
			boneAmount: 0,
			tokenAmount: Number(
				Number(eventData.args.totalSupply / BigInt(10 ** 18)).toFixed(2),
			),
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

		const tokenTrade = new this.tokenTradesModel({
			token: token._id,
			trader: user._id,
			boneAmount: Number(boneAmount / BigInt(10 ** 18)).toFixed(2),
			tokenAmount: Number(tokenAmount / BigInt(10 ** 18)).toFixed(2),
			type,
			timestamp,
			txHash,
		})
		await tokenTrade.save()

		const userActivity = new this.userActivityModel({
			user: user._id,
			type,
			boneAmount: Number(boneAmount / BigInt(10 ** 18)).toFixed(2),
			tokenAmount: Number(tokenAmount / BigInt(10 ** 18)).toFixed(2),
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
				tokenHolders.balance = (
					BigInt(tokenHolders.balance) + tokenAmount
				).toString()
			} else {
				tokenHolders.balance = (
					BigInt(tokenHolders.balance) - tokenAmount
				).toString()
			}
			if (BigInt(tokenHolders.balance) < BigInt(0)) {
				tokenHolders.balance = BigInt(0).toString()
			}

			await tokenHolders.save()
		} else {
			const newTokenHolders = new this.tokenHoldersModel({
				token: token._id,
				holder: user._id,
				balance: type === 'buy' ? tokenAmount.toString() : '0',
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
			boneAmount: Number(boneAmount / BigInt(10 ** 18)).toFixed(2),
			tokenAmount: Number(tokenAmount / BigInt(10 ** 18)).toFixed(2),
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
			boneAmount: Number(boneAmount / BigInt(10 ** 18)).toFixed(2),
			tokenAmount: Number(tokenAmount / BigInt(10 ** 18)).toFixed(2),
			type,
			timestamp,
			txHash,
		})
		const tokenHoldersList = await this.tokenHoldersModel
			.find({
				token: token._id,
			})
			.populate<{ holder: UserDocument }>('holder')

		this.wsUpdatesGateway.broadcastTokenUpdate(
			token.address,
			'tokenHolders',
			tokenHoldersList.map(tokenHolder => ({
				holder: {
					address: tokenHolder.holder.address,
					username: tokenHolder.holder.username,
					profileImage: tokenHolder.holder.profileImage,
				},
				balance: tokenHolder.balance,
			})),
		)

		this.wsUpdatesGateway.broadcastTokenUpdate(token.address, 'tokenUpdate', {
			totalRaisedInBone: token.totalRaisedInBone,
			tokenPriceInBone: token.tokenPriceInBone,
			marketCapInBone: token.marketCapInBone,
		})
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
			let chain: Chain = shibariumTestnet
			if (this.configService.get<string>('CHAIN') === 'mainnet') {
				chain = shibarium
			}
			const account = privateKeyToAccount(
				this.configService.get<`0x${string}`>('PRIVATE_KEY'),
			)
			const client = createWalletClient({
				account,
				chain,
				transport: http(this.configService.get<string>('RPC_URL')),
			}).extend(publicActions)
			const { request } = await client.simulateContract({
				abi: sharbiFunAbi,
				address: this.configService.get<`0x${string}`>('SHARBI_FUN_ADDRESS'),
				functionName: 'graduate',
				args: [token.address as `0x${string}`],
			})
			await client.writeContract(request)
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
