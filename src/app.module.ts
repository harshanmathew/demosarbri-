import { BullModule } from '@nestjs/bullmq'
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { BullConfigService } from './bull-config.service'
import { DatabaseModule } from './database/database.module'
import { MongoExceptionFilter } from './filters/mongo-exception.filter'
import { RequestLoggingMiddleware } from './filters/request-logging-middleware'
import { TokensModule } from './tokens/tokens.module'
import { UploadsModule } from './uploads/uploads.module'
import { UsersModule } from './users/users.module'
import { WatcherModule } from './watcher/watcher.module'
import { WsUpdatesModule } from './ws-updates/ws-updates.module'
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
		WatcherModule,
		WsUpdatesModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: 'APP_FILTER',
			useClass: MongoExceptionFilter,
		},
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer.apply(RequestLoggingMiddleware).forRoutes('*')
	}
}
