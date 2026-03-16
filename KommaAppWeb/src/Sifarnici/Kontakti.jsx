import { useEffect, useMemo, useState } from 'react'
import KontaktModal from './KontaktModal'
import './Kontakti.css'
import {
	deleteKontakt as deleteKontaktApi,
	getAllKontakti,
	insertKontakt as insertKontaktApi,
	updateKontakt as updateKontaktApi,
} from '../services/kontaktiApi'
import { getAllKlijenti } from '../services/klijentiApi'

function Kontakti({
	loadKontakti,
	loadKlijenti,
	deleteKontaktAction,
	insertKontaktAction,
	updateKontaktAction,
	initialKontakti = [],
}) {
	const [kontakti, setKontakti] = useState(Array.isArray(initialKontakti) ? initialKontakti : [])
	const [modalVisible, setModalVisible] = useState(false)
	const [editingKontakt, setEditingKontakt] = useState(null)
	const [loading, setLoading] = useState(false)
	const [klijentiById, setKlijentiById] = useState({})
	const [klijentiItems, setKlijentiItems] = useState([])
	const [searchQuery, setSearchQuery] = useState('')

	const fetchKontakti = async () => {
		setLoading(true)

		const kontaktiAction = loadKontakti || getAllKontakti
		const klijentiAction = loadKlijenti || getAllKlijenti

		const [kontaktiResult, klijentiResult] = await Promise.all([kontaktiAction(), klijentiAction()])

		if (kontaktiResult?.ok) {
			setKontakti(kontaktiResult.data ?? [])
		} else {
			window.alert(`Greška: ${kontaktiResult?.error || 'Neuspješno učitavanje kontakata'}`)
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
		if (Array.isArray(initialKontakti) && initialKontakti.length > 0) {
			setKontakti(initialKontakti)
		}

		fetchKontakti()
	}, [])

	const handleAddKontakt = () => {
		setEditingKontakt(null)
		setModalVisible(true)
	}

	const handleEditKontakt = (kontakt) => {
		setEditingKontakt(kontakt)
		setModalVisible(true)
	}

	const handleDeleteKontakt = async (idKontakt) => {
		const confirmed = window.confirm('Potvrdi brisanje: Jeste li sigurni?')
		if (!confirmed) return

		const action = deleteKontaktAction || deleteKontaktApi
		const result = await action(idKontakt)

		if (result?.ok) {
			window.alert(result?.message || 'Uspješno obrisano')
			fetchKontakti()
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno brisanje'}`)
		}
	}

	const normalizedSearch = searchQuery.trim().toLowerCase()

	const filteredKontakti = useMemo(
		() =>
			kontakti.filter((item) => {
				if (!normalizedSearch) return true

				const naziv = String(item.naziv || '').toLowerCase()
				const telefon = String(item.telefonski_broj || '').toLowerCase()
				const klijentNaziv = String(klijentiById[String(item.id_klijent)] || '').toLowerCase()
				return (
					naziv.includes(normalizedSearch) ||
					telefon.includes(normalizedSearch) ||
					klijentNaziv.includes(normalizedSearch)
				)
			}),
		[kontakti, klijentiById, normalizedSearch],
	)

	return (
		<section className="kontakti-screen">
			<button type="button" className="kontakti-add-btn" onClick={handleAddKontakt}>
				Dodaj kontakt
			</button>

			<input
				className="kontakti-search"
				value={searchQuery}
				onChange={(event) => setSearchQuery(event.target.value)}
				placeholder="Pretraži kontakte ili klijente"
			/>

			{loading ? (
				<p className="kontakti-empty">Učitavanje...</p>
			) : kontakti.length === 0 ? (
				<p className="kontakti-empty">Nema kontakata</p>
			) : filteredKontakti.length === 0 ? (
				<p className="kontakti-empty">Nema rezultata pretrage</p>
			) : (
				<div className="kontakti-list">
					{filteredKontakti.map((item) => (
						<div className="kontakti-row" key={item.id_kontakt}>
							<div className="kontakti-info">
								<p className="kontakti-name">{item.naziv}</p>
								<p className="kontakti-client">Telefon: {item.telefonski_broj || 'N/A'}</p>
								<p className="kontakti-client">
									Klijent: {klijentiById[String(item.id_klijent)] || 'Nepoznat klijent'}
								</p>
							</div>

							<div className="kontakti-actions">
								<button
									type="button"
									className="kontakti-action-btn kontakti-action-btn--edit"
									onClick={() => handleEditKontakt(item)}
								>
									Uredi
								</button>
								<button
									type="button"
									className="kontakti-action-btn kontakti-action-btn--delete"
									onClick={() => handleDeleteKontakt(item.id_kontakt)}
								>
									Obriši
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<KontaktModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSuccess={fetchKontakti}
				editingKontakt={editingKontakt}
				insertKontaktAction={insertKontaktAction || insertKontaktApi}
				updateKontaktAction={updateKontaktAction || updateKontaktApi}
				loadKlijenti={loadKlijenti || getAllKlijenti}
				klijentiItems={klijentiItems}
			/>
		</section>
	)
}

export default Kontakti
