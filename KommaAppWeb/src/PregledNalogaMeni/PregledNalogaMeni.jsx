import { useEffect, useMemo, useState } from 'react'
import './PregledNalogaMeni.css'
import { getAllNalozi } from '../services/naloziApi'
import { getAllKlijenti } from '../services/klijentiApi'
import { getAllAdrese } from '../services/adreseApi'
import { getAllKontakti } from '../services/kontaktiApi'
import { getAllRadnici } from '../services/radniciApi'
import { getAllRadniDani } from '../services/radniDanApi'
import PregledNalogaFilters from './PregledNalogaFilters'
import PregledNalogaHeader from './PregledNalogaHeader'
import PregledNalogaTable from './PregledNalogaTable'
import PregledNalogaEditModal from './PregledNalogaEditModal'
import PregledNalogaPutniCreateModal from './PregledNalogaPutniCreateModal'
import PregledNalogaPutniPickerModal from './PregledNalogaPutniPickerModal'
import PregledNalogaPutniFinishModal from './PregledNalogaPutniFinishModal'
import PregledNalogaFinishModal from './PregledNalogaFinishModal'
import useFilteredNalozi from './useFilteredNalozi'
import usePutniNaloziFlow from './usePutniNaloziFlow'
import useFinishNalogFlow from './useFinishNalogFlow'
import useEditNalogFlow from './useEditNalogFlow'
import { getTvrtka } from '../services/tvrtkaApi'
import { createPutniNalogPdf, createRadniNalogPdf } from './potpisivanjePdf'

function PregledNalogaMeni({ loggedInUser }) {
	const HR_DATE_FORMAT = { day: '2-digit', month: '2-digit', year: 'numeric' }

	const [nalozi, setNalozi] = useState([])
	const [klijentiItems, setKlijentiItems] = useState([])
	const [adreseItems, setAdreseItems] = useState([])
	const [kontaktiItems, setKontaktiItems] = useState([])
	const [radniciItems, setRadniciItems] = useState([])
	const [radniDani, setRadniDani] = useState([])
	const [poslodavac, setPoslodavac] = useState({
		naziv: 'Komma d.o.o.',
		adresa: 'N/A',
		postanskiBroj: 'N/A',
		jeHrvatska: true,
		oib: 'N/A',
	})
	const [klijentiById, setKlijentiById] = useState({})
	const [adreseById, setAdreseById] = useState({})
	const [nameFilter, setNameFilter] = useState('')
	const [klijentFilter, setKlijentFilter] = useState('')
	const [startDateFilter, setStartDateFilter] = useState('')
	const [endDateFilter, setEndDateFilter] = useState('')
	const [selectedStatuses, setSelectedStatuses] = useState([
		'aktivan',
		'neaktivan',
		'izvrseni',
		'ponisteni',
	])


	const allowedStatuses = ['aktivan', 'neaktivan', 'izvrseni', 'ponisteni']
	const role = String(loggedInUser?.role || 'user').toLowerCase()
	const loggedInRadnikId = Number(loggedInUser?.id_radnik)
	const canManageNalog = role !== 'user'
	const canEditOpisOnly = role === 'user'

	const nalogFilterRadnikId =
		role === 'user' && Number.isInteger(loggedInRadnikId) && loggedInRadnikId > 0
			? loggedInRadnikId
			: null

	const toggleStatusSelection = (status) => {
		setSelectedStatuses((prev) =>
			prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status],
		)
	}

	const resetStatusSelection = () => {
		setSelectedStatuses(allowedStatuses)
	}

	const resetFilters = () => {
		setNameFilter('')
		setKlijentFilter('')
		setStartDateFilter('')
		setEndDateFilter('')
		setSelectedStatuses(allowedStatuses)
	}

	useEffect(() => {
		loadNalozi()
	}, [nalogFilterRadnikId])

	useEffect(() => {
		const loadTvrtka = async () => {
			const result = await getTvrtka()
			if (result?.ok && result.data) {
				setPoslodavac({
					naziv: String(result.data.naziv || 'Komma d.o.o.'),
					adresa: String(result.data.adresa || 'N/A'),
					postanskiBroj: String(result.data.postanski_broj || result.data.postanskiBroj || 'N/A'),
					jeHrvatska: Boolean(result.data.jeHrvatska),
					oib: String(result.data.oib || 'N/A'),
				})
			}
		}

		loadTvrtka()
	}, [])

	const loadNalozi = async () => {
		try {
			const [naloziResult, klijentiResult, adreseResult, kontaktiResult, radniciResult, radniDaniResult] = await Promise.all([
				getAllNalozi(nalogFilterRadnikId),
				getAllKlijenti(),
				getAllAdrese(),
				getAllKontakti(),
				getAllRadnici(),
				getAllRadniDani(),
			])

			if (naloziResult.ok) {
				setNalozi(naloziResult.data || [])
			} else {
				setNalozi([])
			}

			if (klijentiResult.ok) {
				setKlijentiItems(klijentiResult.data || [])
				const mappedKlijenti = (klijentiResult.data || []).reduce((acc, klijent) => {
					acc[String(klijent.id_klijent)] = klijent.naziv_klijenta
					return acc
				}, {})
				setKlijentiById(mappedKlijenti)
			} else {
				setKlijentiItems([])
				setKlijentiById({})
			}

			if (adreseResult.ok) {
				setAdreseItems(adreseResult.data || [])
				const mappedAdrese = (adreseResult.data || []).reduce((acc, adresa) => {
					acc[String(adresa.id_adresa)] = adresa.adresa
					return acc
				}, {})
				setAdreseById(mappedAdrese)
			} else {
				setAdreseItems([])
				setAdreseById({})
			}

			if (kontaktiResult.ok) {
				setKontaktiItems(kontaktiResult.data || [])
			} else {
				setKontaktiItems([])
			}

			if (radniciResult.ok) {
				setRadniciItems(radniciResult.data || [])
			} else {
				setRadniciItems([])
			}

			if (radniDaniResult.ok) {
				setRadniDani(radniDaniResult.data || [])
			} else {
				setRadniDani([])
			}
		} catch {
			window.alert('Greška: Nije moguće učitati naloge')
		}
	}

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

	const timeToSeconds = (value) => {
		if (!value) return null
		const raw = String(value)
		const timePart = raw.match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
		if (!timePart) return null
		const hours = Number(timePart[1])
		const minutes = Number(timePart[2])
		const seconds = Number(timePart[3] || '0')
		if ([hours, minutes, seconds].some((num) => Number.isNaN(num))) return null
		return hours * 3600 + minutes * 60 + seconds
	}

	const formatSecondsToHoursLabel = (totalSeconds) => {
		if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0 h'
		const totalMinutes = Math.round(totalSeconds / 60)
		const hours = Math.floor(totalMinutes / 60)
		const minutes = totalMinutes % 60
		if (minutes === 0) return `${hours} h`
		return `${hours} h ${minutes} min`
	}

	const formatTimeValue = (value) => {
		if (!value) return 'N/A'
		const match = String(value).match(/(\d{2}:\d{2})/)
		return match ? match[1] : String(value)
	}

	const resolveKlijentDetails = (nalog) => {
		const klijentId = Number(nalog.klijent)
		if (!Number.isInteger(klijentId) || klijentId <= 0) {
			return {
				naziv: resolveKlijentNaziv(nalog),
				adresa: 'N/A',
				oib: 'N/A',
			}
		}

		const matched = klijentiItems.find((item) => Number(item.id_klijent) === klijentId)
		return {
			naziv: matched?.naziv_klijenta || resolveKlijentNaziv(nalog),
			adresa: matched?.sjedište || matched?.sjediste || 'N/A',
			oib: matched?.oib || 'N/A',
		}
	}

	const getNalogSummaryForPdf = (nalog) => {
		const nalogId = Number(nalog.id_nalog)
		const rows = radniDani.filter((item) => Number(item.id_nalog) === nalogId)
		const workRows = rows.filter(
			(item) => String(item.status_radnog_dana || '').trim().toLowerCase() === 'radni_dan',
		)

		const workerLabels = [
			...new Set(
				workRows
					.map((item) => {
						const imePrezime = [item.ime, item.prezime].filter(Boolean).join(' ').trim()
						if (imePrezime) return imePrezime
						if (item.radnik_username) return String(item.radnik_username)
						const id = Number(item.id_radnik)
						if (Number.isInteger(id) && id > 0) return radniciById[String(id)] || `ID ${id}`
						return null
					})
					.filter(Boolean),
			),
		]

		const fallbackWorkerLabels = parseCsvIds(nalog.id_radnici_csv)
			.map((id) => radniciById[id] || `ID ${id}`)
			.filter(Boolean)
		const distinctDates = new Set(workRows.map((item) => toDateOnlyString(item.datum_rada)).filter(Boolean))

		let totalSeconds = 0
		let minPocetakRada = null
		let maxKrajRada = null

		workRows.forEach((item) => {
			const pocetakSeconds = timeToSeconds(item.pocetak_rada)
			const krajSeconds = timeToSeconds(item.kraj_rada)
			if (pocetakSeconds !== null && krajSeconds !== null && krajSeconds >= pocetakSeconds) {
				totalSeconds += krajSeconds - pocetakSeconds
			}

			if (pocetakSeconds !== null && (minPocetakRada === null || pocetakSeconds < minPocetakRada)) {
				minPocetakRada = pocetakSeconds
			}

			if (krajSeconds !== null && (maxKrajRada === null || krajSeconds > maxKrajRada)) {
				maxKrajRada = krajSeconds
			}
		})

		const toClockText = (seconds) => {
			if (!Number.isFinite(seconds)) return 'N/A'
			const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
			const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
			return `${hours}:${minutes}`
		}

		return {
			workerList: workerLabels.length > 0 ? workerLabels.join(', ') : fallbackWorkerLabels.join(', ') || 'N/A',
			totalHoursLabel: formatSecondsToHoursLabel(totalSeconds),
			isSingleDay: distinctDates.size <= 1,
			arrivalCount: distinctDates.size,
			pocetakRada: minPocetakRada === null ? 'N/A' : toClockText(minPocetakRada),
			krajRada: maxKrajRada === null ? 'N/A' : toClockText(maxKrajRada),
		}
	}

	const handleExportPdf = async (nalog, options = {}) => {
		await createRadniNalogPdf({
			nalog,
			options,
			poslodavac,
			resolveKlijentDetails,
			getNalogSummaryForPdf,
			resolveKontaktNaziv,
			resolveKontaktTelefon,
			resolveAdresaNaziv,
			formatDate,
		})
	}

	const {
		finishModalVisible,
		finishingNalog,
		signatureCanvasRef,
		handleSignatureStart,
		handleSignatureMove,
		handleSignatureEnd,
		clearSignature,
		closeFinishModal,
		handleOpenFinishNalog,
		handleFinishNalog,
	} = useFinishNalogFlow({
		loggedInRadnikId,
		onExportPdf: handleExportPdf,
		onReloadNalozi: loadNalozi,
	})

	const resolveKlijentNaziv = (nalog) => {
		const rawKlijent = nalog.klijent
		const byExact = klijentiById[String(rawKlijent)]
		if (byExact) return byExact

		const parsedId = Number(rawKlijent)
		if (Number.isInteger(parsedId) && parsedId > 0) {
			return klijentiById[String(parsedId)] || String(rawKlijent)
		}

		return rawKlijent || 'N/A'
	}

	const resolveAdresaNaziv = (nalog) => {
		const rawAdresa = nalog.adresa
		const byExact = adreseById[String(rawAdresa)]
		if (byExact) return byExact

		const parsedId = Number(rawAdresa)
		if (Number.isInteger(parsedId) && parsedId > 0) {
			return adreseById[String(parsedId)] || String(rawAdresa)
		}

		return rawAdresa || 'N/A'
	}

	const resolveKontaktNaziv = (nalog) => {
		if (nalog.kontakt_naziv) return nalog.kontakt_naziv

		const kontaktId = Number(nalog.id_kontakt)
		if (!Number.isInteger(kontaktId) || kontaktId <= 0) return 'N/A'

		const matched = kontaktiItems.find((item) => Number(item.id_kontakt) === kontaktId)
		return matched?.naziv || `ID ${kontaktId}`
	}

	const resolveKontaktTelefon = (nalog) => {
		if (nalog.kontakt_telefon) return nalog.kontakt_telefon

		const kontaktId = Number(nalog.id_kontakt)
		if (!Number.isInteger(kontaktId) || kontaktId <= 0) return 'N/A'

		const matched = kontaktiItems.find((item) => Number(item.id_kontakt) === kontaktId)
		return matched?.telefonski_broj || 'N/A'
	}

	const parseCsvIds = (value) =>
		String(value || '')
			.split(',')
			.map((part) => part.trim())
			.filter((part) => part)

	const getRadniciForNalog = (nalog) => {
		if (!nalog) return []

		const parsedIds = parseCsvIds(nalog.id_radnici_csv)
		const voditeljId = String(nalog.voditelj_naloga || '').trim()
		const allIds = voditeljId && !parsedIds.includes(voditeljId) ? [...parsedIds, voditeljId] : parsedIds

		return allIds.map((id) => {
			const matched = radniciItems.find((item) => String(item.id_radnik) === String(id))
			if (matched) return matched

			return {
				id_radnik: id,
				username: `ID ${id}`,
				ime: '',
				prezime: '',
				zanimanje: 'N/A',
				oib: '',
			}
		})
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

	const getPutniNalogBroj = (radnik) => {
		const usernameRaw = String(radnik?.username || 'KORISNIK')
		const username = usernameRaw
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '')
			.toUpperCase() || 'KORISNIK'

		const validDate = new Date()
		const y = validDate.getFullYear()
		const m = String(validDate.getMonth() + 1).padStart(2, '0')
		const d = String(validDate.getDate()).padStart(2, '0')
		const hh = String(validDate.getHours()).padStart(2, '0')
		const mm = String(validDate.getMinutes()).padStart(2, '0')

		return `${username}-${y}${m}${d}-${hh}${mm}`
	}

	const exportPutniNalogPdf = async ({ nalog, putniNalogRow }) => {
		await createPutniNalogPdf({
			nalog,
			putniNalogRow,
			radniciItems,
			poslodavac,
			resolveAdresaNaziv,
			getPutniNalogBroj,
			formatDateOnly,
			toDateOnlyString,
		})
	}

	const {
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
	} = usePutniNaloziFlow({
		loggedInRadnikId,
		getRadniciForNalog,
		onExportPutniNalogPdf: exportPutniNalogPdf,
	})

	const radniciById = useMemo(() => {
		return radniciItems.reduce((acc, item) => {
			acc[String(item.id_radnik)] = item.username
			return acc
		}, {})
	}, [radniciItems])

	const resolveVoditeljNaziv = (nalog) => {
		if (nalog.voditelj_username) return nalog.voditelj_username
		const voditeljId = Number(nalog.voditelj_naloga)
		if (Number.isInteger(voditeljId) && voditeljId > 0) {
			return radniciById[String(voditeljId)] || `ID ${voditeljId}`
		}
		return 'N/A'
	}

	const resolveRadniciNazivi = (nalog) => {
		if (nalog.radnici_usernames) return nalog.radnici_usernames

		const ids = parseCsvIds(nalog.id_radnici_csv)
		if (ids.length === 0) return 'N/A'

		const names = ids.map((id) => radniciById[id] || `ID ${id}`)
		return names.join(', ')
	}

	const formatDate = (dateString) => {
		if (!dateString) return 'N/A'
		try {
			let datePart = dateString
			if (dateString.includes('T')) {
				datePart = dateString.split('T')[0]
			} else if (dateString.includes(' ')) {
				datePart = dateString.split(' ')[0]
			}

			const [year, month, day] = datePart.split('-')
			const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
			return date.toLocaleDateString('hr-HR', HR_DATE_FORMAT)
		} catch {
			return 'N/A'
		}
	}

	const isUserVoditeljForNalog = (nalog) => {
		if (!canEditOpisOnly) return false
		if (!Number.isInteger(loggedInRadnikId) || loggedInRadnikId <= 0) return false
		return Number(nalog?.voditelj_naloga) === loggedInRadnikId
	}

	const canEditNalogItem = (nalog) => canManageNalog || isUserVoditeljForNalog(nalog)

	const {
		modalVisible,
		editingNalog,
		editNazivNaloga,
		setEditNazivNaloga,
		editKlijent,
		setEditKlijent,
		editAdresa,
		setEditAdresa,
		editKontakt,
		setEditKontakt,
		editMaterijal,
		setEditMaterijal,
		editOprema,
		setEditOprema,
		editPocetakNaloga,
		setEditPocetakNaloga,
		editIzvrsitiDo,
		setEditIzvrsitiDo,
		editVoditeljNaloga,
		setEditVoditeljNaloga,
		editRadnici,
		setEditRadnici,
		editOpisPosla,
		setEditOpisPosla,
		editStatusNaloga,
		setEditStatusNaloga,
		editVoditeljiItems,
		handleOpenEdit,
		handleSaveEdit,
		hideEditModal,
		closeEditModal,
	} = useEditNalogFlow({
		canEditNalogItem,
		canEditOpisOnly,
		loggedInRadnikId,
		allowedStatuses,
		klijentiItems,
		adreseItems,
		kontaktiItems,
		radniciItems,
		onReloadNalozi: loadNalozi,
	})

	const filteredNalozi = useFilteredNalozi({
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
	})

	return (
		<section className="pregled-naloga-screen">
			<PregledNalogaFilters
				nameFilter={nameFilter}
				klijentFilter={klijentFilter}
				startDateFilter={startDateFilter}
				endDateFilter={endDateFilter}
				onNameFilterChange={setNameFilter}
				onKlijentFilterChange={setKlijentFilter}
				onStartDateFilterChange={setStartDateFilter}
				onEndDateFilterChange={setEndDateFilter}
				onResetFilters={resetFilters}
			/>

			<PregledNalogaHeader
				allowedStatuses={allowedStatuses}
				selectedStatuses={selectedStatuses}
				onToggleStatus={toggleStatusSelection}
				onResetStatusSelection={resetStatusSelection}
			/>

			<div className="pregled-naloga-list">
				<PregledNalogaTable
					filteredNalozi={filteredNalozi}
					loggedInRadnikId={loggedInRadnikId}
					canEditNalogItem={canEditNalogItem}
					canEditOpisOnly={canEditOpisOnly}
					formatDate={formatDate}
					resolveKlijentNaziv={resolveKlijentNaziv}
					resolveAdresaNaziv={resolveAdresaNaziv}
					resolveKontaktNaziv={resolveKontaktNaziv}
					resolveKontaktTelefon={resolveKontaktTelefon}
					resolveVoditeljNaziv={resolveVoditeljNaziv}
					resolveRadniciNazivi={resolveRadniciNazivi}
					onExportPdf={handleExportPdf}
					onOpenPutniNalog={handleOpenPutniNalog}
					onOpenFinishPutniNalog={handleOpenFinishPutniNalog}
					onOpenFinishNalog={handleOpenFinishNalog}
					onOpenEdit={handleOpenEdit}
				/>
			</div>

			<PregledNalogaEditModal
				visible={modalVisible}
				canEditOpisOnly={canEditOpisOnly}
				editNazivNaloga={editNazivNaloga}
				onEditNazivNalogaChange={setEditNazivNaloga}
				editKlijent={editKlijent}
				onEditKlijentChange={setEditKlijent}
				editAdresa={editAdresa}
				onEditAdresaChange={setEditAdresa}
				editKontakt={editKontakt}
				onEditKontaktChange={setEditKontakt}
				editPocetakNaloga={editPocetakNaloga}
				onEditPocetakNalogaChange={setEditPocetakNaloga}
				editIzvrsitiDo={editIzvrsitiDo}
				onEditIzvrsitiDoChange={setEditIzvrsitiDo}
				editVoditeljNaloga={editVoditeljNaloga}
				onEditVoditeljNalogaChange={setEditVoditeljNaloga}
				editRadnici={editRadnici}
				onEditRadniciChange={setEditRadnici}
				editOprema={editOprema}
				onEditOpremaChange={setEditOprema}
				editMaterijal={editMaterijal}
				onEditMaterijalChange={setEditMaterijal}
				editOpisPosla={editOpisPosla}
				onEditOpisPoslaChange={setEditOpisPosla}
				editStatusNaloga={editStatusNaloga}
				onEditStatusNalogaChange={setEditStatusNaloga}
				allowedStatuses={allowedStatuses}
				klijentiItems={klijentiItems}
				adreseItems={adreseItems}
				kontaktiItems={kontaktiItems}
				radniciItems={radniciItems}
				editVoditeljiItems={editVoditeljiItems}
				editingNalog={editingNalog}
				resolveKontaktTelefon={resolveKontaktTelefon}
				formatDate={formatDate}
				onOverlayClose={hideEditModal}
				onCancel={closeEditModal}
				onSave={handleSaveEdit}
			/>

			<PregledNalogaPutniCreateModal
				visible={putniModalVisible}
				poslodavac={poslodavac}
				putniRadnikIds={putniRadnikIds}
				onPutniRadnikIdsChange={setPutniRadnikIds}
				putniRadniciItems={putniRadniciItems}
				selectedPutniNalog={selectedPutniNalog}
				resolveAdresaNaziv={resolveAdresaNaziv}
				putniSvrha={putniSvrha}
				onPutniSvrhaChange={setPutniSvrha}
				putniPolazak={putniPolazak}
				onPutniPolazakChange={setPutniPolazak}
				putniPovratak={putniPovratak}
				onPutniPovratakChange={setPutniPovratak}
				onClose={() => setPutniModalVisible(false)}
				onSave={handleCreatePutniNalogPdf}
			/>

			<PregledNalogaPutniPickerModal
				visible={finishPutniPickerVisible}
				finishPutniParentNalog={finishPutniParentNalog}
				selectedFinishPutniId={selectedFinishPutniId}
				onSelectedFinishPutniIdChange={setSelectedFinishPutniId}
				finishPutniItems={finishPutniItems}
				isPutniNalogAktivan={isPutniNalogAktivan}
				formatDateRangeLabel={formatDateRangeLabel}
				selectedFinishPutniNalog={selectedFinishPutniNalog}
				onClose={closeFinishPutniFlow}
				onProceed={handleProceedFinishPutniSelection}
			/>

			<PregledNalogaPutniFinishModal
				visible={finishPutniModalVisible}
				finishPutniParentNalog={finishPutniParentNalog}
				selectedFinishPutniNalog={selectedFinishPutniNalog}
				formatDateRangeLabel={formatDateRangeLabel}
				finishPolazakDate={finishPolazakDate}
				onFinishPolazakDateChange={setFinishPolazakDate}
				finishPolazakTime={finishPolazakTime}
				onFinishPolazakTimeChange={setFinishPolazakTime}
				finishDolazakDate={finishDolazakDate}
				onFinishDolazakDateChange={setFinishDolazakDate}
				finishDolazakTime={finishDolazakTime}
				onFinishDolazakTimeChange={setFinishDolazakTime}
				finishTrosakSpavanja={finishTrosakSpavanja}
				onFinishTrosakSpavanjaChange={setFinishTrosakSpavanja}
				finishTrosakGoriva={finishTrosakGoriva}
				onFinishTrosakGorivaChange={setFinishTrosakGoriva}
				finishTrosakMaterijala={finishTrosakMaterijala}
				onFinishTrosakMaterijalaChange={setFinishTrosakMaterijala}
				finishCestarinaTrajekt={finishCestarinaTrajekt}
				onFinishCestarinaTrajektChange={setFinishCestarinaTrajekt}
				finishOstalo={finishOstalo}
				onFinishOstaloChange={setFinishOstalo}
				onClose={closeFinishPutniFlow}
				onConfirm={handleFinishPutniNalogSubmit}
			/>

			<PregledNalogaFinishModal
				visible={finishModalVisible}
				finishingNalog={finishingNalog}
				signatureCanvasRef={signatureCanvasRef}
				onSignatureStart={handleSignatureStart}
				onSignatureMove={handleSignatureMove}
				onSignatureEnd={handleSignatureEnd}
				onClearSignature={clearSignature}
				onClose={closeFinishModal}
				onConfirm={handleFinishNalog}
			/>
		</section>
	)
}

export default PregledNalogaMeni
