// import { PartialType } from '@nestjs/mapped-types'
import { CreateTokenDto } from './create-token.dto'

// export class UpdateTokenDto extends PartialType(CreateTokenDto) {}
export class UpdateTokenDto extends CreateTokenDto {}
