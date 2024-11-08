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

	app.useGlobalFilters(new MongoExceptionFilter())

	// Enhanced CORS configuration
	app.enableCors({
		origin: true, // or specify your domains: ['https://yourdomain.com']
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
		credentials: true,
		maxAge: 3600, // Cache preflight requests for 1 hour
	})

	// Improved timeout and header settings
	app.use((req, res, next) => {
		// Set necessary headers for Safari
		res.setHeader('Keep-Alive', 'timeout=30, max=100')
		res.setHeader('Connection', 'keep-alive')

		// Increase timeout for Safari
		res.setTimeout(60000) // 60 seconds timeout

		// Add Cache-Control headers
		res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
		res.setHeader('Pragma', 'no-cache')
		res.setHeader('Expires', '0')

		next()
	})

	// Swagger configuration
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

	// Error handling for the server startup
	try {
		await app.listen(port)
		console.log(`🚀 Server is running on http://localhost:${port}`)
		console.log(`📚 Swagger UI available at http://localhost:${port}/api`)
	} catch (error) {
		console.error('Failed to start server:', error)
		process.exit(1)
	}
}

bootstrap().catch(err => {
	console.error('Bootstrap failed:', err)
	process.exit(1)
})
