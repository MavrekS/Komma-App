import { useEffect, useMemo, useState } from 'react'
import './TabComboBoxKontakti.css'

function TabComboBoxKontakti({
	value,
	onChange,
	klijentId,
	placeholder = 'Odaberite kontakt osobu',
	loadKontakti,
	items: itemsProp,
}) {
	const [open, setOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [items, setItems] = useState([])

	useEffect(() => {
		const load = async () => {
			if (Array.isArray(itemsProp)) {
				setItems(itemsProp)
				setError(null)
				return
			}

			if (typeof loadKontakti !== 'function') {
				setItems([])
				setError(null)
				return
			}

			setLoading(true)
			try {
				const result = await loadKontakti()
				if (result?.ok) {
					setItems(result.data ?? [])
					setError(null)
				} else {
					setItems([])
					setError(result?.error ?? 'Greška pri učitavanju')
				}
			} catch {
				setItems([])
				setError('Greška pri učitavanju')
			} finally {
				setLoading(false)
			}
		}

		load()
	}, [itemsProp, loadKontakti])

	const filteredItems = useMemo(() => {
		if (!klijentId) return []
		return items.filter((item) => String(item.id_klijent) === String(klijentId))
	}, [items, klijentId])

	const selectedItem = useMemo(
		() => filteredItems.find((item) => String(item.id_kontakt) === String(value)),
		[filteredItems, value],
	)

	const visibleItems = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		if (!query) return filteredItems

		return filteredItems.filter((item) => {
			const kontaktNaziv = item.naziv ?? ''
			const telefon = item.telefonski_broj ?? ''
			return `${kontaktNaziv} ${telefon}`.toLowerCase().includes(query)
		})
	}, [filteredItems, searchQuery])

	const handleSelect = (item) => {
		onChange?.(String(item.id_kontakt))
		setOpen(false)
	}

	return (
		<div className="tab-combobox-kontakti">
			<button
				type="button"
				className="tab-combobox-trigger"
				disabled={!klijentId}
				onClick={() => {
					if (!klijentId) return
					setSearchQuery('')
					setOpen(true)
				}}
			>
				<span className={selectedItem ? 'tab-combobox-value' : 'tab-combobox-placeholder'}>
					{selectedItem
						? `${selectedItem.naziv}${selectedItem.telefonski_broj ? ` (${selectedItem.telefonski_broj})` : ''}`
						: klijentId
							? placeholder
							: 'Prvo odaberite klijenta'}
				</span>
			</button>

			{!!error && <p className="tab-combobox-error">{error}</p>}

			{open && (
				<div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
					<div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
						<h3 className="tab-combobox-title">Odaberite kontakt osobu</h3>
						<input
							type="text"
							className="tab-combobox-search"
							placeholder="Pretraži kontakt..."
							value={searchQuery}
							onChange={(event) => setSearchQuery(event.target.value)}
							autoFocus
						/>

						{loading ? (
							<p className="tab-combobox-loading">Učitavanje...</p>
						) : (
							<>
								<ul className="tab-combobox-list">
									{visibleItems.map((item) => (
										<li key={item.id_kontakt}>
											<button
												type="button"
												className="tab-combobox-item"
												onClick={() => handleSelect(item)}
											>
												{item.naziv}
												{item.telefonski_broj ? ` (${item.telefonski_broj})` : ''}
											</button>
										</li>
									))}
								</ul>
								{visibleItems.length === 0 && (
									<p className="tab-combobox-loading">Nema rezultata za pretragu.</p>
								)}
							</>
						)}

						<button type="button" className="tab-combobox-close" onClick={() => setOpen(false)}>
							Zatvori
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default TabComboBoxKontakti
