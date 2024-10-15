import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
	IsBoolean,
	IsEnum,
	IsNumber,
	IsOptional,
	IsString,
} from 'class-validator'

export class CreateTokenDto {
	@ApiProperty({ example: 'My Awesome Token' })
	@IsString()
	name: string

	@ApiProperty({ example: 'MAT' })
	@IsString()
	ticker: string

	@ApiProperty({
		example: 'This is a revolutionary new token for awesome people.',
	})
	@IsString()
	description: string

	@ApiProperty({ example: 'https://example.com/token-image.png' })
	@IsString()
	image: string

	@ApiProperty({ example: 1000000 })
	@IsNumber()
	tokenSupply: number

	@ApiPropertyOptional({ example: 1000 })
	@IsNumber()
	@IsOptional()
	initialBuyAmount?: number

	@ApiProperty({ enum: ['beginner', 'pro'], example: 'beginner' })
	@IsEnum(['beginner', 'pro'])
	bondingCurve: 'beginner' | 'pro'

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

	@ApiPropertyOptional({ example: 'yes' })
	@IsEnum(['yes', 'no'])
	@IsOptional()
	donate?: 'yes' | 'no'

	@ApiPropertyOptional({ example: false })
	@IsBoolean()
	@IsOptional()
	launched?: boolean
}
