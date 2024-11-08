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
		origin: true,
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
		allowedHeaders: [
			'Origin',
			'X-Requested-With',
			'Content-Type',
			'Accept',
			'Authorization',
			'Access-Control-Request-Method',
			'Access-Control-Request-Headers',
		],
		exposedHeaders: ['Content-Length', 'Content-Type'],
		credentials: true,
		maxAge: 3600,
	})

	// Improved timeout and header settings
	// Middleware to handle Safari-specific requirements
	app.use((req, res, next) => {
		// Force HTTP/1.1 for Safari
		res.setHeader('Connection', 'keep-alive')
		res.setHeader('Keep-Alive', 'timeout=60, max=1000')

		// Ensure proper content type for API responses
		res.setHeader('Content-Type', 'application/json; charset=utf-8')

		// Handle WebSocket protocol forwarding
		if (req.headers['x-forwarded-proto'] === 'ws,wss') {
			req.headers['x-forwarded-proto'] = 'https'
		}

		const userAgent = req.headers['user-agent'] || ''
		const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent)

		// Set proper content headers for Safari
		if (isSafari) {
			res.setHeader('Content-Type', 'application/json; charset=utf-8')
			res.setHeader('X-Content-Type-Options', 'nosniff')
			res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
			res.setHeader('Pragma', 'no-cache')
		}

		// Add security headers
		res.setHeader('X-Content-Type-Options', 'nosniff')
		res.setHeader(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains',
		)

		// Handle preflight
		if (req.method === 'OPTIONS') {
			res.status(200).end()
			return
		}

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
