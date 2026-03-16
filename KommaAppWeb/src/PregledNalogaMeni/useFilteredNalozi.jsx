import { useMemo } from 'react'

const toTimestampStart = (dateString) => {
	if (!dateString) return null
	const date = new Date(`${dateString}T00:00:00`)
	const timestamp = date.getTime()
	return Number.isNaN(timestamp) ? null : timestamp
}

const toTimestampEnd = (dateString) => {
	if (!dateString) return null
	const date = new Date(`${dateString}T23:59:59.999`)
	const timestamp = date.getTime()
	return Number.isNaN(timestamp) ? null : timestamp
}

const toNalogTimestamp = (nalog) => {
	const raw = nalog.kreiran_na_datum
	if (!raw) return null
	const timestamp = new Date(raw).getTime()
	return Number.isNaN(timestamp) ? null : timestamp
}

function useFilteredNalozi({
	nalozi,
	nameFilter,
	klijentFilter,
	selectedStatuses,
	startDateFilter,
	endDateFilter,
	resolveKlijentNaziv,
	resolveAdresaNaziv,
	klijentiById,
	adreseById,
}) {
	return useMemo(
		() =>
			nalozi.filter((nalog) => {
				const nazivNaloga = (nalog.naziv_naloga ?? '').toString().toLowerCase()
				const klijentNaziv = resolveKlijentNaziv(nalog).toString().toLowerCase()
				const adresaNaloga = resolveAdresaNaziv(nalog).toString().toLowerCase()
				const statusNaloga = (nalog.status_naloga || 'aktivan').toString()
				const searchTerm = nameFilter.trim().toLowerCase()
				const klijentTerm = klijentFilter.trim().toLowerCase()
				const nalogTimestamp = toNalogTimestamp(nalog)
				const startTimestamp = toTimestampStart(startDateFilter)
				const endTimestamp = toTimestampEnd(endDateFilter)

				const matchesNameOrAdresa =
					!searchTerm || nazivNaloga.includes(searchTerm) || adresaNaloga.includes(searchTerm)
				const matchesKlijent = !klijentTerm || klijentNaziv.includes(klijentTerm)
				const matchesStatus = selectedStatuses.includes(statusNaloga)
				const matchesStartDate = !startTimestamp || (nalogTimestamp !== null && nalogTimestamp >= startTimestamp)
				const matchesEndDate = !endTimestamp || (nalogTimestamp !== null && nalogTimestamp <= endTimestamp)

				return matchesNameOrAdresa && matchesKlijent && matchesStatus && matchesStartDate && matchesEndDate
			}),
		[
			nalozi,
			nameFilter,
			klijentFilter,
			selectedStatuses,
			startDateFilter,
			endDateFilter,
			resolveKlijentNaziv,
			resolveAdresaNaziv,
			klijentiById,
			adreseById,
		],
	)
}

export default useFilteredNalozi
