import { useEffect, useMemo, useState } from 'react'
import KlijentModal from './KlijentModal'
import './Klijenti.css'
import {
	deleteKlijent as deleteKlijentApi,
	getAllKlijenti,
	insertKlijent as insertKlijentApi,
	updateKlijent as updateKlijentApi,
} from '../services/klijentiApi'

function Klijenti({
	loadKlijenti,
	deleteKlijentAction,
	insertKlijentAction,
	updateKlijentAction,
	initialKlijenti = [],
}) {
	const [klijenti, setKlijenti] = useState(Array.isArray(initialKlijenti) ? initialKlijenti : [])
	const [modalVisible, setModalVisible] = useState(false)
	const [editingKlijent, setEditingKlijent] = useState(null)
	const [loading, setLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')

	const fetchKlijenti = async () => {
		const loadAction = loadKlijenti || getAllKlijenti
		if (typeof loadAction !== 'function') return

		setLoading(true)
		const result = await loadAction()
		if (result?.ok) {
			setKlijenti(result.data ?? [])
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno učitavanje klijenata'}`)
		}
		setLoading(false)
	}

	useEffect(() => {
		if (Array.isArray(initialKlijenti) && initialKlijenti.length > 0) {
			setKlijenti(initialKlijenti)
			return
		}

		fetchKlijenti()
	}, [])

	const handleAddKlijent = () => {
		setEditingKlijent(null)
		setModalVisible(true)
	}

	const handleEditKlijent = (klijent) => {
		setEditingKlijent(klijent)
		setModalVisible(true)
	}

	const handleDeleteKlijent = async (idKlijent) => {
		const confirmed = window.confirm('Potvrdi brisanje: Jeste li sigurni?')
		if (!confirmed) return

		const action = deleteKlijentAction || deleteKlijentApi
		const result = await action(idKlijent)

		if (result?.ok) {
			window.alert(result?.message || 'Uspješno obrisano')
			fetchKlijenti()
		} else {
			window.alert(`Greška: ${result?.error || 'Neuspješno brisanje'}`)
		}
	}

	const normalizedSearch = searchQuery.trim().toLowerCase()

	const filteredKlijenti = useMemo(
		() =>
			klijenti.filter((item) => {
				if (!normalizedSearch) return true

				const naziv = String(item.naziv_klijenta || '').toLowerCase()
				const sjediste = String(item.sjedište || item.sjediste || '').toLowerCase()
				const id = String(item.id_klijent || '').toLowerCase()
				return (
					naziv.includes(normalizedSearch) ||
					sjediste.includes(normalizedSearch) ||
					id.includes(normalizedSearch)
				)
			}),
		[klijenti, normalizedSearch],
	)

	return (
		<section className="klijenti-screen">
			<button type="button" className="klijenti-add-btn" onClick={handleAddKlijent}>
				Dodaj klijenta
			</button>

			<input
				className="klijenti-search"
				value={searchQuery}
				onChange={(event) => setSearchQuery(event.target.value)}
				placeholder="Pretraži klijente"
			/>

			{loading ? (
				<p className="klijenti-empty">Učitavanje...</p>
			) : klijenti.length === 0 ? (
				<p className="klijenti-empty">Nema klijenata</p>
			) : filteredKlijenti.length === 0 ? (
				<p className="klijenti-empty">Nema rezultata pretrage</p>
			) : (
				<div className="klijenti-list">
					{filteredKlijenti.map((item) => (
						<div className="klijenti-row" key={item.id_klijent}>
							<div className="klijenti-info">
								<p className="klijenti-name">{item.naziv_klijenta}</p>
								<p className="klijenti-client">Sjedište: {item.sjedište || item.sjediste || 'N/A'}</p>
								<p className="klijenti-id">ID: {item.id_klijent}</p>
							</div>

							<div className="klijenti-actions">
								<button
									type="button"
									className="klijenti-action-btn klijenti-action-btn--edit"
									onClick={() => handleEditKlijent(item)}
								>
									Uredi
								</button>

								<button
									type="button"
									className="klijenti-action-btn klijenti-action-btn--delete"
									onClick={() => handleDeleteKlijent(item.id_klijent)}
								>
									Obriši
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<KlijentModal
				visible={modalVisible}
				onClose={() => setModalVisible(false)}
				onSuccess={fetchKlijenti}
				editingKlijent={editingKlijent}
				insertKlijentAction={insertKlijentAction || insertKlijentApi}
				updateKlijentAction={updateKlijentAction || updateKlijentApi}
			/>
		</section>
	)
}

export default Klijenti
