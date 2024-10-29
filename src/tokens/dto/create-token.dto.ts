import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator'

export class CreateTokenDto {
	@ApiProperty({
		example: 'This is a revolutionary new token for awesome people.',
	})
	@IsString()
	description: string

	@ApiProperty({ example: '0x0' })
	@IsString()
	transactionHash: string

	@ApiProperty({ example: 'https://example.com/token-image.png' })
	@IsString()
	image: string

	@ApiPropertyOptional({ example: 1000 })
	@IsNumber()
	@IsOptional()
	initialBuyAmount?: number

	@ApiPropertyOptional({ example: 'https://twitter.com/myawesometoken' })
	@IsString()
	@IsOptional()
	twitterLink?: string

	@ApiPropertyOptional({ example: 'https://t.me/myawesometoken' })
	@IsString()
	@IsOptional()
	telegramLink?: string

	@ApiPropertyOptional({ example: 'https://myawesometoken.com' })
	@IsString()
	@IsOptional()
	websiteLink?: string
}
