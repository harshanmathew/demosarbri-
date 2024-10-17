import { Body, Controller, Post } from '@nestjs/common'
import {
	ApiBody,
	ApiOperation,
	ApiProperty,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { getAddress } from 'viem'
import { AuthService } from './auth.service'

class LoginResponse {
	@ApiProperty({ example: true })
	isValid: boolean

	@ApiProperty({
		example:
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI...',
	})
	accessToken?: string

	@ApiProperty({ example: 'Invalid signature' })
	error?: string

	@ApiProperty({ example: '0xAbb6c94E23cdA58BfB0ee135Eb974fAC4D0afcA7' })
	addressFromSignature?: `0x${string}`
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	@ApiOperation({ summary: 'Login with wallet address and signature' })
	@ApiResponse({ type: LoginResponse })
	async login(
		@Body('address') address: `0x${string}`,
		@Body('signature') signature: `0x${string}`,
		@Body('message') message: string,
	) {
		const stdAddress = getAddress(address)
		return this.authService.login(stdAddress, signature, message)
	}
}
