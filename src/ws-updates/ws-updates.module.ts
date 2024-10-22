import { Module } from '@nestjs/common'
import { WsUpdatesGateway } from './ws-updates.gateway'
import { WsUpdatesService } from './ws-updates.service'

@Module({
	providers: [WsUpdatesGateway, WsUpdatesService],
})
export class WsUpdatesModule {}
