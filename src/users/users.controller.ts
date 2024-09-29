import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UseGuards,
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UsersService } from './users.service'

@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new user' })
	@ApiResponse({ status: 201, description: 'User created successfully.' })
	@ApiResponse({ status: 400, description: 'Bad request.' })
	create(@Body() createUserDto: CreateUserDto) {
		return this.usersService.create(createUserDto)
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth() // This marks that this endpoint requires authentication (Bearer token)
	@Get()
	@ApiOperation({ summary: 'Get all users' })
	@ApiResponse({ status: 200, description: 'Returns a list of users.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findAll() {
		return this.usersService.findAll()
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Get(':id')
	@ApiOperation({ summary: 'Get a user by ID' })
	@ApiResponse({ status: 200, description: 'Returns a user.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findOne(@Param('id') id: string) {
		return this.usersService.findOne(id)
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Patch(':id')
	@ApiOperation({ summary: 'Update a user by ID' })
	@ApiResponse({ status: 200, description: 'User updated successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
		return this.usersService.update(id, updateUserDto)
	}

	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	@Delete(':id')
	@ApiOperation({ summary: 'Delete a user by ID' })
	@ApiResponse({ status: 200, description: 'User deleted successfully.' })
	@ApiResponse({ status: 404, description: 'User not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	remove(@Param('id') id: string) {
		return this.usersService.remove(id)
	}
}
