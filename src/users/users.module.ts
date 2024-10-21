import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
	UserActivity,
	UserActivitySchema,
} from './schemas/user-activity.schema'
import { User, UserSchema } from './schemas/user.schemas'
import { MeController } from './users.controller'
import { UsersService } from './users.service'

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: User.name, schema: UserSchema },
			{ name: UserActivity.name, schema: UserActivitySchema },
		]),
	],
	controllers: [MeController],
	providers: [UsersService],
	exports: [UsersService, MongooseModule],
})
export class UsersModule {}
