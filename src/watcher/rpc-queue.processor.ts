import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'
import { customSerializer } from 'src/utils/custom-serializer'
import { http, Chain, PublicClient, createPublicClient } from 'viem'
import { shibarium, shibariumTestnet } from 'viem/chains'

const RPC_API_KEY = [
	// 'xZ7u0tWn6nakiH0bmDIyl4zRDNZzfxrXar3qTOpi',
	// 'jRK8FEJoKm8QBSmkURK1K56ZcdzBz0Cx7eyQPl6g',
	// 'SOcTlTr6t99BGEFT2ukVda9XlOgIjX787f7Vq7K5',
	// 'yggXYuZfQJ2v1FNROXo4b66sxwZKKOCI3sFy2K5I',
	// '0BDXNcUajJ42QNAScNDZ1kmLM1gmb1C22s6KR3F2',
	// 'isF0YD1gbZdQGdoirWF46Cs5icWN7jp14fqBlVbe',
	// 'T5Rxu2Oat31gjBlTQk1nN2Uj3lfbYUxraRwq4IAZ',
	// '9iL3UFp77N9xMXUnlWY0y8w1xAPmLooy3K9fDkKv',
	// 'RNl68kgSm77w0g81xWksgd8Mby0wWWdSnAOWRh10',
	// 'C604435KCD4AaSuiM04ie1vVqxJvjLTm5IFE54z4',
	// 'g4IdgqRWrz1kOKUTS0VshlsCD5SKid1aqUraV3Dc',
	// 'saA74oPT9a7G25u37oJgE9E7mdQ21y3x93pPZF36',
	// '8osaAj90yV38KnJgVkPyQ41mVHNbjs2y8C5q4ZoB',
	// 'HDP7hG9SAK4LIHwb7LnAn35Rs2T5EGgs8gx0GnZV',
	// 'OzVBmpvejn1MxffJhucCp210fmfAYlPpCmmavqT0',
	'lNSt3ZSjzU9E0gPFAaeki2qHCrsfWWMU6YIlEhmS',
	'Rdz5FM7EeG3aBmNT8GDXA78kyHn5s10D8ZconFrM',
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
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)}`,
			)
			throw new Error(
				`Error processing RPC request: ${error.message} with \n method: ${method} \n params: ${JSON.stringify(params)}`,
			)
		}
	}
}
