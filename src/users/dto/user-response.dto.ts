import { ApiProperty } from '@nestjs/swagger'

export class HoldingsDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	name: string

	@ApiProperty({ type: String })
	ticker: string

	@ApiProperty({ type: String })
	image: string

	@ApiProperty({ type: Number })
	marketCapInBone: number

	@ApiProperty({ type: Number })
	tokenPriceInBone: number

	@ApiProperty({ type: Number })
	bondingCurvePercentage: number

	@ApiProperty({ type: Number })
	balance: number
}

export class HoldingsResponseDto {
	@ApiProperty({ type: [HoldingsDto] })
	holdings: HoldingsDto[]

	@ApiProperty({ type: Number })
	total: number

	@ApiProperty({ type: Number })
	currentPage: number
}

export class UserStatsDto {
	@ApiProperty({ type: Number })
	totalTokensHeld: number

	@ApiProperty({ type: Number })
	totalBonesInvested: number

	@ApiProperty({ type: Number })
	tokensCreated: number

	@ApiProperty({ type: Number })
	graduatedTokensCreated: number
}

export class NetWorthDto {
	@ApiProperty({ type: Number })
	totalNetWorthInBone: number

	@ApiProperty({ type: Number })
	graduatedTokensValue: number

	@ApiProperty({ type: Number })
	nonGraduatedTokensValue: number
}

export class UserStatResponseDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	username: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	profileImage: string

	@ApiProperty({ type: UserStatsDto })
	stats: UserStatsDto

	@ApiProperty({ type: NetWorthDto })
	netWorth?: NetWorthDto
}

export class UserCreatedTokensDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	name: string

	@ApiProperty({ type: String })
	ticker: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	image: string

	@ApiProperty({ type: Number })
	bondingCurvePercentage: number

	@ApiProperty({ type: Number })
	transactionCount: number

	@ApiProperty({ type: Number })
	holdersCount: number
}

export class UserCreatedTokensResponseDto {
	@ApiProperty({ type: [UserCreatedTokensDto] })
	tokens: UserCreatedTokensDto[]

	@ApiProperty({ type: Number })
	total: number

	@ApiProperty({ type: Number })
	currentPage: number
}

export class TokenDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	name: string

	@ApiProperty({ type: String })
	ticker: string

	@ApiProperty({ type: String })
	image: string
}

export class UserDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	username: string

	@ApiProperty({ type: String })
	address: string

	@ApiProperty({ type: String })
	profileImage: string
}

export class UserTradeDto {
	@ApiProperty({ type: String })
	id: string

	@ApiProperty({ type: String })
	type: string

	@ApiProperty({ type: Number })
	boneAmount: number

	@ApiProperty({ type: Number })
	tokenAmount: number

	@ApiProperty({ type: TokenDto })
	token: TokenDto

	@ApiProperty({ type: Date })
	timestamp: Date

	@ApiProperty({ type: UserDto })
	user?: UserDto
}

export class UserTradesResponseDto {
	@ApiProperty({ type: [UserTradeDto] })
	trades: UserTradeDto[]

	@ApiProperty({ type: Number })
	total: number

	@ApiProperty({ type: Number })
	currentPage: number
}
