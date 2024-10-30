import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'
import type { Token } from './token.schema'

export type TokenHoldersDocument = TokenHolders & Document

@Schema({ timestamps: true })
export class TokenHolders extends Document {
	@Prop({
		required: true,
		ref: 'Token',
		type: Types.ObjectId,
		index: true,
	})
	token: Types.ObjectId | Token

	@Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
	holder: Types.ObjectId | User

	@Prop({ required: true, type: String, default: '0' })
	balance: string
}

export const TokenHoldersSchema = SchemaFactory.createForClass(TokenHolders)
