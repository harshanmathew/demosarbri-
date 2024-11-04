import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document, Types } from 'mongoose'
import { User } from 'src/users/schemas/user.schemas'

export type TokenDocument = Token & Document

@Schema()
class BondingCurveParams {
	@Prop({ default: false })
	@ApiProperty({ type: String })
	k: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	x1: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	y1: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	x0: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	y0: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	virtualX: string

	@Prop({ default: false })
	@ApiProperty({ type: String })
	virtualY: string
}
@Schema()
export class Token {
	@ApiProperty({ type: String })
	_id: Types.ObjectId

	@Prop({ required: false })
	@ApiProperty({ type: String })
	name: string

	@Prop({ required: false })
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

	@Prop({ required: false })
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
	@ApiProperty({ type: Number })
	marketCapInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	totalRaisedInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	tokenPriceInBone: number

	@Prop({ required: false })
	@ApiProperty({ type: Number })
	bondingCurveTokenBalance: number

	@Prop({ required: false })
	@ApiProperty({ type: String })
	pairAddress: string

	@Prop({ default: false })
	@ApiProperty({ type: Boolean })
	launched: boolean

	@Prop({ type: () => BondingCurveParams })
	@ApiProperty({ type: BondingCurveParams })
	bondingCurveParams: BondingCurveParams

	@Prop({ default: false })
	@ApiProperty({ type: Boolean })
	graduated: boolean
}

export const TokenSchema = SchemaFactory.createForClass(Token)
