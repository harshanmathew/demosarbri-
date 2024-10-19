import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/users/schemas/user.schemas'
import { UserInfo } from 'src/users/user.decorator'
import { CreateTokenDto } from './dto/create-token.dto'
import { Token } from './schemas/token.schema'
import { TokensService } from './tokens.service'

@ApiTags('Tokens')
@Controller('tokens')
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
	@Auth()
	create(@Body() createTokenDto: CreateTokenDto, @UserInfo() user: User) {
		return this.tokensService.create(createTokenDto, user)
	}

	@Get('/user')
	@ApiOperation({ summary: 'Get all tokens for the user' })
	@ApiResponse({
		status: 200,
		description: 'Return all tokens for the user.',
	})
	@Auth()
	findAll(@UserInfo() user: User) {
		return this.tokensService.findAll(user)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific token by ID' })
	@ApiResponse({ status: 200, description: 'Return the token.', type: Token })
	@Auth()
	findOne(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.findOne(id, user)
	}

	@Put(':id/launch')
	@ApiOperation({ summary: 'Launch a token' })
	@ApiResponse({
		status: 200,
		description: 'The token has been successfully launched.',
		type: Token,
	})
	@Auth()
	launch(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.launch(id, user)
	}

	// Create a api for list all newly created tokens but launched, add pagination
	@Get()
	@ApiOperation({ summary: 'Get all launched tokens' })
	@ApiResponse({
		status: 200,
		description: 'Return all launched tokens.',
		type: [Token],
	})
	findAllLaunched() {
		return this.tokensService.findAllLaunched()
	}
}
