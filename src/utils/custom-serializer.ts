export const customSerializer = {
	serialize: (data: any): string => {
		return JSON.stringify(data, (_, value) =>
			typeof value === 'bigint' ? value.toString() : value,
		)
	},
	deserialize: (data: string): any => {
		return JSON.parse(data, (_, value) => {
			if (typeof value === 'string' && /^\d+n$/.test(value)) {
				return BigInt(value.slice(0, -1))
			}
			return value
		})
	},
}
