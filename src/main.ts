import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { MongoExceptionFilter } from './filters/mongo-exception.filter'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)
	const configService = app.get(ConfigService)
	const port = configService.get<number>('PORT') || 3000

	app.useGlobalPipes(
		new ValidationPipe({
			forbidNonWhitelisted: true,
			transform: true,
			whitelist: true,
			forbidUnknownValues: true,
		}),
	)
	//MongoExceptionFilter globally
	app.useGlobalFilters(new MongoExceptionFilter())

	// Enable CORS for all origins
	app.enableCors({
		origin: [
			'https://sharbi-fun-dev.vercel.app',
			'http://localhost:3000', // for local development
			'https://sharbi.buildverse.app',
			'https://sharbi.kvmanas.com',
		],
		methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
		allowedHeaders: [
			'Origin',
			'Accept',
			'Content-Type',
			'Authorization',
			'Referer',
			'User-Agent',
			'Access-Control-Allow-Origin',
			'Access-Control-Allow-Credentials',
			'Access-Control-Allow-Headers',
		],
		exposedHeaders: ['Authorization'],
		credentials: true,
		preflightContinue: false,
		optionsSuccessStatus: 204,
		maxAge: 3600, // Increase preflight cache duration
	})
	// Global timeout settings
	app.use((req, res, next) => {
		res.setTimeout(30000) // 30 seconds timeout
		next()
	})
	// app.enableCors({ origin: '*' })
	// Ensure the server is not already listening
	if (app.getHttpServer().listening) {
		console.warn('🚨 Server is already listening on the specified port.')
	} else {
		// Configure Swagger options
		const config = new DocumentBuilder()
			.setTitle('Web3 Backend API')
			.setDescription('API documentation for the Web3 backend application')
			.setVersion('1.0')
			.addBearerAuth()
			.build()

		const document = SwaggerModule.createDocument(app, config)

		SwaggerModule.setup('api', app, document, {
			swaggerOptions: {
				persistAuthorization: true,
				docExpansion: 'none',
				tagsSorter: 'alpha',
				operationsSorter: 'alpha',
			},
			customSiteTitle: 'My API Docs',
		})

		await app.listen(port)
		console.log(`🚀 Server is running on http://localhost:${port}`)
		console.log(`📚 Swagger UI available at http://localhost:${port}/api`)
	}
}

bootstrap()
