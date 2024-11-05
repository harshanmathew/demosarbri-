import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
	UserActivity,
	UserActivityDocument,
} from 'src/users/schemas/user-activity.schema'
import { User } from 'src/users/schemas/user.schemas'
import { RecentlyLaunchedQueryDto } from 'src/ws-updates/dto/recently-launched-query.dto'
import { TokenDto } from 'src/ws-updates/dto/recently-launched-response.dto'
import { getAddress } from 'viem'
import { CreateTokenDto } from './dto/create-token.dto'
import { ChartQueryDto, PaginationQueryDto } from './dto/pagination-query.dto'
import {
	BondingCurveParamsDto,
	TokenWithVolumeDto,
	UserDto,
} from './dto/token-response.dto'
import { UpdateTokenDto } from './dto/update-token.dto'
import {
	TokenHolders,
	TokenHoldersDocument,
} from './schemas/token-holders.schema'
import { TokenTrades, TokenTradesDocument } from './schemas/token-trade.schema'
import { Token, TokenDocument } from './schemas/token.schema'

@Injectable()
export class TokensService {
	constructor(
		@InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
		@InjectModel(UserActivity.name)
		private userActivityModel: Model<UserActivityDocument>,
		@InjectModel(TokenHolders.name)
		private tokenHoldersModel: Model<TokenHoldersDocument>,
		@InjectModel(TokenTrades.name)
		private tokenTradesModel: Model<TokenTradesDocument>,
	) {}

	async create(createTokenDto: CreateTokenDto, user: User): Promise<Token> {
		const createdToken = new this.tokenModel({
			...createTokenDto,
			creator: user._id,
			launched: false,
		})

		return createdToken.save()
	}

	async update(address: string, updateTokenDto: UpdateTokenDto, user: User) {
		// Filter out undefined, null, and empty string values
		const filteredUpdate = Object.entries(updateTokenDto).reduce(
			(acc, [key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					acc[key] = value
				}
				return acc
			},
			{},
		)

		return this.tokenModel.findOneAndUpdate(
			{ address: getAddress(address) },
			filteredUpdate,
			{
				new: true,
			},
		)
	}

	async findAll(user: User): Promise<Token[]> {
		return this.tokenModel.find({ creator: user._id }).exec()
	}

	async findOne(address: string): Promise<TokenWithVolumeDto> {
		const token = await this.tokenModel
			.findOne({ address: getAddress(address) })
			.populate<UserDto>({
				path: 'creator',
				select: 'username address profileImage',
			})
			.lean()
		if (!token) {
			throw new NotFoundException(`Token with Address: "${address}" not found`)
		}
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
		return { ...token, volume24: volume24[0]?.total || 0 }
	}

	async findAllLaunched(): Promise<Token[]> {
		return this.tokenModel.find({ launched: true }).exec()
	}

	async findRecentlyLaunched(queryParams: RecentlyLaunchedQueryDto): Promise<{
		tokens: TokenDto[]
		totalPages: number
		currentPage: number
	}> {
		const { page = 1, limit = 10, search, sort, filter } = queryParams

		const query: any = { launched: true, graduated: false }

		// Apply search filter
		if (search) {
			query.$or = [
				{ name: { $regex: search, $options: 'i' } },
				{ ticker: { $regex: search, $options: 'i' } },
			]
		}

		// Apply additional filters
		if (filter) {
			if (filter.bondingCurve) {
				query.bondingCurve = filter.bondingCurve
			}
		}

		let sortOptions = {}

		// Apply sorting
		if (sort) {
			sortOptions = sort
		} else {
			sortOptions = { createdAt: -1 }
		}

		// Apply pagination
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		// Execute query and get total count
		const [tokens, total] = await Promise.all([
			this.tokenModel
				.find(query)
				.populate('creator')
				.sort(sortOptions)
				.skip(skip)
				.limit(pageSize)
				.exec(),
			this.tokenModel.countDocuments(query),
		])

		const totalPages = Math.ceil(total / pageSize)

		const list = tokens.map((token: Token) => ({
			img: token.image,
			name: token.name,
			symbol: token.ticker,
			description: token.description,
			address: token.address,
			creator: {
				address: token.creator?.address || '',
				username: token.creator?.username || '',
			},
			marketCap: token.marketCapInBone,
			bondingCurveStatus: token.bondingCurve,
			bondingCurveParams: token.bondingCurveParams,
		}))

		return {
			tokens: list,
			totalPages,
			currentPage,
		}
	}

	async findRandomToken(): Promise<{ address: string }> {
		const count = await this.tokenModel.countDocuments({
			launched: true,
			graduated: false,
		})
		const random = Math.floor(Math.random() * count)
		const token = await this.tokenModel
			.findOne({ launched: true, graduated: false })
			.skip(random)
			.exec()

		return {
			address: token.address,
		}
	}

	async findLatestActivity() {
		return this.userActivityModel
			.find({ type: { $in: ['buy', 'sell'] } })
			.sort({ timestamp: -1 })
			.populate({
				path: 'user',
				select: 'username address profileImage',
			})
			.populate({
				path: 'token',
				select: 'name ticker image address',
			})
			.select(['user', 'token', 'type', 'boneAmount', 'tokenAmount'])
			.limit(6)
			.exec()
	}

	async findAllHolders(tokenId: string, queryParams: PaginationQueryDto) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const total = await this.tokenHoldersModel
			.countDocuments({ token: new Types.ObjectId(tokenId) })
			.exec()

		const totalPages = Math.ceil(total / pageSize)

		const holders = await this.tokenHoldersModel
			.find({ token: new Types.ObjectId(tokenId) })
			.skip(skip)
			.limit(pageSize)
			.sort({ balance: -1 })
			.populate<User>('holder', 'username address profileImage')

		return {
			holders,
			totalPages,
			currentPage,
		}
	}

	async findAllTrades(tokenId: string, queryParams: PaginationQueryDto) {
		const { page = 1, limit = 10 } = queryParams
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		const total = await this.tokenTradesModel
			.countDocuments({ token: new Types.ObjectId(tokenId) })
			.exec()
		const totalPages = Math.ceil(total / pageSize)
		const trades = await this.tokenTradesModel
			.find({ token: new Types.ObjectId(tokenId) })
			.skip(skip)
			.limit(pageSize)
			.sort({ createdAt: -1 })
			.populate<User>('trader', 'username address profileImage')
		return {
			trades,
			totalPages,
			currentPage,
		}
	}

	async findChart(tokenId: string, queryParams: ChartQueryDto) {
		const {
			limit = 100,
			interval = '5m',
			page = 1,
			endDate,
			startDate,
		} = queryParams

		const pipeline: any[] = [
			{
				$match: {
					token: new Types.ObjectId(tokenId),
				},
			},
		]

		if (startDate && endDate) {
			pipeline[0].$match.timestamp = {
				$gte: new Date(startDate),
				$lte: new Date(endDate),
			}
		} else if (startDate) {
			pipeline[0].$match.timestamp = {
				$gte: new Date(startDate),
			}
		} else if (endDate) {
			pipeline[0].$match.timestamp = {
				$lte: new Date(endDate),
			}
		}

		// Add date grouping based on interval
		pipeline.push({
			$addFields: {
				groupDate: {
					$dateTrunc: {
						date: '$timestamp',
						unit:
							interval === '5m'
								? 'minute'
								: interval === '15m'
									? 'minute'
									: interval === '1h'
										? 'hour'
										: interval === '1d'
											? 'day'
											: interval === '1w'
												? 'week'
												: 'hour',
						binSize: interval === '5m' ? 5 : interval === '15m' ? 15 : 1,
					},
				},
			},
		})

		pipeline.push({
			$group: {
				_id: '$groupDate',
				volume: { $sum: '$boneAmount' },
				high: { $max: '$boneAmount' },
				low: { $min: '$boneAmount' },
				open: { $first: '$boneAmount' },
				close: { $last: '$boneAmount' },
				time: { $first: '$timestamp' },
			},
		})

		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		pipeline.push(
			{ $sort: { _id: -1 } },
			{ $skip: skip },
			{ $limit: pageSize },
			{ $sort: { _id: 1 } },
			{
				$project: {
					_id: 0,
					time: '$_id',
					volume: 1,
					high: 1,
					low: 1,
					open: 1,
					close: 1,
				},
			},
		)

		const trades = await this.tokenTradesModel.aggregate(pipeline).exec()
		return trades
	}

	async findTrendingTokens(): Promise<TokenDto[]> {
		const now = new Date()
		const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

		return this.tokenTradesModel.aggregate([
			{
				$match: {
					timestamp: {
						$gte: hourAgo,
					},
				},
			},
			{
				$group: {
					_id: '$token',
					total: { $sum: '$boneAmount' },
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
				$lookup: {
					from: 'users',
					localField: 'tokenInfo.creator',
					foreignField: '_id',
					as: 'creatorInfo',
				},
			},
			{
				$unwind: '$creatorInfo',
			},
			{
				$project: {
					img: '$tokenInfo.image',
					name: '$tokenInfo.name',
					symbol: '$tokenInfo.ticker',
					description: '$tokenInfo.description',
					address: '$tokenInfo.address',
					creator: {
						address: '$creatorInfo.address',
						username: '$creatorInfo.username',
					},
					marketCap: '$tokenInfo.marketCapInBone',
					bondingCurveStatus: '$tokenInfo.bondingCurve',
					bondingCurveParams: '$tokenInfo.bondingCurveParams',
				},
			},
			{
				$sort: { total: -1 },
			},
			{
				$limit: 10,
			},
		])
	}
}
