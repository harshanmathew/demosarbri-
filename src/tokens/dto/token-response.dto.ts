import { ApiProperty } from '@nestjs/swagger'

class UserDto {
	@ApiProperty()
	address: string

	@ApiProperty()
	username: string

	@ApiProperty()
	profileImage: string
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
