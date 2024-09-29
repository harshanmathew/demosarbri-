import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UsersService } from 'src/users/users.service'

export interface JwtPayload {
	address: string
	signature?: string
	message?: string
}
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly userService: UsersService,
		private readonly jwtService: JwtService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
		})
	}

	// Validate method is triggered automatically by the Passport strategy
	async validate(payload: JwtPayload) {
		const user = await this.userService.findByAddress(payload.address)
		if (!user) {
			throw new UnauthorizedException('Invalid token')
		}

		return user
	}
}
