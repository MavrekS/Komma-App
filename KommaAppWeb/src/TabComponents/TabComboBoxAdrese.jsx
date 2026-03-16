import { useEffect, useMemo, useState } from 'react'
import './TabComboBoxAdrese.css'

function TabComboBoxAdrese({
	value,
	onChange,
	klijentId,
	placeholder = 'Odaberite adresu',
	loadAdrese,
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

			if (typeof loadAdrese !== 'function') {
				setItems([])
				setError(null)
				return
			}

			setLoading(true)
			try {
				const result = await loadAdrese()
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
	}, [itemsProp, loadAdrese])

	const filteredItems = useMemo(() => {
		if (!klijentId) return []
		return items.filter((item) => String(item.id_klijent) === String(klijentId))
	}, [items, klijentId])

	const selectedItem = useMemo(
		() => filteredItems.find((item) => String(item.id_adresa) === String(value)),
		[filteredItems, value],
	)

	const visibleItems = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()
		if (!query) return filteredItems

		return filteredItems.filter((item) => item.adresa?.toLowerCase().includes(query))
	}, [filteredItems, searchQuery])

	const handleSelect = (item) => {
		onChange?.(String(item.id_adresa))
		setOpen(false)
	}

	return (
		<div className="tab-combobox-adrese">
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
						? selectedItem.adresa
						: klijentId
							? placeholder
							: 'Prvo odaberite klijenta'}
				</span>
			</button>

			{!!error && <p className="tab-combobox-error">{error}</p>}

			{open && (
				<div className="tab-combobox-modal-overlay" onClick={() => setOpen(false)}>
					<div className="tab-combobox-modal" onClick={(event) => event.stopPropagation()}>
						<h3 className="tab-combobox-title">Odaberite adresu</h3>
						<input
							type="text"
							className="tab-combobox-search"
							placeholder="Pretraži adresu..."
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
										<li key={item.id_adresa}>
											<button
												type="button"
												className="tab-combobox-item"
												onClick={() => handleSelect(item)}
											>
												{item.adresa}
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

export default TabComboBoxAdrese
