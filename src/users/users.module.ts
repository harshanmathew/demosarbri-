import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
	TokenHolders,
	TokenHoldersSchema,
} from 'src/tokens/schemas/token-holders.schema'
import { Token, TokenSchema } from 'src/tokens/schemas/token.schema'
import {
	UserActivity,
	UserActivitySchema,
} from './schemas/user-activity.schema'
import { User, UserSchema } from './schemas/user.schemas'
import { UsersController } from './user-profile'
import { MeController } from './users.controller'
import { UsersService } from './users.service'

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: User.name, schema: UserSchema },
			{ name: UserActivity.name, schema: UserActivitySchema },
			{ name: Token.name, schema: TokenSchema },
			{ name: TokenHolders.name, schema: TokenHoldersSchema },
		]),
	],
	controllers: [MeController, UsersController],
	providers: [UsersService],
	exports: [UsersService, MongooseModule],
})
export class UsersModule {}
