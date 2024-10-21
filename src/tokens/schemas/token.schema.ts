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

	@Prop({ required: false, unique: true, sparse: true })
	@ApiProperty({ type: String })
	address: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	description: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	image: string

	@Prop({ required: true })
	@ApiProperty({ type: String })
	tokenSupply: string

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

	@Prop({ enum: ['yes', 'no'] })
	@ApiProperty({ enum: ['yes', 'no'] })
	donate: 'yes' | 'no'

	@Prop({ type: Types.ObjectId, ref: 'User' })
	creator: User

	@Prop({ required: true, lowercase: true })
	@ApiProperty({ type: String })
	transactionHash: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	marketCapInBoneBig: string

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	marketCapInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: String })
	totalRaisedInBoneBig: string

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	totalRaisedInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: String })
	tokenPriceInBoneBig: string

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	tokenPriceInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: String })
	virtualY: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	virtualX: string

	@Prop({ default: false })
	@ApiProperty({ type: Boolean })
	launched: boolean

	@Prop({ default: false })
	@ApiProperty({ type: Boolean })
	graduated: boolean
}

export const TokenSchema = SchemaFactory.createForClass(Token)
