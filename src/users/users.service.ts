import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
	constructor(@InjectModel(User.name) private userModel: Model<User>) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		const newUser = new this.userModel(createUserDto)
		return newUser.save()
	}

	async findAll(): Promise<User[]> {
		return this.userModel.find().exec()
	}

	async findOne(id: string): Promise<User> {
		const user = await this.userModel.findById(id).exec()
		if (!user) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
		return user
	}

	async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
		const updatedUser = await this.userModel
			.findByIdAndUpdate(id, updateUserDto, { new: true })
			.exec()
		if (!updatedUser) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
		return updatedUser
	}

	async remove(id: string): Promise<void> {
		const result = await this.userModel.findByIdAndDelete(id).exec()
		if (!result) {
			throw new NotFoundException(`User with ID ${id} not found`)
		}
	}

	async findByAddress(address: string): Promise<User | null> {
		const user = await this.userModel.findOne({ address }).exec()
		if (!user) {
			return null
		}
		return user
	}
}
