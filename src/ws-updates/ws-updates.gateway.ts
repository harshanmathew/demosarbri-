import { UseGuards } from '@nestjs/common'
import {
	ConnectedSocket,
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets'
import { Socket as BaseSocket, Server } from 'socket.io'

interface Socket extends BaseSocket {
	user: {
		address: string
	}
}
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy'
import { getAddress } from 'viem'
import { RequireAuth, WsAuthGuard } from './ws-auth.decorator'
@WebSocketGateway({
	cors: {
		origin: '*',
		credentials: true,
	},
})
@UseGuards(WsAuthGuard)
export class WsUpdatesGateway {
	@WebSocketServer()
	server: Server

	private clients: Set<any> = new Set()

	private publicSubscribers: Set<any> = new Set()
	private tokenSubscriptions: Map<`0x${string}`, Set<any>> = new Map()
	private userSubscriptions: Map<`0x${string}`, Set<any>> = new Map()

	@RequireAuth()
	@SubscribeMessage('listenUserUpdates')
	listenUserUpdates(@ConnectedSocket() client: Socket) {
		const userAddress = getAddress(client.user.address)
		if (!this.userSubscriptions.has(userAddress)) {
			this.userSubscriptions.set(userAddress, new Set())
		}

		this.userSubscriptions.get(userAddress).add(client)
	}

	@SubscribeMessage('listenTokenUpdates')
	listenTokenUpdates(
		@ConnectedSocket() client: Socket,
		@MessageBody() tokenAddress: string,
	) {
		const listenTokenAddress = getAddress(tokenAddress)
		if (!this.tokenSubscriptions.has(listenTokenAddress)) {
			this.tokenSubscriptions.set(listenTokenAddress, new Set())
		}

		this.tokenSubscriptions.get(listenTokenAddress).add(client)
	}

	@SubscribeMessage('listenPublicUpdates')
	listenPublicUpdates(@ConnectedSocket() client: Socket) {
		this.publicSubscribers.add(client)
	}

	// Handle client connection
	handleConnection(client: Socket) {
		this.clients.add(client)
	}

	// Handle client disconnection
	handleDisconnect(client: Socket) {
		this.clients.delete(client)

		// Remove client from all subscriptions
		if (this.publicSubscribers.has(client)) {
			this.publicSubscribers.delete(client)
		}

		for (const subscribers of this.tokenSubscriptions.values()) {
			if (subscribers.has(client)) {
				subscribers.delete(client)
			}
		}

		if (
			client?.user?.address &&
			this.userSubscriptions.has(getAddress(client.user.address))
		) {
			this.userSubscriptions.get(getAddress(client.user.address)).delete(client)
		}
	}

	broadcastPublicUpdate(event: string, data: any) {
		for (const client of this.publicSubscribers) {
			client.emit(event, data)
		}
	}

	broadcastTokenUpdate(tokenAddress: string, event: string, data: any) {
		const subscribers = this.tokenSubscriptions.get(getAddress(tokenAddress))
		if (subscribers) {
			for (const client of subscribers) {
				client.emit(event, data)
			}
		}
	}

	broadcastUserUpdate(userAddress: string, event: string, data: any) {
		const subscribers = this.userSubscriptions.get(getAddress(userAddress))
		if (subscribers) {
			for (const client of subscribers) {
				client.emit(event, data)
			}
		}
	}

	// Method to emit data from anywhere in your application
	emitEvent(event: string, data: any) {
		this.server.emit(event, data)
	}
}
