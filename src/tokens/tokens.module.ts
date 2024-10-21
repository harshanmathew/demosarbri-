import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { UsersModule } from 'src/users/users.module'
import {
	TokenHolders,
	TokenHoldersSchema,
} from './schemas/token-holders.schema'
import { TokenTrades, TokenTradesSchema } from './schemas/token-trade.schema'
import { Token, TokenSchema } from './schemas/token.schema'
import { TokensController } from './tokens.controller'
import { TokensService } from './tokens.service'

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: Token.name, schema: TokenSchema },
			{ name: TokenHolders.name, schema: TokenHoldersSchema },
			{ name: TokenTrades.name, schema: TokenTradesSchema },
		]),
		UsersModule,
	],
	controllers: [TokensController],
	providers: [TokensService],
})
export class TokensModule {}
