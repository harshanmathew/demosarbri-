import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { customSerializer } from 'src/utils/custom-serializer'
import { http, Chain, PublicClient, createPublicClient } from 'viem'
import { shibarium, shibariumTestnet } from 'viem/chains'

@Processor('rpc-requests', {
	limiter: {
		max: 45,
		duration: 1000,
	},
})
export class RpcRequestProcessor extends WorkerHost {
	private client: PublicClient

	constructor(private readonly configService: ConfigService) {
		super()
		let chain: Chain = shibariumTestnet
		if (this.configService.get<string>('CHAIN') === 'mainnet') {
			chain = shibarium
		}

		this.client = createPublicClient({
			chain,
			transport: http(configService.get<string>('RPC_URL')),
		}) as any
	}

	async process(job: Job<{ method: string; params: any[] }>): Promise<any> {
		const { method, params } = job.data
		if (!method || !params) {
			throw new Error('Invalid job data: method or params is missing')
		}
		try {
			// @ts-ignore
			const result = await this.client[method](...params)
			if (typeof result === 'bigint') {
				return result.toString()
			}
			return customSerializer.serialize(result)
		} catch (error) {
			console.error(
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)}`,
			)
			throw new Error(
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)}`,
			)
		}
	}
}
