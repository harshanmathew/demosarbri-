import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator'

export class CreateUserDto {
	@IsString()
	@IsOptional()
	name?: string

	@IsString()
	@IsNotEmpty()
	address: string

	@IsString()
	@IsOptional()
	message?: string

	@IsString()
	@IsOptional()
	signature?: string

	@IsUrl()
	@IsOptional()
	profileImage?: string
}
