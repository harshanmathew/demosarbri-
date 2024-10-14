import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Queue, QueueEvents } from 'bullmq'
import { Model } from 'mongoose'
import { SyncDetailsDocument } from './schema/sync-details.schema'

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

@Injectable()
export class EventWatcherService implements OnModuleInit {
	private queueEvents: QueueEvents
	constructor(
		@InjectModel('SyncDetails')
		private readonly syncDetailsModel: Model<SyncDetailsDocument>,
		@InjectQueue('rpc-requests') private readonly rpcRequestsQueue: Queue,
		private readonly configService: ConfigService,
	) {
		this.queueEvents = new QueueEvents('rpc-requests', {
			connection: {
				host: this.configService.get('REDIS_HOST'),
				port: this.configService.get('REDIS_PORT'),
				password: this.configService.get('REDIS_PASSWORD'),
				db: this.configService.get('REDIS_DB'),
			},
		})
	}
	async onModuleInit() {
		await this.startWatching()
	}

	async startWatching() {
		let lastProcessedBlock = await this.getLastProcessedBlock()

		const currentBlock = Number(
			await this.queueRpcRequest('getBlockNumber', []),
		)
		console.log(`Current block: ${currentBlock}`)
		console.log(`Last processed block: ${lastProcessedBlock}`)
		console.log(
			`Current block - Last processed block: ${typeof lastProcessedBlock}`,
		)

		while (lastProcessedBlock < currentBlock) {
			await this.processBlock(lastProcessedBlock + 1)
			//await this.updateLastProcessedBlock(lastProcessedBlock + 1)
			lastProcessedBlock++
		}

		// // Set up a recurring job to check for new blocks
		// setInterval(async () => {
		// 	const newBlockNumber = await this.queueRpcRequest('getBlockNumber', [])
		// 	if (newBlockNumber > lastProcessedBlock) {
		// 		await this.processBlock(newBlockNumber)
		// 		await this.updateLastProcessedBlock(newBlockNumber)
		// 		lastProcessedBlock = newBlockNumber
		// 	}
		// }, 5000) // Check every 15 seconds
	}

	async processBlock(blockNumber: number) {
		const block = customSerializer.deserialize(
			await this.queueRpcRequest('getBlock', [
				{
					blockNumber: blockNumber,
					includeTransactions: true,
				},
			]),
		)
		// const filteredTxs = block.transactions.filter(
		// 	tx => tx.to === this.contract.address,
		// )

		console.log('block', block.transactions)

		for (const tx of block.transactions) {
			const receipt = customSerializer.deserialize(
				await this.queueRpcRequest('getTransactionReceipt', [
					{
						hash: tx.hash,
					},
				]),
			)
			console.log('receipt', receipt)
			// const transferEvents = receipt.logs
			// 	.filter(log => log.address === this.contract.address)
			// 	.map(log => this.contract.interface.parseLog(log))
			// 	.filter(event => event.name === 'Transfer')

			// for (const event of transferEvents) {
			// 	await this.storeTransferEvent(event, tx.hash, blockNumber)
			// }
		}
	}

	async updateLastProcessedBlock(blockNumber: number) {
		await this.syncDetailsModel.findOneAndUpdate(
			{},
			{ lastProcessedBlock: blockNumber },
			{ upsert: true },
		)
	}

	async getLastProcessedBlock(): Promise<number> {
		const lastBlock = await this.syncDetailsModel
			.findOne()
			.sort({ lastProcessedBlock: -1 })
		const fromBlock = Number(this.configService.get<number>('FROM_BLOCK'))
		const lastProcessedBlock = lastBlock
			? lastBlock.lastProcessedBlock
			: fromBlock
		if (lastProcessedBlock < fromBlock) {
			return fromBlock
		}
		return lastProcessedBlock
	}

	async queueRpcRequest(method: string, params: any[]) {
		const job = await this.rpcRequestsQueue.add('rpc-request', {
			method,
			params,
		})
		return await job.waitUntilFinished(this.queueEvents)
	}
}
