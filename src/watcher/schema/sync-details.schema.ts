import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type SyncDetailsDocument = SyncDetails & Document

@Schema({ timestamps: true })
export class SyncDetails {
	@Prop({ required: true, default: 0 })
	lastProcessedBlock: number

	@Prop({ default: null })
	lastSuccessfulSync: Date

	@Prop({ default: null })
	lastErrorTimestamp: Date

	@Prop({ default: null })
	lastErrorMessage: string

	@Prop({ default: 0 })
	totalProcessedTransactions: number

	@Prop({ default: 0 })
	totalProcessedEvents: number

	@Prop({ default: false })
	isSyncing: boolean
}

export const SyncDetailsSchema = SchemaFactory.createForClass(SyncDetails)
