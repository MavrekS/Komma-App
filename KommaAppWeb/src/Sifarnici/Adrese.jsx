import { useEffect, useMemo, useState } from 'react'
import AdresaModal from './AdresaModal'
import './Adrese.css'
import {
	deleteAdresa as deleteAdresaApi,
	getAllAdrese,
	insertAdresa as insertAdresaApi,
	updateAdresa as updateAdresaApi,
} from '../services/adreseApi'
import { getAllKlijenti } from '../services/klijentiApi'

function Adrese({
	loadAdrese,
	loadKlijenti,
	deleteAdresaAction,
	insertAdresaAction,
	updateAdresaAction,
	initialAdrese = [],
}) {
	const [adrese, setAdrese] = useState(Array.isArray(initialAdrese) ? initialAdrese : [])
	const [modalVisible, setModalVisible] = useState(false)
	const [editingAdresa, setEditingAdresa] = useState(null)
	const [loading, setLoading] = useState(false)
	const [klijentiById, setKlijentiById] = useState({})
	const [klijentiItems, setKlijentiItems] = useState([])
	const [searchQuery, setSearchQuery] = useState('')
	const [dnevnicaFilter, setDnevnicaFilter] = useState('sve')

	const normalizeDnevnica = (value) => {
		const normalized = String(value || '').trim().toLowerCase()
		if (normalized === '2' || normalized === 'van_drzave' || normalized === 'van države') {
			return 'van_drzave'
		}
		if (normalized === '1' || normalized === 'van_zupanije') {
			return 'van_zupanije'
		}
		return 'unutar_zupanije'
	}

	const fetchAdrese = async () => {
		setLoading(true)

		const adreseAction = loadAdrese || getAllAdrese
		const klijentiAction = loadKlijenti || getAllKlijenti

		const [adreseResult, klijentiResult] = await Promise.all([adreseAction(), klijentiAction()])

		if (adreseResult?.ok) {
			setAdrese(adreseResult.data ?? [])
		} else {
			window.alert(`Greška: ${adreseResult?.error || 'Neuspješno učitavanje adresa'}`)
		}

		if (klijentiResult?.ok) {
			const klijentiData = klijentiResult.data || []
			setKlijentiItems(klijentiData)

			const mappedKlijenti = klijentiData.reduce((acc, klijent) => {
				acc[String(klijent.id_klijent)] = klijent.naziv_klijenta
				return acc
			}, {})
			setKlijentiById(mappedKlijenti)
		} else {
			setKlijentiItems([])
			setKlijentiById({})
		}

		setLoading(false)
	}

	useEffect(() => {
		if (Array.isArray(initialAdrese) && initialAdrese.length > 0) {
			setAdrese(initialAdrese)
		}

		fetchAdrese()
	}, [])

	const handleAddAdresa = () => {
		setEditingAdresa(null)
		setModalVisible(true)
	}

	const handleEditAdresa = (adresa) => {
		setEditingAdresa(adresa)
		setModalVisible(true)
	}

	const handleDeleteAdresa = async (idAdresa) => {
		const confirmed = window.confirm('Potvrdi brisanje: Jeste li sigurni?')
		if (!confirmed) return

		const action = deleteAdresaAction || deleteAdresaApi
		const result = await action(idAdresa)

		if (result?.ok) {
			window.alert(result?.message || 'Uspješno obrisano')
			fetchAdrese()
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno brisanje'}`)
		}
	}

	const normalizedSearch = searchQuery.trim().toLowerCase()

	const filteredAdrese = useMemo(
		() =>
			adrese.filter((item) => {
				const normalizedItemDnevnica = normalizeDnevnica(item.dnevnica)
				if (dnevnicaFilter !== 'sve' && normalizedItemDnevnica !== dnevnicaFilter) {
					return false
				}

				if (!normalizedSearch) return true

				const adresaText = String(item.adresa || '').toLowerCase()
				const klijentNaziv = String(klijentiById[String(item.id_klijent)] || '').toLowerCase()

				return adresaText.includes(normalizedSearch) || klijentNaziv.includes(normalizedSearch)
			}),
		[adrese, dnevnicaFilter, klijentiById, normalizedSearch],
	)

	return (
		<section className="adrese-screen">
			<button type="button" className="adrese-add-btn" onClick={handleAddAdresa}>
				Dodaj adresu
			</button>

			<div className="adrese-filters">
				<input
					className="adrese-search"
					value={searchQuery}
					onChange={(event) => setSearchQuery(event.target.value)}
					placeholder="Pretraži adrese ili klijente"
				/>
				<select
					className="adrese-filter-select"
					value={dnevnicaFilter}
					onChange={(event) => setDnevnicaFilter(event.target.value)}
				>
					<option value="sve">Sve dnevnice</option>
					<option value="unutar_zupanije">Unutar županije</option>
					<option value="van_zupanije">Van županije</option>
					<option value="van_drzave">Van države</option>
				</select>
			</div>

			{loading ? (
				<p className="adrese-empty">Učitavanje...</p>
			) : adrese.length === 0 ? (
				<p className="adrese-empty">Nema adresa</p>
			) : filteredAdrese.length === 0 ? (
				<p className="adrese-empty">Nema rezultata pretrage</p>
			) : (
				<div className="adrese-list">
					{filteredAdrese.map((item) => (
						<div className="adrese-row" key={item.id_adresa}>
							<div className="adrese-info">
								<p className="adrese-name">{item.adresa}</p>
								<p className="adrese-client">
									Klijent: {klijentiById[String(item.id_klijent)] || 'Nepoznat klijent'}
								</p>
								<p className="adrese-client">
									Dnevnica:{' '}
									{normalizeDnevnica(item.dnevnica) === 'van_drzave'
										? 'Van države'
										: normalizeDnevnica(item.dnevnica) === 'van_zupanije'
											? 'Van županije'
											: 'Unutar županije'}
								</p>
							</div>

							<div className="adrese-actions">
								<button
									type="button"
									className="adrese-action-btn adrese-action-btn--edit"
									onClick={() => handleEditAdresa(item)}
								>
									Uredi
								</button>
								<button
									type="button"
									className="adrese-action-btn adrese-action-btn--delete"
									onClick={() => handleDeleteAdresa(item.id_adresa)}
								>
									Obriši
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<AdresaModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSuccess={fetchAdrese}
				editingAdresa={editingAdresa}
				insertAdresaAction={insertAdresaAction || insertAdresaApi}
				updateAdresaAction={updateAdresaAction || updateAdresaApi}
				loadKlijenti={loadKlijenti || getAllKlijenti}
				klijentiItems={klijentiItems}
			/>
		</section>
	)
}

export default Adrese
