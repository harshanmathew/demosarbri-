import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { http, Chain, PublicClient, createPublicClient } from 'viem'
import { shibarium, shibariumTestnet } from 'viem/chains'

export const customSerializer = {
	serialize: (data: any): string => {
		return JSON.stringify(data, (_, value) =>
			typeof value === 'bigint' ? value.toString() : value,
		)
	},
	deserialize: (data: string): any => {
		return JSON.parse(data, (_, value) => {
			if (typeof value === 'string' && /^\d+n$/.test(value)) {
				return BigInt(value.slice(0, -1))
			}
			return value
		})
	},
}

@Processor('rpc-requests', {
	limiter: {
		max: 50,
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
		console.log(`Processing RPC request: ${method} with params: ${params}`)
		if (!method || !params) {
			throw new Error('Invalid job data: method or params is missing')
		}
		try {
			// @ts-ignore
			const result = await this.client[method](...params)
			console.log(`RPC request processed: ${method} with result: ${result}`)
			if (typeof result === 'bigint') {
				return result.toString()
			}
			return customSerializer.serialize(result)
		} catch (error) {
			console.error(`Error processing RPC request: ${error.message}`)
			throw error
		}
	}
}
