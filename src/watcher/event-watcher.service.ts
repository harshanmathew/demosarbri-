import { InjectQueue } from '@nestjs/bullmq'
import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Queue, QueueEvents } from 'bullmq'
import { Model } from 'mongoose'
import { customSerializer } from 'src/utils/custom-serializer'
import { EventTypeFromAbi, parseLogs } from 'src/utils/parse-logs'
import { sharbiFunAbi } from 'src/utils/sharbi-fun.abi'
import { Abi, ContractEventName, getAddress, isAddressEqual, toHex } from 'viem'
import { EventLogsDocument } from './schema/event-logs.schema'
import { SyncDetailsDocument } from './schema/sync-details.schema'

@Injectable()
export class EventWatcherService implements OnModuleInit {
	private queueEvents: QueueEvents
	// biome-ignore lint/style/useNamingConvention: <explanation>
	private readonly BATCH_SIZE = 10 // Number of blocks to fetch in a single batch
	constructor(
		@InjectModel('SyncDetails')
		private readonly syncDetailsModel: Model<SyncDetailsDocument>,
		@InjectQueue('rpc-requests') private readonly rpcRequestsQueue: Queue,
		@InjectModel('EventLogs')
		private readonly eventLogModel: Model<EventLogsDocument>,
		private readonly configService: ConfigService,
	) {
		this.rpcRequestsQueue.setMaxListeners(30)
		this.queueEvents = new QueueEvents('rpc-requests', {
			connection: {
				host: this.configService.get('REDIS_HOST'),
				port: this.configService.get('REDIS_PORT'),
				password: this.configService.get('REDIS_PASSWORD'),
				db: this.configService.get('REDIS_DB'),
			},
		})
		this.queueEvents.setMaxListeners(30)
	}
	async onModuleInit() {
		await this.startWatching()
	}

	async startWatching() {
		let lastProcessedBlock = await this.getLastProcessedBlock()

		//console.log('Last processed block:', lastProcessedBlock)

		const processBlocksUntil = async (targetBlock: number) => {
			while (lastProcessedBlock < targetBlock) {
				const fromBlock = lastProcessedBlock + 1
				const toBlock = Math.min(fromBlock + this.BATCH_SIZE - 1, targetBlock)

				//console.log(`Processing blocks ${fromBlock} to ${toBlock}`)
				const startTime = Date.now()
				await this.processBlockRange(fromBlock, toBlock)
				await this.updateLastProcessedBlock(toBlock)
				const processingTime = (Date.now() - startTime) / 1000
				// console.log(
				// 	`Blocks ${fromBlock} to ${toBlock} processed in ${processingTime}s`,
				// )
				lastProcessedBlock = toBlock
			}
		}

		const checkAndProcessNewBlocks = async () => {
			const currentBlock = Number(
				await this.queueRpcRequest('getBlockNumber', []),
			)

			//console.log('Current block:', currentBlock)

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
			}, 4000) // Wait 4 seconds before the next check
		}

		// Start the checking process
		scheduleNextCheck()

		console.log('Block watcher started. Now monitoring for new blocks.')
	}

	async processBlockRange(fromBlock: number, toBlock: number) {
		// Get timestamps for the block range
		// Get block timestamps
		const blocks = await Promise.all(
			Array.from({ length: toBlock - fromBlock + 1 }, (_, i) =>
				this.queueRpcRequest('getBlock', [{ blockNumber: fromBlock + i }]),
			),
		)

		// Create a map of block numbers to timestamps
		const blockTimestamps = new Map(
			blocks.map(block => {
				const deserializedBlock = customSerializer.deserialize(block)
				return [
					Number(deserializedBlock.number),
					Number(deserializedBlock.timestamp),
				]
			}),
		)

		const logs = await this.queueRpcRequest('getLogs', [
			{
				fromBlock: toHex(fromBlock),
				toBlock: toHex(toBlock),
				address: getAddress(this.configService.get('SHARBI_FUN_ADDRESS')),
			},
		])

		const deserializedLogs = customSerializer.deserialize(logs)
		if (deserializedLogs && deserializedLogs.length > 0) {
			await this.saveEventsToDb(deserializedLogs, blockTimestamps)
		}
	}

	async saveEventsToDb(logs: any[], blockTimestamps: Map<number, number>) {
		const eventLogs = logs?.map(log => {
			const blockNumber = Number(log.blockNumber)
			const timestamp = blockTimestamps.get(blockNumber)

			return {
				address: log.address,
				topics: log.topics,
				data: log.data,
				blockNumber,
				transactionHash: log.transactionHash,
				transactionIndex: log.transactionIndex,
				blockHash: log.blockHash,
				logIndex: log.logIndex,
				removed: log.removed,
				timestamp: new Date(timestamp * 1000),
			}
		})

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
