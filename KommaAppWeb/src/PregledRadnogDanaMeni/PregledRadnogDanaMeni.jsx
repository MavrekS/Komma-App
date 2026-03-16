import { useEffect, useMemo, useState } from 'react'
import { getAllRadniDani } from '../services/radniDanApi'
import { getAllNalozi } from '../services/naloziApi'
import { getAllAdrese } from '../services/adreseApi'
import './PregledRadnogDanaMeni.css'
import TabDatePicker from '../TabComponents/TabDatePicker'

const HR_DATE_FORMAT = { day: '2-digit', month: '2-digit', year: 'numeric' }
const HR_TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false }
const HR_DATETIME_FORMAT = {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
}

function PregledRadnogDanaMeni({ loggedInUser }) {
	const [radniDani, setRadniDani] = useState([])
	const [naloziById, setNaloziById] = useState({})
	const [adreseById, setAdreseById] = useState({})
	const [nalogFilter, setNalogFilter] = useState('')
	const [lokacijaFilter, setLokacijaFilter] = useState('')
	const [imePrezimeFilter, setImePrezimeFilter] = useState('')
	const [startDateFilter, setStartDateFilter] = useState('')
	const [endDateFilter, setEndDateFilter] = useState('')
	const [sortColumn, setSortColumn] = useState('datum_rada')
	const [sortDirection, setSortDirection] = useState('asc')

	const columns = [
		{ key: 'nalog', label: 'Nalog' },
		{ key: 'lokacija', label: 'Lokacija' },
		{ key: 'datum_rada', label: 'Datum rada' },
		{ key: 'pocetak_rada', label: 'Početak' },
		{ key: 'kraj_rada', label: 'Kraj' },
		{ key: 'polazak', label: 'Polazak' },
		{ key: 'dolazak', label: 'Dolazak' },
		{ key: 'status', label: 'Status' },
		{ key: 'dodatni_radovi', label: 'Dodatni radovi' },
	]

	const resetFilters = () => {
		setNalogFilter('')
		setLokacijaFilter('')
		setImePrezimeFilter('')
		setStartDateFilter('')
		setEndDateFilter('')
	}

	useEffect(() => {
		loadRadniDani()
	}, [])

	const loadRadniDani = async () => {
		const [radniDaniResult, naloziResult, adreseResult] = await Promise.all([
			getAllRadniDani(),
			getAllNalozi(),
			getAllAdrese(),
		])

		if (radniDaniResult?.ok) {
			setRadniDani(radniDaniResult.data || [])
		} else {
			window.alert(`Greška: ${radniDaniResult?.error || 'Nije moguće učitati radne dane'}`)
		}

		if (naloziResult?.ok) {
			const mappedNalozi = (naloziResult.data || []).reduce((acc, nalog) => {
				acc[String(nalog.id_nalog)] = nalog
				return acc
			}, {})
			setNaloziById(mappedNalozi)
		} else {
			setNaloziById({})
		}

		if (adreseResult?.ok) {
			const mappedAdrese = (adreseResult.data || []).reduce((acc, adresa) => {
				acc[String(adresa.id_adresa)] = adresa.adresa
				return acc
			}, {})
			setAdreseById(mappedAdrese)
		} else {
			setAdreseById({})
		}
	}

	const formatDate = (dateString) => {
		if (!dateString) return 'N/A'
		const date = new Date(dateString)
		return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('hr-HR', HR_DATE_FORMAT)
	}

	const formatRadnikLabel = (item) => {
		const imePrezime = [item.ime, item.prezime].filter(Boolean).join(' ').trim()
		if (imePrezime) return imePrezime

		const fullName = String(item.ime_prezime || '').trim()
		if (fullName) return fullName

		const username = (item.radnik_username || item.username || '').trim()
		if (username) return username
		if (item.id_radnik) return `Radnik #${item.id_radnik}`
		return 'Nepoznat radnik'
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

	const resolveNalogName = (item) => {
		if (item.nalog_naziv) return String(item.nalog_naziv)

		const nalogId = String(item.id_nalog ?? '')
		if (!nalogId) return 'N/A'

		const nalog = naloziById[nalogId]
		if (!nalog) return 'N/A'

		return nalog.naziv_naloga || 'N/A'
	}

	const resolveLocationName = (item) => {
		if (item.lokacija_naziv) return String(item.lokacija_naziv)

		const nalogId = String(item.id_nalog ?? '')
		if (!nalogId) return 'N/A'

		const nalog = naloziById[nalogId]
		if (!nalog) return 'N/A'

		const rawAdresa = nalog.adresa
		const adresaById = adreseById[String(rawAdresa)]
		if (adresaById) return adresaById

		return rawAdresa ? String(rawAdresa) : 'N/A'
	}

	const formatFieldLabel = (key) =>
		String(key)
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (char) => char.toUpperCase())

	const isDateLikeValue = (value) => {
		if (typeof value !== 'string') return false
		return /^\d{4}-\d{2}-\d{2}/.test(value) || value.includes('T')
	}

	const isTimeOnlyField = (key) => {
		const lowerKey = String(key).toLowerCase()
		return (
			lowerKey === 'pocetak_rada' ||
			lowerKey === 'kraj_rada' ||
			lowerKey === 'polazak' ||
			lowerKey === 'dolazak'
		)
	}

	const isDateOnlyField = (key) => String(key).toLowerCase() === 'datum_rada'

	const formatFieldValue = (key, value) => {
		if (value === null || value === undefined || value === '') return 'N/A'

		if (isTimeOnlyField(key)) {
			const parsed = new Date(value)
			if (!Number.isNaN(parsed.getTime())) {
				return parsed.toLocaleTimeString('hr-HR', HR_TIME_FORMAT)
			}

			const raw = String(value)
			const timeMatch = raw.match(/(\d{2}:\d{2})(:\d{2})?/)
			if (timeMatch) return timeMatch[1]
			return raw
		}

		if (isDateOnlyField(key)) {
			const parsed = new Date(value)
			if (!Number.isNaN(parsed.getTime())) {
				return parsed.toLocaleDateString('hr-HR', HR_DATE_FORMAT)
			}
			return String(value)
		}

		if (isDateLikeValue(value) || String(key).toLowerCase().includes('datum')) {
			const date = new Date(value)
			if (!Number.isNaN(date.getTime())) {
				return date.toLocaleString('hr-HR', HR_DATETIME_FORMAT)
			}
		}

		if (Array.isArray(value)) {
			return value.length ? value.join(', ') : 'N/A'
		}

		if (typeof value === 'object') {
			try {
				return JSON.stringify(value)
			} catch {
				return 'N/A'
			}
		}

		return String(value)
	}

	const toDisplayFields = (item) =>
		Object.entries(item)
			.filter(([key]) => {
				const lowerKey = String(key).toLowerCase()
				if (lowerKey === 'radnik_username' || lowerKey === 'username') return false
				if (lowerKey === 'ime' || lowerKey === 'prezime' || lowerKey === 'ime_prezime') return false
				if (lowerKey === 'nalog_naziv' || lowerKey === 'lokacija_naziv') return false
				if (lowerKey === 'id' || lowerKey.startsWith('id_') || lowerKey.endsWith('_id')) return false
				return true
			})
			.map(([key, value]) => ({
				key,
				label: formatFieldLabel(key),
				value: formatFieldValue(key, value),
			}))

	const role = String(loggedInUser?.role || 'user').trim().toLowerCase()
	const loggedInRadnikId = Number(loggedInUser?.id_radnik)
	const canSeeAllRadniDani = role === 'admin' || role === 'superadmin'

	const visibleRadniDani = useMemo(
		() =>
			radniDani.filter((item) => {
				if (canSeeAllRadniDani) return true
				if (role !== 'user') return false
				if (!Number.isInteger(loggedInRadnikId) || loggedInRadnikId <= 0) return false
				return Number(item.id_radnik) === loggedInRadnikId
			}),
		[radniDani, canSeeAllRadniDani, role, loggedInRadnikId],
	)

	const filteredRadniDani = useMemo(() => {
		const nalogTerm = nalogFilter.trim().toLowerCase()
		const lokacijaTerm = lokacijaFilter.trim().toLowerCase()
		const imeTerm = imePrezimeFilter.trim().toLowerCase()

		return visibleRadniDani.filter((item) => {
			const nalogName = resolveNalogName(item).toLowerCase()
			const lokacijaName = resolveLocationName(item).toLowerCase()
			const imePrezime = formatRadnikLabel(item).toLowerCase()

			const datumRada = toDateOnlyString(item.datum_rada)
			const matchesStart = !startDateFilter || (datumRada && datumRada >= startDateFilter)
			const matchesEnd = !endDateFilter || (datumRada && datumRada <= endDateFilter)

			const matchesNalog = !nalogTerm || nalogName.includes(nalogTerm)
			const matchesLokacija = !lokacijaTerm || lokacijaName.includes(lokacijaTerm)
			const matchesIme = !imeTerm || imePrezime.includes(imeTerm)

			return matchesNalog && matchesLokacija && matchesIme && matchesStart && matchesEnd
		})
	}, [visibleRadniDani, nalogFilter, lokacijaFilter, imePrezimeFilter, startDateFilter, endDateFilter])

	const parseTimeComparable = (value) => {
		if (!value) return -1
		const match = String(value).match(/(\d{2}):(\d{2})(?::(\d{2}))?/)
		if (!match) return -1
		const hours = Number(match[1])
		const minutes = Number(match[2])
		const seconds = Number(match[3] || '0')
		if ([hours, minutes, seconds].some((num) => Number.isNaN(num))) return -1
		return hours * 3600 + minutes * 60 + seconds
	}

	const rowsForTable = useMemo(
		() =>
			filteredRadniDani.map((item) => ({
				id: item.id_radni_dan,
				radnikId: Number(item.id_radnik),
				radnikLabel: formatRadnikLabel(item),
				nalog: resolveNalogName(item),
				lokacija: resolveLocationName(item),
				datum_rada: formatFieldValue('datum_rada', item.datum_rada),
				datumKey: toDateOnlyString(item.datum_rada),
				pocetak_rada: formatFieldValue('pocetak_rada', item.pocetak_rada),
				kraj_rada: formatFieldValue('kraj_rada', item.kraj_rada),
				polazak: formatFieldValue('polazak', item.polazak),
				dolazak: formatFieldValue('dolazak', item.dolazak),
				status: item.status_radnog_dana || 'N/A',
				dodatni_radovi: item.dodatni_radovi || 'N/A',
			})),
		[filteredRadniDani],
	)

	const compareRows = (a, b) => {
		const dir = sortDirection === 'asc' ? 1 : -1

		if (sortColumn === 'datum_rada') {
			return a.datumKey.localeCompare(b.datumKey) * dir
		}

		if (
			sortColumn === 'pocetak_rada' ||
			sortColumn === 'kraj_rada' ||
			sortColumn === 'polazak' ||
			sortColumn === 'dolazak'
		) {
			return (parseTimeComparable(a[sortColumn]) - parseTimeComparable(b[sortColumn])) * dir
		}

		return String(a[sortColumn] || '').localeCompare(String(b[sortColumn] || ''), 'hr', {
			sensitivity: 'base',
		}) * dir
	}

	const groupedRows = useMemo(() => {
		const grouped = rowsForTable.reduce((acc, row) => {
			const key = `${row.radnikId}|${row.radnikLabel}`
			if (!acc[key]) {
				acc[key] = { label: row.radnikLabel, rows: [] }
			}
			acc[key].rows.push(row)
			return acc
		}, {})

		return Object.entries(grouped)
			.map(([key, group]) => ({
				key,
				label: group.label,
				rows: [...group.rows].sort(compareRows),
			}))
			.sort((a, b) => a.label.localeCompare(b.label, 'hr', { sensitivity: 'base' }))
	}, [rowsForTable, sortColumn, sortDirection])

	const handleSort = (columnKey) => {
		if (sortColumn === columnKey) {
			setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
			return
		}

		setSortColumn(columnKey)
		setSortDirection('asc')
	}

	return (
		<section className="pregled-radnih-dana-screen">
			<div className="pregled-radnih-dana-filter-wrap">
				<input
					value={nalogFilter}
					onChange={(event) => setNalogFilter(event.target.value)}
					placeholder="Filtriraj po nalogu"
					className="pregled-radnih-dana-input"
				/>
				<input
					value={lokacijaFilter}
					onChange={(event) => setLokacijaFilter(event.target.value)}
					placeholder="Filtriraj po lokaciji"
					className="pregled-radnih-dana-input"
				/>
				<input
					value={imePrezimeFilter}
					onChange={(event) => setImePrezimeFilter(event.target.value)}
					placeholder="Filtriraj po imenu i prezimenu"
					className="pregled-radnih-dana-input"
				/>
				<div className="pregled-radnih-dana-date-filters">
					<TabDatePicker
						value={startDateFilter}
						onChange={setStartDateFilter}
						output="string"
						className="pregled-radnih-dana-date-picker"
					/>
					<TabDatePicker
						value={endDateFilter}
						onChange={setEndDateFilter}
						output="string"
						className="pregled-radnih-dana-date-picker"
					/>
				</div>
				<button type="button" className="pregled-radnih-dana-reset-btn" onClick={resetFilters}>
					Reset filtera
				</button>
			</div>

			<div className="pregled-radnih-dana-header">
				<p className="pregled-radnih-dana-title">Pregled Radnih Dana</p>
			</div>

			<div className="pregled-radnih-dana-list">
				{groupedRows.length === 0 ? (
					<div className="pregled-radnih-dana-empty-wrap">
						<p className="pregled-radnih-dana-empty">Nema unesenih radnih dana</p>
					</div>
				) : (
					<div className="pregled-radnih-dana-worker-groups">
						{groupedRows.map((group) => (
							<div className="pregled-radnih-dana-worker-group" key={group.key}>
								<p className="pregled-radnih-dana-name">{group.label}</p>
								<div className="pregled-radnih-dana-table-wrap">
									<table className="pregled-radnih-dana-table">
										<thead>
											<tr>
												{columns.map((column) => (
													<th key={column.key}>
														<button
															type="button"
															className="pregled-radnih-dana-sort-btn"
															onClick={() => handleSort(column.key)}
														>
															{column.label}
															{sortColumn === column.key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}
														</button>
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{group.rows.map((row) => (
												<tr key={row.id}>
													<td>{row.nalog}</td>
													<td>{row.lokacija}</td>
													<td>{row.datum_rada}</td>
													<td>{row.pocetak_rada}</td>
													<td>{row.kraj_rada}</td>
													<td>{row.polazak}</td>
													<td>{row.dolazak}</td>
													<td>{row.status}</td>
													<td>{row.dodatni_radovi}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

		</section>
	)
}

export default PregledRadnogDanaMeni
