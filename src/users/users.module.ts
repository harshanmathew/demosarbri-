import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { User, UserSchema } from './entities/user.entity'
import { MeController } from './users.controller'
import { UsersService } from './users.service'

@Module({
	imports: [
		MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
	],
	controllers: [MeController],
	providers: [UsersService],
	exports: [UsersService, MongooseModule],
})
export class UsersModule {}
