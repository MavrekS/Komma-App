import { useEffect, useMemo, useState } from 'react'
import './ProvjeraUnosaMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabDatePicker from '../TabComponents/TabDatePicker'
import TabButton from '../TabComponents/TabButton'
import { getAllRadnici } from '../services/radniciApi'
import { getAllRadniDani } from '../services/radniDanApi'

const toDateKey = (date) => {
	if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const parseDateKey = (value) => {
	const normalized = String(value || '').trim()
	if (!normalized) return null

	const datePart = normalized.includes('T')
		? normalized.split('T')[0]
		: normalized.includes(' ')
			? normalized.split(' ')[0]
			: normalized

	const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!match) return null

	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null

	const parsed = new Date(year, month - 1, day)
	if (
		Number.isNaN(parsed.getTime()) ||
		parsed.getFullYear() !== year ||
		parsed.getMonth() !== month - 1 ||
		parsed.getDate() !== day
	) {
		return null
	}

	return parsed
}

const isWeekday = (date) => {
	const dayOfWeek = date.getDay()
	return dayOfWeek >= 1 && dayOfWeek <= 5
}

const getWeekdayKeysInRange = (startDate, endDate) => {
	if (!startDate || !endDate) return []

	const start = new Date(startDate)
	start.setHours(0, 0, 0, 0)
	const end = new Date(endDate)
	end.setHours(0, 0, 0, 0)

	if (end < start) return []

	const keys = []
	const cursor = new Date(start)
	while (cursor <= end) {
		if (isWeekday(cursor)) {
			keys.push(toDateKey(cursor))
		}
		cursor.setDate(cursor.getDate() + 1)
	}

	return keys
}

const formatDateToHr = (dateKey) => {
	const parsed = parseDateKey(dateKey)
	if (!parsed) return dateKey
	const day = String(parsed.getDate()).padStart(2, '0')
	const month = String(parsed.getMonth() + 1).padStart(2, '0')
	const year = parsed.getFullYear()
	return `${day}.${month}.${year}`
}

function ProvjeraUnosaMeni() {
	const [radnici, setRadnici] = useState([])
	const [radniDani, setRadniDani] = useState([])
	const [odDatuma, setOdDatuma] = useState(null)
	const [doDatuma, setDoDatuma] = useState(null)
	const [checkedRange, setCheckedRange] = useState(null)

	useEffect(() => {
		const load = async () => {
			const [radniciResult, radniDaniResult] = await Promise.all([
				getAllRadnici(),
				getAllRadniDani(),
			])

			if (radniciResult?.ok) {
				setRadnici(radniciResult.data || [])
			} else {
				setRadnici([])
				window.alert(`Greška: ${radniciResult?.error || 'Nije moguće učitati radnike'}`)
			}

			if (radniDaniResult?.ok) {
				setRadniDani(radniDaniResult.data || [])
			} else {
				setRadniDani([])
				window.alert(`Greška: ${radniDaniResult?.error || 'Nije moguće učitati radne dane'}`)
			}
		}

		load()
	}, [])

	const weekdayKeys = useMemo(() => {
		if (!checkedRange) return []
		return getWeekdayKeysInRange(checkedRange.from, checkedRange.to)
	}, [checkedRange])

	const validationMessage = useMemo(() => {
		if (!checkedRange) return 'Odaberite razdoblje i kliknite "Provjeri unose".'
		if (weekdayKeys.length === 0) return 'U odabranom razdoblju nema radnih dana (ponedjeljak–petak).'
		return ''
	}, [checkedRange, weekdayKeys])

	const handleCheck = () => {
		if (!odDatuma || !doDatuma) {
			window.alert('Greška: Odaberite početni i završni datum')
			return
		}

		if (doDatuma < odDatuma) {
			window.alert('Greška: Do datum mora biti veći ili jednak od datuma')
			return
		}

		setCheckedRange({
			from: new Date(odDatuma),
			to: new Date(doDatuma),
		})
	}

	const results = useMemo(() => {
		if (validationMessage) return []

		const validWeekdays = new Set(weekdayKeys)

		return radnici.map((radnik) => {
			const idRadnik = Number(radnik.id_radnik)
			const workerEntries = radniDani
				.filter((item) => Number(item.id_radnik) === idRadnik)
				.map((item) => toDateKey(parseDateKey(item.datum_rada)))
				.filter((dateKey) => dateKey && validWeekdays.has(dateKey))

			const enteredDays = new Set(workerEntries)
			const missingDays = weekdayKeys.filter((dateKey) => !enteredDays.has(dateKey))
			const fullName = [radnik.ime, radnik.prezime].filter(Boolean).join(' ').trim()

			return {
				id: idRadnik,
				label: fullName || radnik.username || `Radnik #${idRadnik}`,
				enteredCount: enteredDays.size,
				missingDays,
				isComplete: missingDays.length === 0,
			}
		})
	}, [radnici, radniDani, weekdayKeys, validationMessage])

	const summary = useMemo(() => {
		const totalWorkers = results.length
		const completeWorkers = results.filter((item) => item.isComplete).length
		const incompleteWorkers = totalWorkers - completeWorkers
		return { totalWorkers, completeWorkers, incompleteWorkers }
	}, [results])

	return (
		<section className="provjera-unosa-meni">
			<TabLabel label="Od datuma:" />
			<TabDatePicker value={odDatuma} onChange={setOdDatuma} />

			<TabLabel label="Do datuma:" />
			<TabDatePicker value={doDatuma} onChange={setDoDatuma} />

			<div className="provjera-unosa-actions">
				<TabButton label="Provjeri unose" onClick={handleCheck} isClicked className="provjera-unosa-button" />
			</div>

			{validationMessage ? (
				<p className="provjera-unosa-info">{validationMessage}</p>
			) : (
				<>
					<p className="provjera-unosa-info">
						Ukupno radnika: {summary.totalWorkers} | Uredno uneseno: {summary.completeWorkers} |
						 Nedostaje unosa: {summary.incompleteWorkers}
					</p>

					<div className="provjera-unosa-list">
						{results.map((item) => (
							<div className="provjera-unosa-row" key={item.id}>
								<p className="provjera-unosa-name">{item.label}</p>
								{item.isComplete ? (
									<p className="provjera-unosa-ok">Svi radni dani su uneseni.</p>
								) : (
									<p className="provjera-unosa-missing">
										Nedostaju datumi: {item.missingDays.map((dateKey) => formatDateToHr(dateKey)).join(', ')}
									</p>
								)}
							</div>
						))}
					</div>
				</>
			)}
		</section>
	)
}

export default ProvjeraUnosaMeni
