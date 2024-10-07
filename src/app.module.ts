import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { DatabaseModule } from './database/database.module'
import { MongoExceptionFilter } from './filters/mongo-exception.filter'
import { UploadsModule } from './uploads/uploads.module'
import { UsersModule } from './users/users.module'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		DatabaseModule,
		UsersModule,
		AuthModule,
		UploadsModule,
	],
	providers: [
		AppService,
		{
			provide: 'APP_FILTER',
			useClass: MongoExceptionFilter,
		},
	],
})
export class AppModule {}
