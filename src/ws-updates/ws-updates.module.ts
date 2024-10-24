import { Module } from '@nestjs/common'
import { WsUpdatesGateway } from './ws-updates.gateway'

@Module({
	providers: [WsUpdatesGateway],
	exports: [WsUpdatesGateway],
})
export class WsUpdatesModule {}
