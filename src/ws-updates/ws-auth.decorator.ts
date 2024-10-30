import { SetMetadata } from '@nestjs/common'

export const REQUIRE_AUTH_KEY = 'requireAuth'
export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_KEY, true)

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { WsException } from '@nestjs/websockets'
import { Observable } from 'rxjs'

@Injectable()
export class WsAuthGuard implements CanActivate {
	constructor(
		private jwtService: JwtService,
		private reflector: Reflector,
	) {}

	canActivate(
		context: ExecutionContext,
	): boolean | Promise<boolean> | Observable<boolean> {
		// Check if the handler requires authentication
		const requireAuth = this.reflector.get<boolean>(
			REQUIRE_AUTH_KEY,
			context.getHandler(),
		)

		// If the event doesn't require auth, allow access
		if (!requireAuth) {
			return true
		}

		const client = context.switchToWs().getClient()
		const authToken = client.handshake.auth.token

		if (!authToken) {
			throw new WsException('Authentication token not provided')
		}

		try {
			const decoded = this.jwtService.verify(authToken)
			// Attach user to socket
			client.user = decoded
			return true
		} catch (err) {
			throw new WsException('Invalid token')
		}
	}
}
