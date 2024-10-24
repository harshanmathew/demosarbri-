import {
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class WsUpdatesGateway {
	@WebSocketServer()
	server: Server

	// Handle client connection
	handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`)
	}

	// Handle client disconnection
	handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`)
	}

	// Method to emit data from anywhere in your application
	emitEvent(event: string, data: any) {
		this.server.emit(event, data)
	}
}
