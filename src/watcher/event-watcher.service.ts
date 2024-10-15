import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Queue, QueueEvents } from 'bullmq'
import { Model } from 'mongoose'
import { customSerializer } from 'src/utils/custom-serializer'
import { EventTypeFromAbi, parseLogs } from 'src/utils/parse-logs'
import { sharbiFunAbi } from 'src/utils/sharbi-fun.abi'
import { Abi, ContractEventName, isAddressEqual } from 'viem'
import { EventLogsDocument } from './schema/event-logs.schema'
import { SyncDetailsDocument } from './schema/sync-details.schema'

@Injectable()
export class EventWatcherService implements OnModuleInit {
	private queueEvents: QueueEvents

	constructor(
		@InjectModel('SyncDetails')
		private readonly syncDetailsModel: Model<SyncDetailsDocument>,
		@InjectQueue('rpc-requests') private readonly rpcRequestsQueue: Queue,
		@InjectModel('EventLogs')
		private readonly eventLogModel: Model<EventLogsDocument>,
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
		console.log('Starting block watcher')
		let lastProcessedBlock = await this.getLastProcessedBlock()

		const processBlocksUntil = async (targetBlock: number) => {
			console.log('processBlocksUntil:', targetBlock)
			while (lastProcessedBlock < targetBlock) {
				console.log(`Processing block ${lastProcessedBlock + 1}`)
				await this.processBlock(lastProcessedBlock + 1)
				await this.updateLastProcessedBlock(lastProcessedBlock + 1)
				lastProcessedBlock++
			}
		}

		const checkAndProcessNewBlocks = async () => {
			const currentBlock = Number(
				await this.queueRpcRequest('getBlockNumber', []),
			)

			console.log('Current block:', currentBlock)

			await processBlocksUntil(currentBlock - 2) // Process all blocks except the last 2 (to account for potential reorgs)
		}

		// Process all backlogged blocks
		try {
			await checkAndProcessNewBlocks()
		} catch (e) {
			console.log('Error:', e)
		}

		// Function to schedule the next check
		const scheduleNextCheck = () => {
			setTimeout(async () => {
				try {
					await checkAndProcessNewBlocks()
				} catch (e) {
					console.log('Error:', e)
				}
				scheduleNextCheck() // Schedule the next check after this one completes
			}, 5000) // Wait 5 seconds before the next check
		}

		// Start the checking process
		scheduleNextCheck()

		console.log('Block watcher started. Now monitoring for new blocks.')
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

		const transactionHashes = block.transactions.map(tx => tx.hash)
		const receipts = await Promise.all(
			transactionHashes.map(hash =>
				this.queueRpcRequest('getTransactionReceipt', [{ hash }]),
			),
		)

		const allLogs = receipts.flatMap(
			receipt => customSerializer.deserialize(receipt).logs || [],
		)

		await this.saveEventsToDb(allLogs)
	}

	async saveEventsToDb(logs: any[]) {
		const eventLogs = logs.map(log => ({
			address: log.address,
			topics: log.topics,
			data: log.data,
			blockNumber: Number(log.blockNumber),
			transactionHash: log.transactionHash,
			transactionIndex: log.transactionIndex,
			blockHash: log.blockHash,
			logIndex: log.logIndex,
			removed: log.removed,
		}))

		await this.eventLogModel.insertMany(eventLogs)
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
