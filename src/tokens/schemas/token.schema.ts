import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document, Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'

export type TokenDocument = Token & Document

@Schema()
export class Token {
	@ApiProperty({ type: String })
	_id: Types.ObjectId

	@Prop({ required: true })
	@ApiProperty({ type: String })
	name: string

	@Prop({ required: true })
	@ApiProperty({ type: String })
	ticker: string

	@Prop({ required: true })
	@ApiProperty({ type: String })
	address: string

	@Prop({ required: true })
	@ApiProperty({ type: String })
	description: string

	@Prop({ required: true })
	@ApiProperty({ type: String })
	image: string

	@Prop({ required: true })
	@ApiProperty({ type: Number })
	tokenSupply: number

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	initialBuyAmount: number

	@Prop({ enum: ['beginner', 'pro'] })
	@ApiProperty({ enum: ['beginner', 'pro'] })
	bondingCurve: 'beginner' | 'pro'

	@Prop({ required: false })
	@ApiProperty({ type: String })
	twitterLink: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	telegramLink: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	websiteLink: string

	@Prop({ default: false })
	@ApiProperty({ type: Boolean })
	launched: boolean

	@Prop({ enum: ['yes', 'no'] })
	@ApiProperty({ enum: ['yes', 'no'] })
	donate: 'yes' | 'no'

	@Prop({ type: Types.ObjectId, ref: 'User' })
	creator: User

	@Prop({ required: true })
	@ApiProperty({ type: String })
	transactionHash: string
}

export const TokenSchema = SchemaFactory.createForClass(Token)
