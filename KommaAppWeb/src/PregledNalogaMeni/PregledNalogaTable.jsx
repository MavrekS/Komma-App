function PregledNalogaTable({
	filteredNalozi,
	loggedInRadnikId,
	canEditNalogItem,
	canEditOpisOnly,
	formatDate,
	resolveKlijentNaziv,
	resolveAdresaNaziv,
	resolveKontaktNaziv,
	resolveKontaktTelefon,
	resolveVoditeljNaziv,
	resolveRadniciNazivi,
	onExportPdf,
	onOpenPutniNalog,
	onOpenFinishPutniNalog,
	onOpenFinishNalog,
	onOpenEdit,
}) {
	if (filteredNalozi.length === 0) {
		return (
			<div className="pregled-naloga-empty-wrap">
				<p className="pregled-naloga-empty">Nema unesenih naloga</p>
			</div>
		)
	}

	return (
		<div className="pregled-naloga-table-wrap">
			<table className="pregled-naloga-table">
				<thead>
					<tr>
						<th>Nalog</th>
						<th>Klijent</th>
						<th>Adresa</th>
						<th>Kontakt</th>
						<th>Telefon</th>
						<th>Kreirano</th>
						<th>Početak</th>
						<th>Izvršiti do</th>
						<th>Voditelj</th>
						<th>Radnici</th>
						<th>Oprema</th>
						<th>Materijal</th>
						<th>Opis posla</th>
						<th>Status</th>
						<th>Akcije</th>
					</tr>
				</thead>
				<tbody>
					{filteredNalozi.map((item) => (
						<tr key={item.id_nalog}>
							<td className="pregled-naloga-name">{item.naziv_naloga}</td>
							<td>{resolveKlijentNaziv(item)}</td>
							<td>{resolveAdresaNaziv(item)}</td>
							<td>{resolveKontaktNaziv(item)}</td>
							<td>{resolveKontaktTelefon(item)}</td>
							<td>{formatDate(item.kreiran_na_datum)}</td>
							<td>{formatDate(item.pocetak_naloga ?? item.Pocetak_naloga)}</td>
							<td>{formatDate(item.Izvrsiti_do ?? item.izvrsiti_do)}</td>
							<td>{resolveVoditeljNaziv(item)}</td>
							<td className="pregled-naloga-cell-wrap pregled-naloga-cell-radnici">{resolveRadniciNazivi(item)}</td>
							<td className="pregled-naloga-cell-wrap pregled-naloga-cell-oprema">{item.oprema || 'N/A'}</td>
							<td className="pregled-naloga-cell-wrap pregled-naloga-cell-materijal">{item.materijal || 'N/A'}</td>
							<td className="pregled-naloga-cell-wrap pregled-naloga-cell-opis">{item.opis_posla || 'N/A'}</td>
							<td>{item.status_naloga || 'aktivan'}</td>
							<td className="pregled-naloga-cell-actions">
								<div className="pregled-naloga-actions">
									<button
										type="button"
										className="pregled-naloga-pdf-btn"
										onClick={() => onExportPdf(item)}
									>
										Kreiraj radni nalog
									</button>
									<button
										type="button"
										className="pregled-naloga-travel-btn"
										onClick={() => onOpenPutniNalog(item)}
									>
										Kreiraj putni nalog
									</button>
									{Number.isInteger(loggedInRadnikId) && loggedInRadnikId > 0 && (
										<button
											type="button"
											className="pregled-naloga-travel-finish-btn"
											onClick={() => onOpenFinishPutniNalog(item)}
										>
											Završi putni
										</button>
									)}
									{canEditNalogItem(item) && String(item.status_naloga || '').toLowerCase() !== 'izvrseni' && (
										<button
											type="button"
											className="pregled-naloga-finish-btn"
											onClick={() => onOpenFinishNalog(item)}
										>
											Izvrši nalog
										</button>
									)}
									{canEditNalogItem(item) && (
										<button
											type="button"
											className="pregled-naloga-edit-btn"
											onClick={() => onOpenEdit(item)}
										>
											{canEditOpisOnly ? 'Promijeni nalog' : 'Uredi'}
										</button>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default PregledNalogaTable
