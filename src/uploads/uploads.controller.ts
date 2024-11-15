import {
	Controller,
	HttpException,
	HttpStatus,
	Post,
	UploadedFiles,
	UseInterceptors,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FilesInterceptor } from '@nestjs/platform-express'
import {
	ApiBody,
	ApiConsumes,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger'
import { Auth } from 'src/auth/auth.decorator'
import { UTApi } from 'uploadthing/server'

@ApiTags('Uploads')
@Controller('uploads')
@Auth()
export class UploadsController {
	private utapi: UTApi

	constructor(private readonly configService: ConfigService) {
		const token = this.configService.get<string>('UPLOADTHING_TOKEN')
		if (!token) {
			throw new Error('TOKEN is missing in environment variables')
		}
		this.utapi = new UTApi({
			token,
		})
	}

	@Post('file')
	@ApiOperation({ summary: 'Upload file and get the file URL' })
	@ApiConsumes('multipart/form-data')
	@ApiBody({
		schema: {
			type: 'object',
			properties: {
				files: {
					type: 'array',
					items: {
						type: 'string',
						format: 'binary',
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'File uploaded successfully and file URL returned',
		schema: {
			type: 'object',
			properties: {
				fileKey: { type: 'string' },
				uploadUrl: { type: 'string' },
			},
		},
	})
	@ApiResponse({
		status: 413,
		description: 'File too large - maximum size is 8MB',
	})
	@UseInterceptors(
		FilesInterceptor('files', 1, {
			limits: {
				fileSize: 8 * 1024 * 1024, // 8MB in bytes
			},
		}),
	)
	async uploadFile(
		@UploadedFiles() files: Express.Multer.File[],
	): Promise<any> {
		if (!files || files.length === 0) {
			throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST)
		}

		const file = files[0]

		try {
			const utFile = new Blob([file.buffer], { type: file.mimetype }) as any
			utFile.name = file.originalname

			const response = await this.utapi.uploadFiles([utFile])

			if (!response || response.length === 0 || response[0].error) {
				throw new HttpException(
					'Failed to upload file',
					HttpStatus.INTERNAL_SERVER_ERROR,
				)
			}

			const uploadedFile = response[0].data
			return {
				fileKey: uploadedFile.key,
				uploadUrl: uploadedFile.url,
			}
		} catch (error) {
			console.error('Error uploading file:', error)
			throw new HttpException(
				'Error uploading file',
				HttpStatus.INTERNAL_SERVER_ERROR,
			)
		}
	}
}
