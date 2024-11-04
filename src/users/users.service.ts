import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { PaginationQueryDto } from 'src/tokens/dto/pagination-query.dto'
import {
	TokenHolders,
	TokenHoldersDocument,
} from 'src/tokens/schemas/token-holders.schema'
import { Token, TokenDocument } from 'src/tokens/schemas/token.schema'
import { randomUsername } from 'src/utils/random-string'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserActivity } from './schemas/user-activity.schema'
import { User } from './schemas/user.schemas'

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
		@InjectModel(UserActivity.name) private userActivity: Model<UserActivity>,
		@InjectModel(TokenHolders.name)
		private readonly tokenHoldersModel: Model<TokenHoldersDocument>,
		@InjectModel(Token.name)
		private readonly tokenModel: Model<TokenDocument>,
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		if (!createUserDto.username) {
			createUserDto.username = await this.generateUniqueUsername()
		}

		const newUser = new this.userModel(createUserDto)
		newUser.usernameLower = newUser.username.toLowerCase()
		return newUser.save()
	}

	async findAll(): Promise<User[]> {
		return this.userModel.find().exec()
	}

	async findOne(id: string): Promise<User> {
		const user = await this.userModel.findById(id).exec()
		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
		return user
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
		const updateData = {
			...updateUserDto,
			usernameLower: updateUserDto.username.toLowerCase(),
		}
		const updatedUser = await this.userModel
			.findByIdAndUpdate(id, updateData, { new: true })
			.exec()
		if (!updatedUser) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
		return updatedUser
	}

	async remove(id: string): Promise<void> {
		const result = await this.userModel.findByIdAndDelete(id).exec()
		if (!result) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
	}

	async findByAddress(address: string): Promise<User | null> {
		const user = await this.userModel.findOne({ address }).exec()
		if (!user) {
			return null
		}
		return user
	}

	private async generateUniqueUsername(): Promise<string> {
		let username: string
		let isUnique = false

		while (!isUnique) {
			username = randomUsername()
			const existingUser = await this.findByUsername(username)
			if (!existingUser) {
				isUnique = true
			}
		}

		return username
	}

	async findByUsername(username: string): Promise<User | null> {
		const user = await this.userModel
			.findOne({ usernameLower: username.toLowerCase() })
			.exec()
		if (!user) {
			return null
		}
		return user
	}

	async isUsernameAvailable(username: string): Promise<boolean> {
		const user = await this.findByUsername(username)
		return user === null
	}

	async findUserStatus(
		id: string,
		caller: 'me' | 'public' = 'public',
	): Promise<any> {
		const [userStats, netWorth] = await Promise.all([
			this.getUserStats(id),
			caller === 'public' ? this.calculateUserNetWorth(id) : null,
		])

		const { user, stats } = userStats

		const response = {
			id: user._id,
			username: user.username,
			address: user.address,
			profileImage: user.profileImage,
			stats,
		}

		if (caller === 'me') {
			return {
				...response,
				netWorth,
			}
		}

		return response
	}

	private async getUserStats(userId: string) {
		const [user, activityStats, tokenTypesCount] = await Promise.all([
			this.userModel.findById(userId).exec(),
			this.userActivity.aggregate([
				{
					$facet: {
						// Trading stats
						tradingStats: [
							{
								$match: {
									user: new Types.ObjectId(userId),
									type: { $in: ['buy', 'sell'] },
								},
							},
							{
								$group: {
									_id: '$token',
									totalTokens: {
										$sum: {
											$cond: [
												{ $eq: ['$type', 'buy'] },
												'$tokenAmount',
												{ $multiply: ['$tokenAmount', -1] },
											],
										},
									},
									totalBonesInvested: {
										$sum: {
											$cond: [{ $eq: ['$type', 'buy'] }, '$boneAmount', 0],
										},
									},
								},
							},
							{
								$group: {
									_id: null,
									totalTokensHeld: { $sum: '$totalTokens' },
									totalBonesInvested: { $sum: '$totalBonesInvested' },
								},
							},
						],
						// Creation stats
						creationStats: [
							{
								$match: {
									user: new Types.ObjectId(userId),
									type: 'created',
								},
							},
							{
								$lookup: {
									from: 'tokens',
									localField: 'token',
									foreignField: '_id',
									as: 'tokenDetails',
								},
							},
							{
								$unwind: '$tokenDetails',
							},
							{
								$group: {
									_id: null,
									totalTokens: { $sum: 1 },
									graduatedTokens: {
										$sum: {
											$cond: [{ $eq: ['$tokenDetails.graduated', true] }, 1, 0],
										},
									},
								},
							},
						],
					},
				},
			]),
			// Count unique tokens with positive balance
			this.tokenHoldersModel.aggregate([
				{
					$match: {
						holder: new Types.ObjectId(userId),
						balance: { $gt: 0 },
					},
				},
				{
					$group: {
						_id: null,
						totalTypeOfTokensHeld: { $sum: 1 },
					},
				},
			]),
		])

		if (!user) {
			throw new Error('User not found')
		}

		const tradingStats = activityStats[0]?.tradingStats[0] || {
			totalTokensHeld: 0,
			totalBonesInvested: 0,
		}
		const creationStats = activityStats[0]?.creationStats[0] || {
			totalTokens: 0,
			graduatedTokens: 0,
		}

		console.log('tokenTypesCount', tokenTypesCount)

		return {
			user,
			stats: {
				totalTokensHeld: tokenTypesCount[0]?.totalTypeOfTokensHeld || 0,
				totalBonesInvested: tradingStats.totalBonesInvested,
				tokensCreated: creationStats.totalTokens,
				graduatedTokensCreated: creationStats.graduatedTokens,
			},
		}
	}

	async calculateUserNetWorth(userId: string) {
		const holdings = await this.tokenHoldersModel.aggregate([
			{
				$match: {
					holder: new Types.ObjectId(userId),
					balance: { $gt: 0 },
				},
			},
			{
				$lookup: {
					from: 'tokens',
					localField: 'token',
					foreignField: '_id',
					as: 'tokenInfo',
				},
			},
			{
				$unwind: '$tokenInfo',
			},
			{
				$group: {
					_id: null,
					totalNetWorthInBone: {
						$sum: { $multiply: ['$balance', '$tokenInfo.tokenPriceInBone'] },
					},
					graduatedTokensValue: {
						$sum: {
							$cond: [
								{ $eq: ['$tokenInfo.graduated', true] },
								{ $multiply: ['$balance', '$tokenInfo.tokenPriceInBone'] },
								0,
							],
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					totalNetWorthInBone: 1,
					graduatedTokensValue: 1,
					nonGraduatedTokensValue: {
						$subtract: ['$totalNetWorthInBone', '$graduatedTokensValue'],
					},
				},
			},
		])

		return (
			holdings[0] || {
				totalNetWorthInBone: 0,
				graduatedTokensValue: 0,
				nonGraduatedTokensValue: 0,
			}
		)
	}

	async findAllHoldings(userId: string, queryParams: PaginationQueryDto) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const holdings = await this.tokenHoldersModel
			.find({ holder: new Types.ObjectId(userId) })
			.populate<{ token: Token }>('token')
			.skip(skip)
			.limit(pageSize)

		const total = await this.tokenHoldersModel
			.countDocuments({ holder: new Types.ObjectId(userId) })
			.exec()
		return {
			holdings: holdings.map(holding => {
				const totalRaised =
					BigInt(holding.token?.bondingCurveParams?.virtualY) -
					BigInt(holding.token?.bondingCurveParams?.y0)
				const totalCurve =
					BigInt(holding.token?.bondingCurveParams?.y1) -
					BigInt(holding.token?.bondingCurveParams?.y0)
				const percentage = Number((totalRaised * BigInt(100)) / totalCurve)
				return {
					id: holding.token._id,
					address: holding.token.address,
					name: holding.token.name,
					ticker: holding.token.ticker,
					image: holding.token.image,
					marketCapInBone: holding.token.marketCapInBone,
					tokenPriceInBone: holding.token.tokenPriceInBone,
					bondingCurvePercentage: percentage,
					balance: holding.balance,
				}
			}),
			total,
			currentPage,
		}
	}

	async findCreatedTokens(
		userId: string,
		queryParams: PaginationQueryDto,
		type: 'all' | 'graduated' | 'non-graduated' = 'all',
	) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const match: any = {
			creator: new Types.ObjectId(userId),
			launched: true,
		}

		if (type === 'non-graduated') {
			match.graduated = false
		} else if (type === 'graduated') {
			match.graduated = true
		}

		const result = await this.tokenModel.aggregate([
			{
				$match: match,
			},
			{
				// Get transaction count
				$lookup: {
					from: 'useractivities',
					let: { tokenId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$token', '$$tokenId'] },
										{ $in: ['$type', ['buy', 'sell']] },
									],
								},
							},
						},
						{
							$count: 'count',
						},
					],
					as: 'transactionStats',
				},
			},
			{
				// Get unique holders count
				$lookup: {
					from: 'tokenholders',
					let: { tokenId: '$_id' },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{ $eq: ['$token', '$$tokenId'] },
										{ $gt: ['$balance', 0] },
									],
								},
							},
						},
						{
							$count: 'count',
						},
					],
					as: 'holdersStats',
				},
			},
			{
				$project: {
					_id: 1,
					name: 1,
					image: 1,
					ticker: 1,
					address: 1,
					marketcap: { $ifNull: ['$marketCapInBone', 0] },
					bondingCurveParams: 1,
					transactionCount: {
						$ifNull: [{ $arrayElemAt: ['$transactionStats.count', 0] }, 0],
					},
					holdersCount: {
						$ifNull: [{ $arrayElemAt: ['$holdersStats.count', 0] }, 0],
					},
				},
			},
			{
				$facet: {
					metadata: [{ $count: 'total' }],
					data: [{ $skip: skip }, { $limit: pageSize }],
				},
			},
		])

		const projects = result[0].data || []
		const total = result[0].metadata[0]?.total || 0

		return {
			tokens: projects.map(token => {
				const totalRaised =
					BigInt(token?.bondingCurveParams?.virtualY) -
					BigInt(token?.bondingCurveParams?.y0)
				const totalCurve =
					BigInt(token?.bondingCurveParams?.y1) -
					BigInt(token?.bondingCurveParams?.y0)
				const percentage = Number((totalRaised * BigInt(100)) / totalCurve)
				return {
					id: token._id,
					address: token.address,
					name: token.name,
					ticker: token.ticker,
					image: token.image,
					bondingCurvePercentage: percentage,
					transactionCount: token.transactionCount,
					holdersCount: token.holdersCount,
				}
			}),
			total,
			currentPage,
		}
	}

	async findUserTrades(userId: string, queryParams: PaginationQueryDto) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const trades = await this.userActivity
			.find({
				user: new Types.ObjectId(userId),
				type: { $in: ['buy', 'sell'] },
			})
			.populate<{ token: Token }>('token')
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(pageSize)

		const total = await this.userActivity
			.countDocuments({
				user: new Types.ObjectId(userId),
				type: { $in: ['buy', 'sell'] },
			})
			.exec()

		return {
			trades: trades.map(trade => ({
				id: trade._id,
				type: trade.type,
				boneAmount: trade.boneAmount,
				tokenAmount: trade.tokenAmount,
				token: {
					id: trade.token._id,
					address: trade.token.address,
					name: trade.token.name,
					ticker: trade.token.ticker,
					image: trade.token.image,
				},
				timestamp: trade.timestamp,
			})),
			total,
			currentPage,
		}
	}

	async findUserProjectTrades(userId: string, queryParams: PaginationQueryDto) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const userTokens = await this.tokenModel.find(
			{ creator: new Types.ObjectId(userId), launched: true },
			{ _id: 1 },
		)

		const tokenIds = userTokens.map(token => token._id)

		const trades = await this.userActivity
			.find({
				type: { $in: ['buy', 'sell'] },
				token: { $in: tokenIds },
			})
			.populate<{ token: Token }>('token')
			.populate<{ user: User }>('user')
			.sort({ timestamp: -1 })
			.skip(skip)
			.limit(pageSize)

		const total = await this.userActivity
			.countDocuments({
				type: { $in: ['buy', 'sell'] },
				token: { $in: tokenIds },
			})
			.exec()

		return {
			trades: trades.map(trade => ({
				id: trade._id,
				type: trade.type,
				boneAmount: trade.boneAmount,
				tokenAmount: trade.tokenAmount,
				token: {
					id: trade.token._id,
					address: trade.token.address,
					name: trade.token.name,
					ticker: trade.token.ticker,
					image: trade.token.image,
				},
				timestamp: trade.timestamp,
				user: {
					id: trade.user._id,
					username: trade.user.username,
					address: trade.user.address,
					profileImage: trade.user.profileImage,
				},
			})),
			total,
			currentPage,
		}
	}
}
