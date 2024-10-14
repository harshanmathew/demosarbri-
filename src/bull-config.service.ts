import { SharedBullConfigurationFactory } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
	constructor(private readonly configService: ConfigService) {}
	createSharedConfiguration() {
		return {
			connection: {
				host: this.configService.get('REDIS_HOST'),
				port: this.configService.get('REDIS_PORT'),

				password: this.configService.get('REDIS_PASSWORD'),
				db: this.configService.get('REDIS_DB'),
			},
		}
	}
}
