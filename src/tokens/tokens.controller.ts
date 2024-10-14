import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { User } from 'src/users/schemas/user.schemas'
import { UserInfo } from 'src/users/user.decorator'
import { CreateTokenDto } from './dto/create-token.dto'
import { Token } from './schemas/token.schema'
import { TokensService } from './tokens.service'

@ApiTags('Tokens')
@ApiBearerAuth()
@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
	constructor(private readonly tokensService: TokensService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new token' })
	@ApiBody({ type: CreateTokenDto })
	@ApiResponse({
		status: 201,
		description: 'The token has been successfully created.',
		type: Token,
	})
	@ApiResponse({ status: 400, description: 'Bad Request.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	create(@Body() createTokenDto: CreateTokenDto, @UserInfo() user: User) {
		return this.tokensService.create(createTokenDto, user)
	}

	@Get()
	@ApiOperation({ summary: 'Get all tokens for the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all tokens for the user.',
	})
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findAll(@UserInfo() user: User) {
		return this.tokensService.findAll(user)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific token by ID' })
	@ApiResponse({ status: 200, description: 'Return the token.' })
	@ApiResponse({ status: 404, description: 'Token not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	findOne(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.findOne(id, user)
	}

	@Put(':id/launch')
	@ApiOperation({ summary: 'Launch a token' })
	@ApiResponse({
		status: 200,
		description: 'The token has been successfully launched.',
	})
	@ApiResponse({ status: 404, description: 'Token not found.' })
	@ApiResponse({ status: 401, description: 'Unauthorized.' })
	launch(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.launch(id, user)
	}
}
