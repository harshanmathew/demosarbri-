export const decimalToBigInt = (decimal: number, decimals = 18): bigint => {
	const str = decimal.toString()
	const [whole, fraction = ''] = str.split('.')
	const paddedFraction = fraction.padEnd(decimals, '0')
	return BigInt(whole + paddedFraction)
}
