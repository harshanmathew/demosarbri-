import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'

export type TokenDocument = Token & Document

@Schema()
export class Token {
	@Prop({ type: Types.ObjectId, auto: true })
	_id: Types.ObjectId

	@Prop({ required: true })
	name: string

	@Prop()
	ticker: string

	@Prop()
	description: string

	@Prop()
	tokenSupply: number

	@Prop()
	initialBuyAmount: number

	@Prop()
	twitterLink: string

	@Prop()
	telegramLink: string

	@Prop()
	websiteLink: string

	@Prop({ default: false })
	launched: boolean

	@Prop({ type: Types.ObjectId, ref: 'User' })
	creator: User
}

export const TokenSchema = SchemaFactory.createForClass(Token)
