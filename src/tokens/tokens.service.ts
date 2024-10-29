import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'
import { RecentlyLaunchedQueryDto } from 'src/ws-updates/dto/recently-launched-query.dto'
import { TokenDto } from 'src/ws-updates/dto/recently-launched-response.dto'
import { getAddress } from 'viem'
import { CreateTokenDto } from './dto/create-token.dto'
import { Token, TokenDocument } from './schemas/token.schema'

@Injectable()
export class TokensService {
	constructor(
		@InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
	) {}

	async create(createTokenDto: CreateTokenDto, user: User): Promise<Token> {
		const createdToken = new this.tokenModel({
			...createTokenDto,
			creator: user._id,
			launched: false,
		})

		return createdToken.save()
	}

	async findAll(user: User): Promise<Token[]> {
		return this.tokenModel.find({ creator: user._id }).exec()
	}

	async findOne(address: string): Promise<Token> {
		const token = await this.tokenModel
			.findOne({ address: getAddress(address) })
			.exec()
		if (!token) {
			throw new NotFoundException(`Token with Address: "${address}" not found`)
		}
		return token
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
}
