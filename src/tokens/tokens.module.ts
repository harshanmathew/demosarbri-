import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from 'src/users/users.module'
import { Token, TokenSchema } from './schemas/token.schema'
import { TokensController } from './tokens.controller'
import { TokensService } from './tokens.service'

@Module({
	imports: [
		MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]),
		UsersModule,
	],
	controllers: [TokensController],
	providers: [TokensService],
})
export class TokensModule {}
