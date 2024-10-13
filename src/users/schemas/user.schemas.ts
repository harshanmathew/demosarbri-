import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type ReqUser = {
	id: Types.ObjectId
}

@Schema()
export class User extends Document {
	@Prop({ required: false })
	name?: string

	@Prop({ required: false, unique: true })
	username?: string

	@Prop({ required: true, unique: true })
	address: string

	@Prop({ required: false })
	profileImage?: string
}

export type UserDocument = User & Document

export const UserSchema = SchemaFactory.createForClass(User)
