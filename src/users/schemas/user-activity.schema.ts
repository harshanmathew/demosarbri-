import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Types } from 'mongoose'
import { Token } from 'src/tokens/schemas/token.schema'
import { User } from './user.schemas'

export type UserActivityDocument = UserActivity & Document

@Schema({ timestamps: true })
export class UserActivity {
	@Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
	user: Types.ObjectId | User

	@Prop({ enum: ['created', 'buy', 'sell'] })
	type: 'created' | 'buy' | 'sell'

	@Prop({ required: true, type: Number })
	boneAmount: number

	@Prop({ required: true, type: Number })
	tokenAmount: number

	@Prop({
		required: true,
		ref: 'Token',
		type: Types.ObjectId,
		index: true,
	})
	token: Types.ObjectId | Token

	@Prop({ required: true, type: Date })
	timestamp: Date
}

export const UserActivitySchema = SchemaFactory.createForClass(UserActivity)
