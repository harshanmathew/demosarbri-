import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard'
import { User } from 'src/users/schemas/user.schemas'
import { UserInfo } from 'src/users/user.decorator'
import { CreateTokenDto } from './dto/create-token.dto'
import { TokensService } from './tokens.service'

@ApiTags('Tokens')
@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
	constructor(private readonly tokensService: TokensService) {}

	@Post()
	create(@Body() createTokenDto: CreateTokenDto, @UserInfo() user: User) {
		return this.tokensService.create(createTokenDto, user)
	}

	@Get()
	findAll(@UserInfo() user: User) {
		return this.tokensService.findAll(user)
	}

	@Get(':id')
	findOne(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.findOne(id, user)
	}

	@Put(':id/launch')
	launch(@Param('id') id: string, @UserInfo() user: User) {
		return this.tokensService.launch(id, user)
	}
}
