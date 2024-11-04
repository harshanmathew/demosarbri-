import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
	TokenHolders,
	TokenHoldersDocument,
} from 'src/tokens/schemas/token-holders.schema'
import { Token, TokenDocument } from 'src/tokens/schemas/token.schema'
import { randomUsername } from 'src/utils/random-string'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UserActivity } from './schemas/user-activity.schema'
import { User } from './schemas/user.schemas'

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name) private userModel: Model<User>,
		@InjectModel(UserActivity.name) private userActivity: Model<UserActivity>,
		@InjectModel(TokenHolders.name)
		private readonly tokenHoldersModel: Model<TokenHoldersDocument>,
		@InjectModel(Token.name)
		private readonly tokenModel: Model<TokenDocument>,
	) {}

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

	async findUserStatus(
		id: string,
		caller: 'me' | 'public' = 'public',
	): Promise<any> {
		const [userStats, netWorth] = await Promise.all([
			this.getUserStats(id),
			caller === 'public' ? this.calculateUserNetWorth(id) : null,
		])

		const { user, stats } = userStats

		const response = {
			id: user._id,
			username: user.username,
			address: user.address,
			profileImage: user.profileImage,
			stats,
		}

		if (caller === 'me') {
			return {
				...response,
				netWorth,
			}
		}

		return response
	}

	private async getUserStats(userId: string) {
		const [user, activityStats, tokenTypesCount] = await Promise.all([
			this.userModel.findById(userId).exec(),
			this.userActivity.aggregate([
				{
					$facet: {
						// Trading stats
						tradingStats: [
							{
								$match: {
									user: new Types.ObjectId(userId),
									type: { $in: ['buy', 'sell'] },
								},
							},
							{
								$group: {
									_id: '$token',
									totalTokens: {
										$sum: {
											$cond: [
												{ $eq: ['$type', 'buy'] },
												'$tokenAmount',
												{ $multiply: ['$tokenAmount', -1] },
											],
										},
									},
									totalBonesInvested: {
										$sum: {
											$cond: [{ $eq: ['$type', 'buy'] }, '$boneAmount', 0],
										},
									},
								},
							},
							{
								$group: {
									_id: null,
									totalTokensHeld: { $sum: '$totalTokens' },
									totalBonesInvested: { $sum: '$totalBonesInvested' },
								},
							},
						],
						// Creation stats
						creationStats: [
							{
								$match: {
									user: new Types.ObjectId(userId),
									type: 'created',
								},
							},
							{
								$lookup: {
									from: 'tokens',
									localField: 'token',
									foreignField: '_id',
									as: 'tokenDetails',
								},
							},
							{
								$unwind: '$tokenDetails',
							},
							{
								$group: {
									_id: null,
									totalTokens: { $sum: 1 },
									graduatedTokens: {
										$sum: {
											$cond: [{ $eq: ['$tokenDetails.graduated', true] }, 1, 0],
										},
									},
								},
							},
						],
					},
				},
			]),
			// Count unique tokens with positive balance
			this.tokenHoldersModel.aggregate([
				{
					$match: {
						holder: new Types.ObjectId(userId),
						balance: { $gt: 0 },
					},
				},
				{
					$group: {
						_id: null,
						totalTypeOfTokensHeld: { $sum: 1 },
					},
				},
			]),
		])

		if (!user) {
			throw new Error('User not found')
		}

		const tradingStats = activityStats[0]?.tradingStats[0] || {
			totalTokensHeld: 0,
			totalBonesInvested: 0,
		}
		const creationStats = activityStats[0]?.creationStats[0] || {
			totalTokens: 0,
			graduatedTokens: 0,
		}

		console.log('tokenTypesCount', tokenTypesCount)

		return {
			user,
			stats: {
				totalTokensHeld: tokenTypesCount[0]?.totalTypeOfTokensHeld || 0,
				totalBonesInvested: tradingStats.totalBonesInvested,
				tokensCreated: creationStats.totalTokens,
				graduatedTokensCreated: creationStats.graduatedTokens,
			},
		}
	}

	async calculateUserNetWorth(userId: string) {
		const holdings = await this.tokenHoldersModel.aggregate([
			{
				$match: {
					holder: new Types.ObjectId(userId),
					balance: { $gt: 0 },
				},
			},
			{
				$lookup: {
					from: 'tokens',
					localField: 'token',
					foreignField: '_id',
					as: 'tokenInfo',
				},
			},
			{
				$unwind: '$tokenInfo',
			},
			{
				$group: {
					_id: null,
					totalNetWorthInBone: {
						$sum: { $multiply: ['$balance', '$tokenInfo.tokenPriceInBone'] },
					},
					graduatedTokensValue: {
						$sum: {
							$cond: [
								{ $eq: ['$tokenInfo.graduated', true] },
								{ $multiply: ['$balance', '$tokenInfo.tokenPriceInBone'] },
								0,
							],
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					totalNetWorthInBone: 1,
					graduatedTokensValue: 1,
					nonGraduatedTokensValue: {
						$subtract: ['$totalNetWorthInBone', '$graduatedTokensValue'],
					},
				},
			},
		])

		return (
			holdings[0] || {
				totalNetWorthInBone: 0,
				graduatedTokensValue: 0,
				nonGraduatedTokensValue: 0,
			}
		)
	}
}
