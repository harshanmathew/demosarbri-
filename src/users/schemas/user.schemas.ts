import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { ApiProperty } from '@nestjs/swagger'
import { Document, Types } from 'mongoose'

export type ReqUser = {
	id: Types.ObjectId
}

@Schema()
export class User extends Document {
	@Prop({ required: false })
	@ApiProperty({ type: String })
	name?: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	username?: string

	@Prop({ required: true, unique: true })
	@ApiProperty({ type: String })
	address: string

	@Prop({ required: false })
	@ApiProperty({ type: String })
	profileImage?: string
}

export type UserDocument = User & Document

export const UserSchema = SchemaFactory.createForClass(User)

// Add a custom index for the username field
UserSchema.index({ username: 1 }, { unique: true, sparse: true })
