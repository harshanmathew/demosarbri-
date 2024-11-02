import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class UpdateTokenDto {
	@ApiProperty({
		example: 'This is a revolutionary new token for awesome people.',
	})
	@IsString()
	description: string

	@ApiProperty({ example: 'https://example.com/token-image.png' })
	@IsString()
	image: string

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
