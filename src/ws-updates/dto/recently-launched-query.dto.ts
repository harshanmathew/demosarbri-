import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class RecentlyLaunchedQueryDto {
	@ApiProperty({
		description: 'Page number',
		minimum: 1,
		default: 1,
		required: false,
	})
	@IsOptional()
	@IsNumber()
	@Min(1)
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
	limit?: number

	@ApiProperty({
		description: 'Search by token name',
		required: false,
	})
	@IsOptional()
	@IsString()
	search?: string

	@ApiProperty({
		description: 'Sort criteria',
		required: false,
		example: '{"marketCapInBone":-1}',
	})
	@IsOptional()
	sort?: any

	@ApiProperty({
		description: 'Filter criteria',
		required: false,
		example: '{"bondingCurve":"beginner"}',
	})
	@IsOptional()
	filter?: any
}
