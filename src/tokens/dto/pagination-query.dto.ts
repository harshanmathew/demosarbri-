import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class PaginationQueryDto {
	@ApiProperty({
		description: 'Page number',
		minimum: 1,
		default: 1,
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => Number.parseInt(value))
	page?: number

	@ApiProperty({
		description: 'Number of items per page',
		minimum: 1,
		default: 10,
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
	@Transform(({ value }) => Number.parseInt(value))
	limit?: number
}
