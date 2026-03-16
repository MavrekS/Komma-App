import { useMemo, useState } from 'react'
import {
	createPutniNalozi,
	finishPutniNalog,
	getPutniNaloziForNalogAndRadnik,
} from '../services/putniNaloziApi'

const toDateOnlyString = (value) => {
	if (!value) return ''
	if (typeof value === 'string') {
		if (value.includes('T')) return value.split('T')[0]
		if (value.includes(' ')) return value.split(' ')[0]
		return value
	}
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return ''
	const year = parsed.getFullYear()
	const month = String(parsed.getMonth() + 1).padStart(2, '0')
	const day = String(parsed.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const formatDateOnly = (value) => {
	if (!value) return 'N/A'
	const parsed = new Date(`${value}T00:00:00`)
	if (Number.isNaN(parsed.getTime())) return value

	return parsed.toLocaleDateString('hr-HR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
}

function usePutniNaloziFlow({
	loggedInRadnikId,
	getRadniciForNalog,
	onExportPutniNalogPdf,
}) {
	const [putniModalVisible, setPutniModalVisible] = useState(false)
	const [selectedPutniNalog, setSelectedPutniNalog] = useState(null)
	const [putniRadnikIds, setPutniRadnikIds] = useState([])
	const [putniSvrha, setPutniSvrha] = useState('')
	const [putniPolazak, setPutniPolazak] = useState('')
	const [putniPovratak, setPutniPovratak] = useState('')
	const [finishPutniPickerVisible, setFinishPutniPickerVisible] = useState(false)
	const [finishPutniModalVisible, setFinishPutniModalVisible] = useState(false)
	const [finishPutniParentNalog, setFinishPutniParentNalog] = useState(null)
	const [finishPutniItems, setFinishPutniItems] = useState([])
	const [selectedFinishPutniId, setSelectedFinishPutniId] = useState('')
	const [finishPolazakDate, setFinishPolazakDate] = useState('')
	const [finishPolazakTime, setFinishPolazakTime] = useState('')
	const [finishDolazakDate, setFinishDolazakDate] = useState('')
	const [finishDolazakTime, setFinishDolazakTime] = useState('')
	const [finishTrosakSpavanja, setFinishTrosakSpavanja] = useState('')
	const [finishTrosakGoriva, setFinishTrosakGoriva] = useState('')
	const [finishTrosakMaterijala, setFinishTrosakMaterijala] = useState('')
	const [finishCestarinaTrajekt, setFinishCestarinaTrajekt] = useState('')
	const [finishOstalo, setFinishOstalo] = useState('')

	const putniRadniciItems = useMemo(() => {
		return getRadniciForNalog(selectedPutniNalog)
	}, [selectedPutniNalog, getRadniciForNalog])

	const selectedFinishPutniNalog = useMemo(
		() =>
			finishPutniItems.find(
				(item) => String(item.id_putnog_nalog) === String(selectedFinishPutniId),
			) || null,
		[finishPutniItems, selectedFinishPutniId],
	)

	const isPutniNalogAktivan = (item) => String(item?.status || '').trim().toLowerCase() === 'aktivan'

	const closeFinishPutniFlow = () => {
		setFinishPutniPickerVisible(false)
		setFinishPutniModalVisible(false)
		setFinishPutniParentNalog(null)
		setFinishPutniItems([])
		setSelectedFinishPutniId('')
		setFinishPolazakDate('')
		setFinishPolazakTime('')
		setFinishDolazakDate('')
		setFinishDolazakTime('')
		setFinishTrosakSpavanja('')
		setFinishTrosakGoriva('')
		setFinishTrosakMaterijala('')
		setFinishCestarinaTrajekt('')
		setFinishOstalo('')
	}

	const handleOpenPutniNalog = (nalog) => {
		const radniciZaNalog = getRadniciForNalog(nalog)
		if (radniciZaNalog.length === 0) {
			window.alert('Greška: Nalog nema dodijeljenih radnika')
			return
		}

		const loggedMatch = radniciZaNalog.find(
			(item) => Number(item.id_radnik) === Number(loggedInRadnikId),
		)
		const defaultIds = loggedMatch
			? [String(loggedMatch.id_radnik)]
			: [String(radniciZaNalog[0]?.id_radnik || '')].filter(Boolean)

		setSelectedPutniNalog(nalog)
		setPutniRadnikIds(defaultIds)
		setPutniSvrha('')
		setPutniPolazak('')
		setPutniPovratak('')
		setPutniModalVisible(true)
	}

	const handleOpenFinishPutniNalog = async (nalog) => {
		if (!Number.isInteger(loggedInRadnikId) || loggedInRadnikId <= 0) {
			window.alert('Greška: Neispravan korisnik za završetak putnog naloga')
			return
		}

		const result = await getPutniNaloziForNalogAndRadnik({
			idNalog: nalog.id_nalog,
			idRadnik: loggedInRadnikId,
			status: 'aktivan',
		})

		if (!result?.ok) {
			window.alert(`Greška: ${result?.error || 'Neuspješno učitavanje putnih naloga'}`)
			return
		}

		const items = result.data || []
		if (items.length === 0) {
			window.alert('Greška: Za odabrani nalog nemate aktivan putni nalog')
			return
		}

		setFinishPutniParentNalog(nalog)
		setFinishPutniItems(items)
		const firstAktivan = items.find((item) => isPutniNalogAktivan(item))
		setSelectedFinishPutniId(firstAktivan ? String(firstAktivan.id_putnog_nalog) : '')
		setFinishPolazakDate('')
		setFinishPolazakTime('')
		setFinishDolazakDate('')
		setFinishDolazakTime('')
		setFinishTrosakSpavanja('')
		setFinishTrosakGoriva('')
		setFinishTrosakMaterijala('')
		setFinishCestarinaTrajekt('')
		setFinishOstalo('')
		setFinishPutniPickerVisible(true)
	}

	const handleProceedFinishPutniSelection = () => {
		if (!selectedFinishPutniNalog) {
			window.alert('Greška: Odaberite putni nalog')
			return
		}

		if (!isPutniNalogAktivan(selectedFinishPutniNalog)) {
			window.alert('Greška: Putni nalog koji nije aktivan ne može se izvršiti')
			return
		}

		setFinishPutniPickerVisible(false)
		setFinishPutniModalVisible(true)
	}

	const handleCreatePutniNalogPdf = async () => {
		if (!selectedPutniNalog) {
			window.alert('Greška: Nalog nije odabran')
			return
		}

		const parsedRadniciIds = [...new Set((putniRadnikIds || []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))]
		if (parsedRadniciIds.length === 0) {
			window.alert('Greška: Odaberite najmanje jednog zaposlenika')
			return
		}

		if (!putniSvrha.trim()) {
			window.alert('Greška: Svrha putovanja je obavezna')
			return
		}

		if (!putniPolazak || !putniPovratak) {
			window.alert('Greška: Unesite datum polaska i datum povratka')
			return
		}

		const polazakDate = new Date(`${putniPolazak}T00:00:00`)
		const povratakDate = new Date(`${putniPovratak}T00:00:00`)
		if (Number.isNaN(polazakDate.getTime()) || Number.isNaN(povratakDate.getTime())) {
			window.alert('Greška: Neispravan datum')
			return
		}

		if (povratakDate < polazakDate) {
			window.alert('Greška: Datum povratka mora biti nakon datuma polaska')
			return
		}

		const payload = {
			id_nalog: Number(selectedPutniNalog.id_nalog),
			pocetak_naloga: putniPolazak,
			kraj_naloga: putniPovratak,
			svrha_putovanja: putniSvrha.trim(),
			id_radnici: parsedRadniciIds,
			actor_id_radnik:
				Number.isInteger(loggedInRadnikId) && loggedInRadnikId > 0 ? loggedInRadnikId : null,
		}

		const result = await createPutniNalozi(payload)
		if (!result?.ok) {
			window.alert(`Greška: ${result?.error || 'Neuspješno kreiranje putnog naloga'}`)
			return
		}

		const count = Number(result.insertedCount || parsedRadniciIds.length)
		if (count > 1) {
			window.alert(`Putni nalozi su uspješno kreirani za ${count} radnika`)
		} else {
			window.alert('Putni nalog je uspješno kreiran')
		}

		setPutniModalVisible(false)
	}

	const formatDateRangeLabel = (startValue, endValue) => {
		return `${formatDateOnly(toDateOnlyString(startValue))} - ${formatDateOnly(toDateOnlyString(endValue))}`
	}

	const handleFinishPutniNalogSubmit = async () => {
		if (!finishPutniParentNalog) {
			window.alert('Greška: Nalog nije odabran')
			return
		}

		if (!selectedFinishPutniNalog) {
			window.alert('Greška: Odaberite putni nalog')
			return
		}

		if (!isPutniNalogAktivan(selectedFinishPutniNalog)) {
			window.alert('Greška: Putni nalog koji nije aktivan ne može se izvršiti')
			return
		}

		if (!finishPolazakDate || !finishPolazakTime || !finishDolazakDate || !finishDolazakTime) {
			window.alert('Greška: Unesite datum i vrijeme polaska te datum i vrijeme dolaska')
			return
		}

		if (!Number.isInteger(loggedInRadnikId) || loggedInRadnikId <= 0) {
			window.alert('Greška: Neispravan korisnik za završetak putnog naloga')
			return
		}

		const vrijemePolaska = `${finishPolazakDate}T${finishPolazakTime}:00`
		const vrijemeDolaska = `${finishDolazakDate}T${finishDolazakTime}:00`
		const polazakTimestamp = new Date(vrijemePolaska).getTime()
		const dolazakTimestamp = new Date(vrijemeDolaska).getTime()

		if (Number.isNaN(polazakTimestamp) || Number.isNaN(dolazakTimestamp)) {
			window.alert('Greška: Neispravan datum ili vrijeme')
			return
		}

		if (dolazakTimestamp <= polazakTimestamp) {
			window.alert('Greška: Vrijeme dolaska mora biti nakon vremena polaska')
			return
		}

		const toFloatOrZero = (value) => {
			const trimmed = String(value ?? '').trim()
			if (!trimmed) return 0
			const normalized = trimmed.replace(',', '.')
			const parsed = Number(normalized)
			if (!Number.isFinite(parsed) || parsed < 0) return null
			return parsed
		}

		const trosakSpavanjaValue = toFloatOrZero(finishTrosakSpavanja)
		const trosakGorivaValue = toFloatOrZero(finishTrosakGoriva)
		const trosakMaterijalaValue = toFloatOrZero(finishTrosakMaterijala)
		const cestarinaTrajektValue = toFloatOrZero(finishCestarinaTrajekt)
		const ostaloValue = toFloatOrZero(finishOstalo)

		if (
			[trosakSpavanjaValue, trosakGorivaValue, trosakMaterijalaValue, cestarinaTrajektValue, ostaloValue].some(
				(value) => value === null,
			)
		) {
			window.alert('Greška: Troškovi moraju biti brojevi veći ili jednaki 0')
			return
		}

		const payload = {
			vrijeme_polaska: vrijemePolaska,
			vrijeme_dolaska: vrijemeDolaska,
			trosak_spavanja: trosakSpavanjaValue,
			trosak_goriva: trosakGorivaValue,
			trosak_materijala: trosakMaterijalaValue,
			cestarina_trajekt: cestarinaTrajektValue,
			ostalo: ostaloValue,
			actor_id_radnik: loggedInRadnikId,
		}

		const finishResult = await finishPutniNalog(selectedFinishPutniNalog.id_putnog_nalog, payload)
		if (!finishResult?.ok) {
			window.alert(`Greška: ${finishResult?.error || 'Neuspješan završetak putnog naloga'}`)
			return
		}

		const completedPutniNalog = {
			...selectedFinishPutniNalog,
			vrijeme_polaska: vrijemePolaska,
			vrijeme_dolaska: vrijemeDolaska,
			trosak_spavanja: trosakSpavanjaValue,
			trosak_goriva: trosakGorivaValue,
			trosak_materijala: trosakMaterijalaValue,
			cestarina_trajekt: cestarinaTrajektValue,
			ostalo: ostaloValue,
			status: 'izvršen',
		}

		await onExportPutniNalogPdf({
			nalog: finishPutniParentNalog,
			putniNalogRow: completedPutniNalog,
		})

		window.alert('Putni nalog je uspješno završen')
		closeFinishPutniFlow()
	}

	return {
		putniModalVisible,
		setPutniModalVisible,
		selectedPutniNalog,
		putniRadnikIds,
		setPutniRadnikIds,
		putniSvrha,
		setPutniSvrha,
		putniPolazak,
		setPutniPolazak,
		putniPovratak,
		setPutniPovratak,
		finishPutniPickerVisible,
		finishPutniModalVisible,
		finishPutniParentNalog,
		finishPutniItems,
		selectedFinishPutniId,
		setSelectedFinishPutniId,
		finishPolazakDate,
		setFinishPolazakDate,
		finishPolazakTime,
		setFinishPolazakTime,
		finishDolazakDate,
		setFinishDolazakDate,
		finishDolazakTime,
		setFinishDolazakTime,
		finishTrosakSpavanja,
		setFinishTrosakSpavanja,
		finishTrosakGoriva,
		setFinishTrosakGoriva,
		finishTrosakMaterijala,
		setFinishTrosakMaterijala,
		finishCestarinaTrajekt,
		setFinishCestarinaTrajekt,
		finishOstalo,
		setFinishOstalo,
		putniRadniciItems,
		selectedFinishPutniNalog,
		isPutniNalogAktivan,
		closeFinishPutniFlow,
		handleOpenPutniNalog,
		handleOpenFinishPutniNalog,
		handleProceedFinishPutniSelection,
		handleCreatePutniNalogPdf,
		handleFinishPutniNalogSubmit,
		formatDateRangeLabel,
	}
}

export default usePutniNaloziFlow
