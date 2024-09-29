import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('login')
	@ApiOperation({ summary: 'Login with wallet address and signature' })
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				address: {
					type: 'string',
					description: 'Wallet address',
					example: '0xAbb6c94E23cdA58BfB0ee135Eb974fAC4D0afcA7',
				},
				signature: {
					type: 'string',
					description: 'Signature',
					example:
						'0xc68245bb2cf6993a3ee9d14f3ebeb25e28bf207b02ea53bae9d506bb9457634306027368eb9db7ad44bec38cf1516afecbe68c6165d9e87e20d4e0309d0d8e121b',
				},
				message: {
					type: 'string',
					description: 'Message that was signed',
					example: 'Signing this message at : Wed Sep 25 2024',
				},
			},
		},
	})
	async login(
		@Body('address') address: `0x${string}`,
		@Body('signature') signature: `0x${string}`,
		@Body('message') message: string,
	) {
		return this.authService.login(address, signature, message)
	}
}
