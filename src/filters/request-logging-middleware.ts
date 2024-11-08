import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
	use(req: Request, res: Response, next: NextFunction) {
		const startTime = Date.now()

		console.log(
			`[${new Date().toISOString()}] Incoming ${req.method} ${req.url}`,
		)
		console.log('Headers:', req.headers)

		// Log response
		res.on('finish', () => {
			const duration = Date.now() - startTime
			console.log(
				`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`,
			)
		})

		// Log if connection is aborted
		req.on('close', () => {
			if (!res.finished) {
				console.log(
					`[${new Date().toISOString()}] Connection closed by client before response completion`,
				)
			}
		})

		next()
	}
}
