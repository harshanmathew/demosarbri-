import {
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'
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
}
