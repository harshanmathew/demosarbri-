import { BadRequestException, Injectable } from '@nestjs/common'
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
		//avoid this
		const addressFromSignature = await this.getSigner(message, signature)
		console.log('signature: ', addressFromSignature)
		const result = await client.verifyMessage({
			address,
			signature,
			message,
		})
		return { result, addressFromSignature }
	}

	async validateTimeStamp(message: string): Promise<boolean> {
		// Update regex to match ISO 8601 format, including the 'Z' at the end
		const timestampRegex =
			/Signing this message at : (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)/
		const match = message.match(timestampRegex)

		if (!match || !match[1]) {
			throw new BadRequestException(
				'Invalid message format. Timestamp is missing or malformed.',
			)
		}

		const timestampString = match[1]
		const timestamp = new Date(timestampString)

		// Check if the timestamp is within 15 minutes
		const currentTime = new Date()
		const timeDiffInMinutes =
			(currentTime.getTime() - timestamp.getTime()) / (1000 * 60)

		if (timeDiffInMinutes > 15) {
			throw new BadRequestException(
				'The message timestamp is older than 15 minutes.',
			)
		}

		return true
	}

	/**
	 * Handles user login via signature
	 * @param address The Ethereum address signing the message
	 * @param signature The signature of the message
	 * @param message The message signed by the user
	 * @returns An object with { accessToken, isValid } if the signature is valid, or { isValid, error, addressFromSignature } if the signature is invalid
	 */
	async login(
		address: `0x${string}`,
		signature: `0x${string}`,
		message: string,
	) {
		try {
			const isValid = await this.validateSignature(address, signature, message)
			await this.validateTimeStamp(message)
			if (isValid.result) {
				let user = await this.usersService.findByAddress(address)
				console.log('user', user)
				if (!user) {
					user = await this.usersService.create({
						address,
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
