import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type EventLogsDocument = EventLogs & Document

@Schema()
export class EventLogs {
	@Prop({ required: true })
	address: string

	@Prop({ required: true })
	topics: string[]

	@Prop({ required: true })
	data: string

	@Prop({ required: true })
	blockNumber: number

	@Prop({ required: true })
	transactionHash: string

	@Prop({ required: true })
	transactionIndex: number

	@Prop({ required: true })
	blockHash: string

	@Prop({ required: true })
	logIndex: number

	@Prop({ required: true })
	removed: boolean

	@Prop({ required: true, default: false })
	processed: boolean

	@Prop({ required: true, default: Date.now })
	timestamp: Date

	@Prop({ required: false })
	syncedAt: Date
}

export const EventLogsSchema = SchemaFactory.createForClass(EventLogs)
