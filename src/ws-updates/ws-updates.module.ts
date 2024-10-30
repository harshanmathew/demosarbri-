import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { WsUpdatesGateway } from './ws-updates.gateway'

@Module({
	imports: [
		JwtModule.register({
			secret: process.env.JWT_SECRET || 'your-secret-key',
			signOptions: { expiresIn: '1d' },
		}),
	],
	providers: [WsUpdatesGateway],
	exports: [WsUpdatesGateway],
})
export class WsUpdatesModule {}
