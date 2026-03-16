import { useMemo, useState } from 'react'
import './IzracunDodatakaPlacuMeni.css'
import TabLabel from '../TabComponents/TabLabel'
import TabButton from '../TabComponents/TabButton'
import { getAllRadnici } from '../services/radniciApi'
import { getAllRadniDani } from '../services/radniDanApi'
import { getAllNalozi } from '../services/naloziApi'
import { getAllAdrese } from '../services/adreseApi'
import { getAllPutniNalozi } from '../services/putniNaloziApi'

const HALF_PER_DIEM = 15
const FULL_PER_DIEM = 30
const CRO_MONTHS = [
	{ value: '01', label: 'Siječanj' },
	{ value: '02', label: 'Veljača' },
	{ value: '03', label: 'Ožujak' },
	{ value: '04', label: 'Travanj' },
	{ value: '05', label: 'Svibanj' },
	{ value: '06', label: 'Lipanj' },
	{ value: '07', label: 'Srpanj' },
	{ value: '08', label: 'Kolovoz' },
	{ value: '09', label: 'Rujan' },
	{ value: '10', label: 'Listopad' },
	{ value: '11', label: 'Studeni' },
	{ value: '12', label: 'Prosinac' },
]

const parseTimeToSeconds = (value) => {
	if (!value) return null
	const match = String(value).match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
	if (!match) return null

	const hours = Number(match[1])
	const minutes = Number(match[2])
	const seconds = Number(match[3] || '0')
	if (!Number.isInteger(hours) || !Number.isInteger(minutes) || !Number.isInteger(seconds)) return null
	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null

	return hours * 3600 + minutes * 60 + seconds
}

const getDurationSeconds = (startValue, endValue) => {
	const start = parseTimeToSeconds(startValue)
	const end = parseTimeToSeconds(endValue)
	if (start === null || end === null) return 0
	if (end >= start) return end - start
	return 24 * 3600 - start + end
}

const getDurationSecondsFromParsed = (startSeconds, endSeconds) => {
	if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) return 0
	if (endSeconds >= startSeconds) return endSeconds - startSeconds
	return 24 * 3600 - startSeconds + endSeconds
}

const toMonthKey = (value) => {
	if (!value) return ''
	const datePart = String(value).includes('T')
		? String(value).split('T')[0]
		: String(value).includes(' ')
			? String(value).split(' ')[0]
			: String(value)
	const match = datePart.match(/^(\d{4})-(\d{2})-\d{2}$/)
	if (!match) return ''
	return `${match[1]}-${match[2]}`
}

const toDateKey = (value) => {
	if (!value) return ''
	const datePart = String(value).includes('T')
		? String(value).split('T')[0]
		: String(value).includes(' ')
			? String(value).split(' ')[0]
			: String(value)
	const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (!match) return ''
	return `${match[1]}-${match[2]}-${match[3]}`
}

const normalizeDnevnicaMode = (value) => {
	const normalized = String(value || '').trim().toLowerCase()
	if (normalized === 'van_zupanije' || normalized === 'van županije' || normalized === '1') return 'van_zupanije'
	if (normalized === 'van_drzave' || normalized === 'van države' || normalized === '2') return 'van_drzave'
	return 'unutar_zupanije'
}

const isOutsideCounty = (dnevnicaMode) => dnevnicaMode === 'van_zupanije' || dnevnicaMode === 'van_drzave'

const formatHours = (seconds) => {
	if (!Number.isFinite(seconds) || seconds <= 0) return '0.00'
	return (seconds / 3600).toFixed(2)
}

const parseTravelCost = (value) => {
	if (value === null || value === undefined) return 0
	if (typeof value === 'number') return Number.isFinite(value) ? value : 0

	const normalized = String(value).trim().replace(',', '.')
	if (!normalized) return 0

	const parsed = Number(normalized)
	return Number.isFinite(parsed) ? parsed : 0
}

const getTravelCostTotal = (putniNalog) => {
	return (
		parseTravelCost(putniNalog.trosak_spavanja) +
		parseTravelCost(putniNalog.trosak_goriva) +
		parseTravelCost(putniNalog.trosak_materijala) +
		parseTravelCost(putniNalog.cestarina_trajekt) +
		parseTravelCost(putniNalog.ostalo)
	)
}

function IzracunDodatakaPlacuMeni({ loggedInUser }) {
	const role = String(loggedInUser?.role || 'user').trim().toLowerCase()
	const loggedInRadnikId = Number(loggedInUser?.id_radnik)
	const loggedInUsername = String(loggedInUser?.username || '').trim().toLowerCase()

	const currentMonth = useMemo(() => {
		const now = new Date()
		const year = now.getFullYear()
		const month = String(now.getMonth() + 1).padStart(2, '0')
		return `${year}-${month}`
	}, [])

	const [targetMonth, setTargetMonth] = useState(currentMonth)
	const [rows, setRows] = useState([])
	const [loading, setLoading] = useState(false)

	const yearOptions = useMemo(() => {
		const currentYear = Number(currentMonth.split('-')[0])
		return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
	}, [currentMonth])

	const selectedYear = useMemo(() => String(targetMonth || '').split('-')[0] || '', [targetMonth])
	const selectedMonthPart = useMemo(() => String(targetMonth || '').split('-')[1] || '', [targetMonth])

	const handleYearChange = (event) => {
		const nextYear = String(event.target.value || '')
		if (!nextYear || !selectedMonthPart) return
		setTargetMonth(`${nextYear}-${selectedMonthPart}`)
	}

	const handleMonthChange = (event) => {
		const nextMonth = String(event.target.value || '')
		if (!nextMonth || !selectedYear) return
		setTargetMonth(`${selectedYear}-${nextMonth}`)
	}

	const handleCalculate = async () => {
		if (!targetMonth) {
			window.alert('Greška: Odaberite mjesec')
			return
		}

		setLoading(true)

		const [radniciResult, radniDaniResult, naloziResult, adreseResult, putniNaloziResult] = await Promise.all([
			getAllRadnici(),
			getAllRadniDani(),
			getAllNalozi(),
			getAllAdrese(),
			getAllPutniNalozi(),
		])

		setLoading(false)

		if (
			!radniciResult?.ok ||
			!radniDaniResult?.ok ||
			!naloziResult?.ok ||
			!adreseResult?.ok ||
			!putniNaloziResult?.ok
		) {
			window.alert('Greška: Nije moguće učitati sve podatke za izračun')
			setRows([])
			return
		}

		const radnici = radniciResult.data || []
		const radniDani = radniDaniResult.data || []
		const nalozi = naloziResult.data || []
		const adrese = adreseResult.data || []
		const putniNalozi = putniNaloziResult.data || []

		const naloziById = nalozi.reduce((acc, nalog) => {
			acc[String(nalog.id_nalog)] = nalog
			return acc
		}, {})

		const dnevnicaByAdresaId = adrese.reduce((acc, adresa) => {
			acc[String(adresa.id_adresa)] = normalizeDnevnicaMode(adresa.dnevnica)
			return acc
		}, {})

		const visibleRadnici =
			role === 'user'
				? radnici.filter((radnik) => {
					const idMatches =
						Number.isInteger(loggedInRadnikId) &&
						loggedInRadnikId > 0 &&
						Number(radnik.id_radnik) === loggedInRadnikId

					if (idMatches) return true

					if (!loggedInUsername) return false
					return String(radnik.username || '').trim().toLowerCase() === loggedInUsername
				})
				: radnici

		const calculatedRows = visibleRadnici.map((radnik) => {
			const radnikId = Number(radnik.id_radnik)
			const workerMonthRows = radniDani.filter(
				(item) => Number(item.id_radnik) === radnikId && toMonthKey(item.datum_rada) === targetMonth,
			)
			const workerWorkDays = workerMonthRows.filter(
				(item) => String(item.status_radnog_dana || '').trim().toLowerCase() === 'radni_dan',
			)

			const bolovanjeDates = new Set(
				workerMonthRows
					.filter((item) => String(item.status_radnog_dana || '').trim().toLowerCase() === 'bolovanje')
					.map((item) => toDateKey(item.datum_rada))
					.filter(Boolean),
			)

			const godisnjiDates = new Set(
				workerMonthRows
					.filter((item) => {
						const status = String(item.status_radnog_dana || '').trim().toLowerCase()
						return status === 'godisnji' || status === 'godišnji'
					})
					.map((item) => toDateKey(item.datum_rada))
					.filter(Boolean),
			)

			let totalWorkSeconds = 0
			const dayStatsByDate = {}
			let overtimeSeconds = 0
			let halfPerDiemCount = 0
			let fullPerDiemCount = 0
			let perDiemAmount = 0

			workerWorkDays.forEach((day) => {
				const dayKey = String(day.datum_rada || '').split('T')[0].split(' ')[0]
				if (!dayKey) return

				const pocetakSeconds = parseTimeToSeconds(day.pocetak_rada)
				const krajSeconds = parseTimeToSeconds(day.kraj_rada)

				const nalog = naloziById[String(day.id_nalog)]
				const dnevnicaMode = normalizeDnevnicaMode(dnevnicaByAdresaId[String(nalog?.adresa)])
				const polazakSeconds = parseTimeToSeconds(day.polazak)
				const dolazakSeconds = parseTimeToSeconds(day.dolazak)

				if (!dayStatsByDate[dayKey]) {
					dayStatsByDate[dayKey] = {
						earliestPocetak: null,
						latestKraj: null,
						outsideCounty: false,
						earliestPolazak: null,
						latestDolazak: null,
					}
				}

				const stats = dayStatsByDate[dayKey]

				if (pocetakSeconds !== null) {
					stats.earliestPocetak =
						stats.earliestPocetak === null ? pocetakSeconds : Math.min(stats.earliestPocetak, pocetakSeconds)
				}

				if (krajSeconds !== null) {
					stats.latestKraj = stats.latestKraj === null ? krajSeconds : Math.max(stats.latestKraj, krajSeconds)
				}

				stats.outsideCounty = stats.outsideCounty || isOutsideCounty(dnevnicaMode)

				if (polazakSeconds !== null) {
					stats.earliestPolazak =
						stats.earliestPolazak === null
							? polazakSeconds
							: Math.min(stats.earliestPolazak, polazakSeconds)
				}

				if (dolazakSeconds !== null) {
					stats.latestDolazak =
						stats.latestDolazak === null
							? dolazakSeconds
							: Math.max(stats.latestDolazak, dolazakSeconds)
				}
			})

			Object.values(dayStatsByDate).forEach((stats) => {
				let dayWorkSeconds = 0
				if (stats.earliestPocetak !== null && stats.latestKraj !== null) {
					dayWorkSeconds = getDurationSecondsFromParsed(stats.earliestPocetak, stats.latestKraj)
				}

				totalWorkSeconds += dayWorkSeconds
				overtimeSeconds += Math.max(0, dayWorkSeconds - 8 * 3600)

				if (!stats.outsideCounty) return
				if (stats.earliestPolazak === null || stats.latestDolazak === null) return

				let travelSeconds = stats.latestDolazak - stats.earliestPolazak
				if (travelSeconds < 0) {
					travelSeconds += 24 * 3600
				}

				const travelHours = travelSeconds / 3600
				if (travelHours > 12) {
					fullPerDiemCount += 1
					perDiemAmount += FULL_PER_DIEM
					return
				}

				if (travelHours > 8) {
					halfPerDiemCount += 1
					perDiemAmount += HALF_PER_DIEM
				}
			})

			const putniTroskoviAmount = putniNalozi
				.filter(
					(item) =>
						Number(item.id_radnika) === radnikId &&
						toMonthKey(item.kraj_naloga) === targetMonth,
				)
				.reduce((sum, item) => sum + getTravelCostTotal(item), 0)

			const fullName = [radnik.ime, radnik.prezime].filter(Boolean).join(' ').trim()
			const leaveHours = (bolovanjeDates.size + godisnjiDates.size) * 8
			const totalDodaciAmount = perDiemAmount + putniTroskoviAmount

			return {
				id: radnikId,
				label: fullName || radnik.username || `Radnik #${radnikId}`,
				totalHours: formatHours(totalWorkSeconds),
				overtimeHours: formatHours(overtimeSeconds),
				bolovanjeDays: bolovanjeDates.size,
				godisnjiDays: godisnjiDates.size,
				leaveHours: leaveHours.toFixed(2),
				halfPerDiemCount,
				fullPerDiemCount,
				perDiemAmount: perDiemAmount.toFixed(2),
				travelCostAmount: putniTroskoviAmount.toFixed(2),
				totalDodaciAmount: totalDodaciAmount.toFixed(2),
			}
		})

		setRows(calculatedRows)
	}

	return (
		<section className="izracun-dodataka-meni">
			<TabLabel label="Mjesec:" />
			<div className="izracun-dodataka-month-row">
				<select
					className="izracun-dodataka-month-input"
					value={selectedMonthPart}
					onChange={handleMonthChange}
				>
					{CRO_MONTHS.map((month) => (
						<option key={month.value} value={month.value}>
							{month.label}
						</option>
					))}
				</select>

				<select
					className="izracun-dodataka-month-input izracun-dodataka-year-input"
					value={selectedYear}
					onChange={handleYearChange}
				>
					{yearOptions.map((year) => (
						<option key={year} value={year}>
							{year}
						</option>
					))}
				</select>
			</div>

			<div className="izracun-dodataka-submit-row">
				<TabButton
					label={loading ? 'Izračun u tijeku...' : 'Izračunaj dodatke'}
					onClick={handleCalculate}
					isClicked
				/>
			</div>

			<div className="izracun-dodataka-table-wrap">
				<table className="izracun-dodataka-table">
					<thead>
						<tr>
							<th>Radnik</th>
							<th>Ukupno sati</th>
							<th>Prekovremeni sati</th>
							<th>Dana bolovanja</th>
							<th>Dana godišnjeg</th>
							<th>Sati godišnje/bolovanja</th>
							<th>Broj poludnevnica</th>
							<th>Broj punih dnevnica</th>
							<th>Iznos dnevnica (€)</th>
							<th>Putni troškovi (€)</th>
							<th>Ukupan dodatak (€)</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((item) => (
							<tr key={item.id}>
								<td className="izracun-dodataka-name">{item.label}</td>
								<td>{item.totalHours}</td>
								<td>{item.overtimeHours}</td>
								<td>{item.bolovanjeDays}</td>
								<td>{item.godisnjiDays}</td>
								<td>{item.leaveHours}</td>
								<td>{item.halfPerDiemCount}</td>
								<td>{item.fullPerDiemCount}</td>
								<td>{item.perDiemAmount}</td>
								<td>{item.travelCostAmount}</td>
								<td>{item.totalDodaciAmount}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	)
}

export default IzracunDodatakaPlacuMeni
