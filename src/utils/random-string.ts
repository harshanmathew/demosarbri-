export const randomUsername = () => {
	const cryptoTerms = [
		'Crypto',
		'Bitcoin',
		'Ethereum',
		'Blockchain',
		'DeFi',
		'NFT',
		'Token',
		'Altcoin',
		'Satoshi',
		'Hash',
		'HODL',
		'Moon',
		'Bull',
		'Bear',
		'Shiba',
		'Doge',
		'Vitalik',
		'Bullish',
		'Bearish',
		'Decentralized',
		'Digital',
		'Virtual',
		'Encrypted',
		'Anonymous',
		'Volatile',
		'Innovative',
		'Disruptive',
		'Smart',
		'Distributed',
	]
	const roles = [
		'Ninja',
		'Disciple',
		'Wizard',
		'Emperor',
		'Baroness',
		'Alchemist',
		'Dragon',
		'Titan',
		'Miner',
		'Hero',
		'Knight',
		'Dynamo',
		'Sage',
		'Nomad',
		'Rider',
		'Pirate',
		'Viking',
		'Samurai',
		'Warrior',
		'Soldier',
		'Whale',
		'Guru',
		'Master',
		'God',
		'King',
		'Angel',
		'Pharaoh',
		'Demon',
		'Ghost',
	]

	const randomFirstName =
		cryptoTerms[Math.floor(Math.random() * cryptoTerms.length)]
	const randomLastName = roles[Math.floor(Math.random() * roles.length)]
	const randomDigits = Math.floor(Math.random() * 10)
	const randomDigits2 = generateRandomString(4)

	return `${randomFirstName}${randomLastName}${randomDigits}${randomDigits2}`
}

export const generateRandomString = (length: number) => {
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let result = ''
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length))
	}
	return result
}
