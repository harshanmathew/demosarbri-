import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString, IsUrl } from 'class-validator'

export class UpdateUserDto {
	@ApiProperty({ example: 'John Doe' })
	@IsString()
	@IsOptional()
	name?: string

	@ApiProperty({ example: 'johndoe' })
	@IsString()
	@IsOptional()
	username?: string

	@ApiProperty({ example: 'https://example.com/profile-image.png' })
	@IsUrl()
	@IsOptional()
	profileImage?: string
}
