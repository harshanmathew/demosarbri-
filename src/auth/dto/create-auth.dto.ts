import { IsNotEmpty, IsString } from 'class-validator'

export class CreateAuthDto {
	@IsString()
	@IsNotEmpty()
	address: string

	@IsString()
	@IsNotEmpty()
	signature: string

	@IsString()
	@IsNotEmpty()
	message: string
}
