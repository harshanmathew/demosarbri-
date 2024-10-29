import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomUsername } from 'src/utils/random-string'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './schemas/user.schemas'

@Injectable()
export class UsersService {
	constructor(@InjectModel(User.name) private userModel: Model<User>) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		if (!createUserDto.username) {
			createUserDto.username = await this.generateUniqueUsername()
		}

		const newUser = new this.userModel(createUserDto)
		newUser.usernameLower = newUser.username.toLowerCase()
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
		const updateData = {
			...updateUserDto,
			usernameLower: updateUserDto.username.toLowerCase(),
		}
		const updatedUser = await this.userModel
			.findByIdAndUpdate(id, updateData, { new: true })
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

	private async generateUniqueUsername(): Promise<string> {
		let username: string
		let isUnique = false

		while (!isUnique) {
			username = randomUsername()
			const existingUser = await this.findByUsername(username)
			if (!existingUser) {
				isUnique = true
			}
		}

		return username
	}

	async findByUsername(username: string): Promise<User | null> {
		const user = await this.userModel
			.findOne({ usernameLower: username.toLowerCase() })
			.exec()
		if (!user) {
			return null
		}
		return user
	}

	async isUsernameAvailable(username: string): Promise<boolean> {
		const user = await this.findByUsername(username)
		return user === null
	}
}
