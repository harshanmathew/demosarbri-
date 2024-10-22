import { Injectable } from '@nestjs/common'
import { CreateWsUpdateDto } from './dto/create-ws-update.dto'
import { UpdateWsUpdateDto } from './dto/update-ws-update.dto'

@Injectable()
export class WsUpdatesService {
	create(createWsUpdateDto: CreateWsUpdateDto) {
		return 'This action adds a new wsUpdate'
	}

	findAll() {
		return 'This action returns all wsUpdates'
	}

	findOne(id: number) {
		return 'This action returns a #${id} wsUpdate'
	}

	update(id: number, updateWsUpdateDto: UpdateWsUpdateDto) {
		return 'This action updates a #${id} wsUpdate'
	}

	remove(id: number) {
		return 'This action removes a #${id} wsUpdate'
	}
}
