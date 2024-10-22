import { PartialType } from '@nestjs/mapped-types'
import { CreateWsUpdateDto } from './create-ws-update.dto'

export class UpdateWsUpdateDto extends PartialType(CreateWsUpdateDto) {
	id: number
}
