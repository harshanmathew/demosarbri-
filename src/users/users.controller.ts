import {
	Body,
	Controller,
	Delete,
	Get,
	Patch,
	Request,
	UseGuards,
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@ApiTags('Me')
@Controller('me')
export class MeController {
	constructor(private readonly usersService: UsersService) {}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Get()
	@ApiOperation({ summary: 'Get current user details' })
	@ApiResponse({ status: 200, description: 'Returns the current user.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findMe(@Request() req: any) {
		return this.usersService.findOne(req.user.id)
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Patch()
	@ApiOperation({ summary: 'Update current user details' })
	@ApiResponse({ status: 200, description: 'User updated successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	updateMe(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
		return this.usersService.update(req.user.id, updateUserDto)
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Delete()
	@ApiOperation({ summary: 'Delete current user account' })
	@ApiResponse({ status: 200, description: 'User deleted successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	removeMe(@Request() req: any) {
		return this.usersService.remove(req.user.id)
	}
}
