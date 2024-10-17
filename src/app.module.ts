import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { BullConfigService } from './bull-config.service'
import { DatabaseModule } from './database/database.module'
import { MongoExceptionFilter } from './filters/mongo-exception.filter'
import { TokensModule } from './tokens/tokens.module'
import { UploadsModule } from './uploads/uploads.module'
import { UsersModule } from './users/users.module'
import { WatcherModule } from './watcher/watcher.module'
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		BullModule.forRootAsync({
			useClass: BullConfigService,
		}),
		ScheduleModule.forRoot(),
		DatabaseModule,
		UsersModule,
		AuthModule,
		UploadsModule,
		TokensModule,
		// WatcherModule,
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
