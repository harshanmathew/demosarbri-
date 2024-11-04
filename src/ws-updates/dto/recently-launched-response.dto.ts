import { ApiProperty } from '@nestjs/swagger'
import { BondingCurveParamsDto } from 'src/tokens/dto/token-response.dto'

class CreatorDto {
	@ApiProperty()
	address: string

	@ApiProperty()
	username: string
}

export class TokenDto {
	@ApiProperty()
	img: string

	@ApiProperty()
	name: string

	@ApiProperty()
	symbol: string

	@ApiProperty()
	description: string

	@ApiProperty()
	address: string

	@ApiProperty()
	creator: CreatorDto

	@ApiProperty()
	marketCap: number

	@ApiProperty()
	bondingCurveStatus: string

	@ApiProperty()
	bondingCurveParams: BondingCurveParamsDto
}

export class RecentlyLaunchedResponseDto {
	@ApiProperty({ type: [TokenDto] })
	tokens: TokenDto[]

	@ApiProperty()
	totalPages: number

	@ApiProperty()
	currentPage: number
}
