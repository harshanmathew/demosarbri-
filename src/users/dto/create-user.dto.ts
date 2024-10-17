import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

export class CreateUserDto {
	@ApiProperty({ example: 'John Doe' })
	@IsString()
	@IsOptional()
	name?: string

	@ApiProperty({ example: 'johndoe' })
	@IsString()
	@IsOptional()
	username?: string

	@ApiProperty({ example: '0x0' })
	@IsString()
	@IsNotEmpty()
	address: string

	@ApiProperty({ example: 'https://example.com/profile-image.png' })
	@IsUrl()
	@IsOptional()
	profileImage?: string
}
