import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
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
import { UpdateUserDto } from './dto/update-user.dto'
import { User } from './schemas/user.schemas'
import { UserInfo } from './user.decorator'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Auth()
	@Get('me/stats')
	@ApiOperation({ summary: 'Get current user  stats' })
	@ApiResponse({
		status: 200,
		description: 'Returns the current user stats.',
		type: User,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findMe(@UserInfo() user: User) {
		return this.usersService.findUserStatus(user.id, 'me')
	}

	@Get(':username/stats')
	@ApiOperation({ summary: 'Get user stats' })
	@ApiResponse({
		status: 200,
		description: 'Returns the user stats.',
		type: User,
	})
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	async findUser(@Param('username') username: string) {
		const user = await this.usersService.findByUsername(username)
		return this.usersService.findUserStatus(user.id)
	}
}
