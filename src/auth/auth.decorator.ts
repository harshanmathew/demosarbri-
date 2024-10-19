import { UseGuards, applyDecorators } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

export function Auth() {
	return applyDecorators(ApiBearerAuth(), UseGuards(JwtAuthGuard))
}
