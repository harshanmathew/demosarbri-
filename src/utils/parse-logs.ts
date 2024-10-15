import {
	Abi,
	ContractEventName,
	DecodeEventLogReturnType,
	Hex,
	Log,
	decodeEventLog,
} from 'viem'

export type LogsType = Log & { topics: any }

type DecodedEventLog<
	Tabi extends Abi,
	TeventName extends ContractEventName<Tabi>,
> = DecodeEventLogReturnType<Tabi, TeventName>

export type EventTypeFromAbi<Tabi extends Abi> = ReturnType<
	typeof decodeEventLog<Tabi, ContractEventName<Tabi>>
>

export function parseLogs<
	Tabi extends Abi,
	TeventName extends ContractEventName<Tabi>,
>(logs: LogsType[], abi: Tabi): DecodedEventLog<Tabi, TeventName>[] {
	return logs
		.map(log => {
			try {
				return decodeEventLog({
					abi,
					data: log.data,
					topics: log.topics,
				}) as DecodedEventLog<Tabi, TeventName>
			} catch (e) {
				return null
			}
		})
		.filter((log): log is DecodedEventLog<Tabi, TeventName> => log !== null)
}

export function parseLog<
	Tabi extends Abi,
	TeventName extends ContractEventName<Tabi>,
>(log: LogsType, abi: Tabi): DecodedEventLog<Tabi, TeventName> {
	try {
		return decodeEventLog({
			abi,
			data: log.data,
			topics: log.topics,
		}) as DecodedEventLog<Tabi, TeventName>
	} catch (e) {
		return null
	}
}
