import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { sha256base64 } from 'ohash'
import { isEmpty } from 'radash'
import { UsersService } from 'src/users/users.service'
import {
	http,
	SignableMessage,
	createPublicClient,
	hashMessage,
	recoverMessageAddress,
} from 'viem'
import { polygon } from 'viem/chains'

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
	) {}

	async getSigner(message: SignableMessage, signature: any) {
		const messageHash = hashMessage(message)
		const signerAddress = await recoverMessageAddress({
			message: { raw: messageHash },
			signature,
		})
		return signerAddress
	}

	async validateSignature(
		address: `0x${string}`,
		signature: `0x${string}`,
		message: string,
	): Promise<any> {
		const client = createPublicClient({
			chain: polygon,
			transport: http(),
		})
		const addressFromSignature = await this.getSigner(message, signature)
		console.log('signature: ', addressFromSignature)
		const result = await client.verifyMessage({
			address,
			signature,
			message,
		})
		return { result, addressFromSignature }
	}

	async login(
		address: `0x${string}`,
		signature: `0x${string}`,
		message: string,
	) {
		try {
			const isValid = await this.validateSignature(address, signature, message)
			console.log('isValid', isValid)
			if (isValid.result) {
				let user = await this.usersService.findByAddress(address)
				console.log('user', user)
				if (!user) {
					user = await this.usersService.create({
						address,
						signature,
						message,
					})
				}
				const payload = {
					address: user.address,
					id: user.id,
				}
				return {
					accessToken: this.jwtService.sign(payload),
					isValid: true,
				}
			}
			return {
				isValid: false,
				error: 'Invalid signature',
				addressFromSignature: isValid.addressFromSignature,
			}
		} catch (error) {
			return { isValid: false, error: error.message }
		}
	}

	async verifyToken(token: string) {
		return this.jwtService.verify(token)
	}
}
