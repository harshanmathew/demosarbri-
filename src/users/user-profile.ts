import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Query,
	UseGuards,
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { Auth } from 'src/auth/auth.decorator'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { PaginationQueryDto } from 'src/tokens/dto/pagination-query.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import {
	HoldingsResponseDto,
	UserCreatedTokensResponseDto,
	UserStatResponseDto,
	UserTradesResponseDto,
} from './dto/user-response.dto'
import { User } from './schemas/user.schemas'
import { UserInfo } from './user.decorator'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Auth()
	@Get('my/stats')
	@ApiOperation({ summary: 'Get current user  stats' })
	@ApiResponse({
		status: 200,
		description: 'Returns the current user stats.',
		type: UserStatResponseDto,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findMe(@UserInfo() user: User) {
		return this.usersService.findUserStatus(user.id, 'me')
	}

	@Auth()
	@Get('my/holdings')
	@ApiOperation({ summary: 'Get all token holdings' })
	@ApiResponse({
		status: 200,
		description: 'Return all token holdings.',
		type: HoldingsResponseDto,
	})
	findAllHolders(
		@Query() queryParams: PaginationQueryDto,
		@UserInfo() user: User,
	) {
		return this.usersService.findAllHoldings(user.id, queryParams)
	}

	@Auth()
	@Get('my/created')
	@ApiOperation({ summary: 'Get all tokens created by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all tokens created by the user.',
		type: UserCreatedTokensResponseDto,
	})
	findCreatedTokens(
		@UserInfo() user: User,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findCreatedTokens(
			user.id,
			queryParams,
			'non-graduated',
		)
	}

	@Auth()
	@Get('my/graduated')
	@ApiOperation({ summary: 'Get all tokens graduated by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all tokens graduated by the user.',
		type: UserCreatedTokensResponseDto,
	})
	findGraduatedTokens(
		@UserInfo() user: User,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findCreatedTokens(
			user.id,
			queryParams,
			'graduated',
		)
	}

	@Auth()
	@Get('my/trades')
	@ApiOperation({ summary: 'Get all trades by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all trades by the user.',
		type: UserTradesResponseDto,
	})
	findUserTrades(
		@UserInfo() user: User,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findUserTrades(user.id, queryParams)
	}

	@Auth()
	@Get('my/project-trades')
	@ApiOperation({ summary: 'Get all project trades by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all project trades by the user.',
		type: UserTradesResponseDto,
	})
	findUserProjectTrades(
		@UserInfo() user: User,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findUserProjectTrades(user.id, queryParams)
	}

	@Get(':username/stats')
	@ApiOperation({ summary: 'Get user stats' })
	@ApiResponse({
		status: 200,
		description: 'Returns the user stats.',
		type: UserStatResponseDto,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	async findUser(@Param('username') username: string) {
		const user = await this.usersService.findByUsername(username)
		return this.usersService.findUserStatus(user.id)
	}

	@Get(':userId/trades')
	@ApiOperation({ summary: 'Get all trades by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all trades by the user.',
		type: UserTradesResponseDto,
	})
	findUserTradesById(
		@Param('userId') userId: string,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findUserTrades(userId, queryParams)
	}

	@Get(':userId/created')
	@ApiOperation({ summary: 'Get all tokens created by the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all tokens created by the user.',
		type: UserCreatedTokensResponseDto,
	})
	findUserCreatedTokens(
		@Param('userId') userId: string,
		@Query() queryParams: PaginationQueryDto,
	) {
		return this.usersService.findCreatedTokens(userId, queryParams)
	}
}
