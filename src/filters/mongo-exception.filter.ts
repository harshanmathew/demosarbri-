import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { MongoServerError } from 'mongodb' // Use MongoServerError instead of MongoError if needed
import { Error as MongooseError } from 'mongoose' // Import MongooseError

@Catch(MongoServerError, MongooseError.ValidationError)
export class MongoExceptionFilter implements ExceptionFilter {
	catch(
		exception: MongoServerError | MongooseError.ValidationError,
		host: ArgumentsHost,
	) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = 'An internal server error occurred'

		// Handle specific MongoDB errors here
		if (exception instanceof MongoServerError) {
			if (exception.code === 11000) {
				status = HttpStatus.BAD_REQUEST
				message =
					'Duplicate key error: A record with this value already exists.'
			}
		} else if (exception instanceof MongooseError.ValidationError) {
			status = HttpStatus.BAD_REQUEST
			message = `Validation error: ${Object.values(exception.errors)
				.map(e => e.message)
				.join(', ')}`
		}

		response.status(status).json({
			statusCode: status,
			message: message,
			error: exception.message,
		})
	}
}
