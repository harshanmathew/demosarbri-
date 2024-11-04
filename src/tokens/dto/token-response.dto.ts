import { ApiProperty } from '@nestjs/swagger'
import { Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'
import { Token } from '../schemas/token.schema'

export class UserDto {
	@ApiProperty()
	address: string

	@ApiProperty()
	username?: string

	@ApiProperty()
	profileImage?: string
}

export class TokenHoldersDto {
	@ApiProperty()
	token: string

	@ApiProperty()
	holder: UserDto

	@ApiProperty()
	balance: number

	@ApiProperty()
	balanceInBig: string
}

export class TokenHoldersResponseDto {
	@ApiProperty({ type: [TokenHoldersDto] })
	holders: TokenHoldersDto[]

	@ApiProperty()
	totalPages: number

	@ApiProperty()
	currentPage: number
}

export class TokenTradesDto {
	@ApiProperty()
	token: string

	@ApiProperty()
	trader: UserDto

	@ApiProperty()
	boneAmount: number

	@ApiProperty()
	tokenAmount: number

	@ApiProperty()
	type: string

	@ApiProperty()
	timestamp: Date

	@ApiProperty()
	txHash: string
}

export class TokenTradesResponseDto {
	@ApiProperty({ type: [TokenTradesDto] })
	trades: TokenTradesDto[]

	@ApiProperty()
	totalPages: number

	@ApiProperty()
	currentPage: number
}

export class BondingCurveParamsDto {
	@ApiProperty()
	k: string

	@ApiProperty()
	x1: string

	@ApiProperty()
	y1: string

	@ApiProperty()
	x0: string

	@ApiProperty()
	y0: string

	@ApiProperty()
	virtualX: string

	@ApiProperty()
	virtualY: string
}

export class TokenWithVolumeDto {
	@ApiProperty({ type: String })
	_id: Types.ObjectId

	@ApiProperty({ type: String })
	name: string

	@ApiProperty({ type: String })
	ticker: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	description: string

	@ApiProperty({ type: String })
	image: string

	@ApiProperty({ type: String })
	tokenSupply: string

	@ApiProperty({ type: Number })
	initialBuyAmount: number

	@ApiProperty({ enum: ['beginner', 'pro'] })
	bondingCurve: 'beginner' | 'pro'

	@ApiProperty({ type: String })
	twitterLink: string

	@ApiProperty({ type: String })
	telegramLink: string

	@ApiProperty({ type: String })
	websiteLink: string

	@ApiProperty({ enum: ['yes', 'no'] })
	donate: 'yes' | 'no'

	@ApiProperty({ type: UserDto })
	creator: UserDto

	@ApiProperty({ type: String })
	transactionHash: string

	@ApiProperty({ type: Number })
	marketCapInBone: number

	@ApiProperty({ type: Number })
	totalRaisedInBone: number

	@ApiProperty({ type: Number })
	tokenPriceInBone: number

	@ApiProperty({ type: String })
	pairAddress: string

	@ApiProperty({ type: Boolean })
	launched: boolean

	@ApiProperty({ type: Boolean })
	graduated: boolean

	@ApiProperty({ type: Number })
	volume24: number

	@ApiProperty({ type: BondingCurveParamsDto })
	bondingCurveParams: BondingCurveParamsDto
}

export class ChartResponseDto {
	@ApiProperty()
	time: Date

	@ApiProperty()
	volume: number

	@ApiProperty()
	high: number

	@ApiProperty()
	low: number

	@ApiProperty()
	open: number

	@ApiProperty()
	close: number
}

export class TokenActivityDto {
	@ApiProperty({ type: String })
	name: string

	@ApiProperty({ type: String })
	ticker: string

	@ApiProperty({ type: String })
	image: string

	@ApiProperty({ type: String })
	address: string
}

export class UserActivityDto {
	@ApiProperty({ type: String })
	username?: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	profileImage?: string
}

export class LatestActivityDto {
	@ApiProperty({ type: TokenActivityDto })
	token: TokenActivityDto

	@ApiProperty({ type: UserActivityDto })
	user: UserActivityDto

	@ApiProperty({ enum: ['buy', 'sell'] })
	type: 'buy' | 'sell'

	@ApiProperty({ type: Number })
	boneAmount: number

	@ApiProperty({ type: Number })
	tokenAmount: number
}
