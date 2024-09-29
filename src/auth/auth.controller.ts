import { Body, Controller, Post } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'

@ApiTags('auth')
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
					example: '0xc68245bb...',
				},
				message: {
					type: 'string',
					description: 'Message that was signed',
					example: 'Signing this message at : Wed Sep 25 2024',
				},
				referralCode: {
					type: 'string',
					description: 'Optional referral code',
					example: 'REF123',
					nullable: true,
				},
			},
		},
	})
	async login(
		@Body('address') address: `0x${string}`,
		@Body('signature') signature: `0x${string}`,
		@Body('message') message: string,
		@Body('referralCode') referralCode?: string,
	) {
		return this.authService.login(address, signature, message, referralCode)
	}
}
