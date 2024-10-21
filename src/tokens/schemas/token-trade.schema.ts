import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document, Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'
import type { Token } from './token.schema'

export type TokenTradesDocument = TokenTrades & Document

@Schema({ timestamps: true })
export class TokenTrades extends Document {
	@Prop({
		required: true,
		ref: 'Tokens',
		type: Types.ObjectId,
		index: true,
	})
	token: Types.ObjectId | Token

	@Prop({ required: true, ref: 'Users', type: Types.ObjectId, index: true })
	trader: Types.ObjectId | User

	@Prop({ required: true, type: Number })
	boneAmount: number

	@Prop({ required: true, type: Number })
	tokenAmount: number

	@Prop({ enum: ['buy', 'sell'] })
	@ApiProperty({ enum: ['buy', 'sell'] })
	type: 'buy' | 'sell'

	@Prop({ required: true, type: Date })
	timestamp: Date

	@Prop({ required: true })
	@ApiProperty({ type: String })
	txHash: string
}

export const TokenTradesSchema = SchemaFactory.createForClass(TokenTrades)
