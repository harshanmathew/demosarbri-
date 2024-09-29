import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class User extends Document {
	@Prop({ required: false })
	name?: string

	@Prop({ required: true, unique: true })
	address: string

	@Prop({ required: false })
	message?: string

	@Prop({ required: false, unique: true })
	signature?: string

	@Prop({ required: false })
	profileImage?: string
}

export const UserSchema = SchemaFactory.createForClass(User)
