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

	async findOne(id: string, user: User): Promise<Token> {
		const token = await this.tokenModel
			.findOne({ _id: id, creator: user._id })
			.exec()
		if (!token) {
			throw new NotFoundException(`Token with ID "${id}" not found`)
		}
		return token
	}

	async launch(id: string, user: User): Promise<Token> {
		const token = await this.findOne(id, user)
		if (token.launched) {
			throw new ForbiddenException('Token is already launched')
		}
		token.launched = true
		await this.tokenModel.findByIdAndUpdate(token._id, { launched: true })
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

		const query = this.tokenModel.find({ launched: true })

		// Apply search filter
		if (search) {
			query.find({
				name: { $regex: search, $options: 'i' },
			})
		}

		// Apply additional filters
		if (filter) {
			query.find(filter)
		}

		// Apply sorting
		if (sort) {
			query.sort(sort)
		} else {
			query.sort({ createdAt: -1 }) // Default sorting
		}

		// Apply pagination
		const currentPage = Math.max(1, page)
		const pageSize = Math.max(1, limit)
		const skip = (currentPage - 1) * pageSize

		query.skip(skip).limit(pageSize)

		// Execute query and get total count
		const [tokens, total] = await Promise.all([
			query.exec(),
			this.tokenModel.countDocuments({ launched: true }),
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
}
