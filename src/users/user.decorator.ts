import { ExecutionContext, createParamDecorator } from '@nestjs/common'
import { ReqUser } from './schemas/user.schemas'

export const UserInfo = createParamDecorator<ReqUser>(
	async (data: unknown, ctx: ExecutionContext): Promise<ReqUser> => {
		const { user } = ctx.switchToHttp().getRequest()
		return user
	},
)
