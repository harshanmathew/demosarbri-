import { IsNumber, IsOptional, IsString } from 'class-validator'

export class CreateTokenDto {
	@IsString()
	name: string

	@IsString()
	@IsOptional()
	ticker?: string

	@IsString()
	@IsOptional()
	description?: string

	@IsNumber()
	@IsOptional()
	tokenSupply?: number

	@IsNumber()
	@IsOptional()
	initialBuyAmount?: number

	@IsString()
	@IsOptional()
	twitterLink?: string

	@IsString()
	@IsOptional()
	telegramLink?: string

	@IsString()
	@IsOptional()
	websiteLink?: string
}
