import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

export class CreateUserDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsString()
	@IsOptional()
	username?: string

	@IsString()
	@IsNotEmpty()
	address: string

	@IsUrl()
	@IsOptional()
	profileImage?: string
}
