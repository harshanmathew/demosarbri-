import {
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
} from '@nestjs/websockets'
import { CreateWsUpdateDto } from './dto/create-ws-update.dto'
import { UpdateWsUpdateDto } from './dto/update-ws-update.dto'
import { WsUpdatesService } from './ws-updates.service'

@WebSocketGateway({
	cors: {
		origin: '*',
	},
})
export class WsUpdatesGateway {
	constructor(private readonly wsUpdatesService: WsUpdatesService) {}

	@SubscribeMessage('createWsUpdate')
	create(@MessageBody() createWsUpdateDto: CreateWsUpdateDto) {
		return this.wsUpdatesService.create(createWsUpdateDto)
	}

	@SubscribeMessage('findAllWsUpdates')
	findAll() {
		return this.wsUpdatesService.findAll()
	}

	@SubscribeMessage('findOneWsUpdate')
	findOne(@MessageBody() id: number) {
		return this.wsUpdatesService.findOne(id)
	}

	@SubscribeMessage('updateWsUpdate')
	update(@MessageBody() updateWsUpdateDto: UpdateWsUpdateDto) {
		return this.wsUpdatesService.update(updateWsUpdateDto.id, updateWsUpdateDto)
	}

	@SubscribeMessage('removeWsUpdate')
	remove(@MessageBody() id: number) {
		return this.wsUpdatesService.remove(id)
	}
}
