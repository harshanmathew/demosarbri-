import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { customSerializer } from 'src/utils/custom-serializer'
import { http, Chain, PublicClient, createPublicClient } from 'viem'
import { shibarium, shibariumTestnet } from 'viem/chains'

const RPC_API_KEY = [
	// 'Ivjsoo37oa84RwN66ZYbX8Og9ptOHmXo2eXcJgUa',
	// '2VID5SVu3O9l7RTivlhM583DnNF1UU481UUs2Lke',
	// 'yrAmz2hZxa7HhtKb8lXox85UYTAEOifC97qSdQEi',
	// 'steAryWL7a33OTJTk4s847hE85cyWnn5qbgLSec8',
	// '2WnfQrNEyq2SF6TFwwFsW3SYkrGiZ0Sq6FR8IcIG',
	'KC4nViyBhU8LGRo0dMDHZ9Y9B0JPlNE6MxNJc4Hf',
	'3esbQOZRvy8rgJRLFsJ2hEFae9JEGWf9y8h4d6D9',
	'x0fSgYdfJ519vNWPq8xT590cfiKivxW27T8QGzFP',
	'UO39Mg2Nrm82hF4jlyjqS7tyxD9lAcph3dm2CmrF',
	'6V4SGW84FN43k0QYdSaT2p8QhynV6FJ5Iq8HQi7h',
]
@Processor('rpc-requests', {
	limiter: {
		max: 45,
		duration: 1000,
	},
	concurrency: 40,
})
export class RpcRequestProcessor extends WorkerHost {
	private clients: PublicClient[] = []
	private currentClientIndex = 0

	constructor(private readonly configService: ConfigService) {
		super()
		// biome-ignore lint/complexity/noForEach: <explanation>
		RPC_API_KEY.forEach(apiKey => {
			let chain: Chain = shibariumTestnet
			let rpcUrl = `https://api.shibrpc.com/puppynet/${apiKey}`
			if (this.configService.get<string>('CHAIN') === 'mainnet') {
				chain = shibarium
				rpcUrl = `https://api.shibrpc.com/shibarium/${apiKey}`
			}
			this.clients.push(
				createPublicClient({
					chain,
					transport: http(rpcUrl),
				}) as any,
			)
		})
	}

	async process(job: Job<{ method: string; params: any[] }>): Promise<any> {
		// End of temporary fix
		const { method, params } = job.data
		const client = this.clients[this.currentClientIndex]
		this.currentClientIndex =
			(this.currentClientIndex + 1) % this.clients.length
		if (!method || !params) {
			throw new Error('Invalid job data: method or params is missing')
		}
		try {
			const result = await client[method](...params)

			if (typeof result === 'bigint') {
				return result.toString()
			}
			return customSerializer.serialize(result)
		} catch (error) {
			console.error(
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)} \n ApiKey: ${RPC_API_KEY[this.currentClientIndex]}`,
			)
			throw new Error(
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)}`,
			)
		}
	}
}
