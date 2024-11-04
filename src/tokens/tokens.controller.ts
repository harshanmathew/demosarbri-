import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Auth } from 'src/auth/auth.decorator'
import { User } from 'src/users/schemas/user.schemas'
import { UserInfo } from 'src/users/user.decorator'
import { RecentlyLaunchedQueryDto } from 'src/ws-updates/dto/recently-launched-query.dto'
import { RecentlyLaunchedResponseDto } from 'src/ws-updates/dto/recently-launched-response.dto'
import { CreateTokenDto } from './dto/create-token.dto'
import { ChartQueryDto, PaginationQueryDto } from './dto/pagination-query.dto'
import {
	ChartResponseDto,
	LatestActivityDto,
	TokenHoldersResponseDto,
	TokenTradesResponseDto,
	TokenWithVolumeDto,
} from './dto/token-response.dto'
import { UpdateTokenDto } from './dto/update-token.dto'
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

	@Put(':address')
	@ApiOperation({ summary: 'Update a token' })
	@ApiBody({ type: UpdateTokenDto })
	@ApiResponse({
		status: 200,
		description: 'The token has been successfully updated.',
	})
	@Auth()
	update(
		@Param('address') address: string,
		@Body() updateTokenDto: UpdateTokenDto,
		@UserInfo() user: User,
	) {
		return this.tokensService.update(address, updateTokenDto, user)
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

	@Get('/random-token')
	@ApiOperation({ summary: 'Get a random token' })
	@ApiResponse({
		status: 200,
		description: 'Return a random token.',
		type: Token,
	})
	findRandomToken() {
		return this.tokensService.findRandomToken()
	}

	@Get('/latest-activity')
	@ApiOperation({ summary: 'Get the latest activity' })
	@ApiResponse({
		status: 200,
		description: 'Return the latest activity.',
		type: [LatestActivityDto],
	})
	findLatestActivity() {
		return this.tokensService.findLatestActivity()
	}

	@Get('/recently-launched')
	@ApiOperation({ summary: 'Get recently launched tokens' })
	@ApiResponse({
		status: 200,
		description: 'Return recently launched tokens.',
		type: RecentlyLaunchedResponseDto,
	})
	findRecentlyLaunched(@Query() queryParams: RecentlyLaunchedQueryDto) {
		return this.tokensService.findRecentlyLaunched(queryParams)
	}

	@Get(':tokenId/holders')
	@ApiOperation({ summary: 'Get all token holders' })
	@ApiResponse({
		status: 200,
		description: 'Return all token holders.',
		type: TokenHoldersResponseDto,
	})
	findAllHolders(
		@Query() queryParams: PaginationQueryDto,
		@Param('tokenId') tokenId: string,
	) {
		return this.tokensService.findAllHolders(tokenId, queryParams)
	}

	@Get(':tokenId/trades')
	@ApiOperation({ summary: 'Get all token trades' })
	@ApiResponse({
		status: 200,
		description: 'Return all token trades.',
		type: TokenTradesResponseDto,
	})
	findAllTrades(
		@Query() queryParams: PaginationQueryDto,
		@Param('tokenId') tokenId: string,
	) {
		return this.tokensService.findAllTrades(tokenId, queryParams)
	}

	@Get(':tokenId/chart')
	@ApiOperation({ summary: 'Get the token chart' })
	@ApiResponse({
		status: 200,
		description: 'Return the token chart.',
		type: [ChartResponseDto],
	})
	findChart(
		@Query() queryParams: ChartQueryDto,
		@Param('tokenId') tokenId: string,
	) {
		return this.tokensService.findChart(tokenId, queryParams)
	}

	@Get(':address')
	@ApiOperation({ summary: 'Get a specific token by address' })
	@ApiResponse({
		status: 200,
		description: 'Return the token.',
		type: TokenWithVolumeDto,
	})
	findOne(@Param('address') address: string, @UserInfo() user: User) {
		return this.tokensService.findOne(address)
	}
}
