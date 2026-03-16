import TabComboBoxKlijenti from '../TabComponents/TabComboBoxKlijenti'
import TabComboBoxAdrese from '../TabComponents/TabComboBoxAdrese'
import TabComboBoxKontakti from '../TabComponents/TabComboBoxKontakti'
import TabComboBoxRadnici from '../TabComponents/TabComboBoxRadnici'
import TabDatePicker from '../TabComponents/TabDatePicker'

function PregledNalogaEditModal({
	visible,
	canEditOpisOnly,
	editNazivNaloga,
	onEditNazivNalogaChange,
	editKlijent,
	onEditKlijentChange,
	editAdresa,
	onEditAdresaChange,
	editKontakt,
	onEditKontaktChange,
	editPocetakNaloga,
	onEditPocetakNalogaChange,
	editIzvrsitiDo,
	onEditIzvrsitiDoChange,
	editVoditeljNaloga,
	onEditVoditeljNalogaChange,
	editRadnici,
	onEditRadniciChange,
	editOprema,
	onEditOpremaChange,
	editMaterijal,
	onEditMaterijalChange,
	editOpisPosla,
	onEditOpisPoslaChange,
	editStatusNaloga,
	onEditStatusNalogaChange,
	allowedStatuses,
	klijentiItems,
	adreseItems,
	kontaktiItems,
	radniciItems,
	editVoditeljiItems,
	editingNalog,
	resolveKontaktTelefon,
	formatDate,
	onOverlayClose,
	onCancel,
	onSave,
}) {
	if (!visible) return null

	return (
		<div className="pregled-naloga-modal-overlay" onClick={onOverlayClose}>
			<div className="pregled-naloga-modal" onClick={(event) => event.stopPropagation()}>
				<h3>{canEditOpisOnly ? 'Promijeni nalog' : 'Uredi nalog'}</h3>

				{!canEditOpisOnly && (
					<>
						<p className="pregled-naloga-field-label">Nalog</p>
						<input
							value={editNazivNaloga}
							onChange={(event) => onEditNazivNalogaChange(event.target.value)}
							placeholder="Naziv naloga"
							className="pregled-naloga-input"
						/>
						<p className="pregled-naloga-field-label">Klijent</p>
						<TabComboBoxKlijenti
							placeholder="Odaberite klijenta"
							value={editKlijent}
							onChange={(value) => {
								onEditKlijentChange(value)
								onEditAdresaChange('')
								onEditKontaktChange('')
							}}
							items={klijentiItems}
							width="100%"
						/>
						<p className="pregled-naloga-field-label">Adresa</p>
						<TabComboBoxAdrese
							placeholder="Odaberite adresu"
							value={editAdresa}
							onChange={onEditAdresaChange}
							klijentId={editKlijent}
							items={adreseItems}
						/>
						<p className="pregled-naloga-field-label">Kontakt</p>
						<TabComboBoxKontakti
							placeholder="Odaberite kontakt osobu"
							value={editKontakt}
							onChange={onEditKontaktChange}
							klijentId={editKlijent}
							items={kontaktiItems}
						/>
						<p className="pregled-naloga-field-label">Telefon</p>
						<input
							value={resolveKontaktTelefon({ id_kontakt: editKontakt })}
							className="pregled-naloga-input"
							disabled
							readOnly
						/>
						<p className="pregled-naloga-field-label">Kreirano</p>
						<input
							value={formatDate(editingNalog?.kreiran_na_datum)}
							className="pregled-naloga-input"
							disabled
							readOnly
						/>
						<p className="pregled-naloga-field-label">Početak</p>
						<TabDatePicker
							value={editPocetakNaloga}
							onChange={onEditPocetakNalogaChange}
							output="string"
							className="pregled-naloga-date-picker"
						/>
						<p className="pregled-naloga-field-label">Izvršiti do</p>
						<TabDatePicker
							value={editIzvrsitiDo}
							onChange={onEditIzvrsitiDoChange}
							output="string"
							className="pregled-naloga-date-picker"
						/>
						<p className="pregled-naloga-field-label">Voditelj</p>
						<TabComboBoxRadnici
							placeholder="Odaberite voditelja naloga"
							value={editVoditeljNaloga}
							onChange={onEditVoditeljNalogaChange}
							items={editVoditeljiItems}
						/>
						<p className="pregled-naloga-field-label">Radnici</p>
						<TabComboBoxRadnici
							placeholder="Odaberite jednog ili više radnika"
							value={editRadnici}
							onChange={onEditRadniciChange}
							multiple
							items={radniciItems}
						/>
						<p className="pregled-naloga-field-label">Oprema</p>
						<input
							value={editOprema}
							onChange={(event) => onEditOpremaChange(event.target.value)}
							placeholder="Oprema"
							className="pregled-naloga-input"
						/>
						<p className="pregled-naloga-field-label">Materijal</p>
						<input
							value={editMaterijal}
							onChange={(event) => onEditMaterijalChange(event.target.value)}
							placeholder="Materijal"
							className="pregled-naloga-input"
						/>
					</>
				)}

				{canEditOpisOnly && (
					<>
						<p className="pregled-naloga-field-label">Materijal</p>
						<input
							value={editMaterijal}
							onChange={(event) => onEditMaterijalChange(event.target.value)}
							placeholder="Materijal"
							className="pregled-naloga-input"
						/>
					</>
				)}
				<p className="pregled-naloga-field-label">Opis posla</p>
				<textarea
					value={editOpisPosla}
					onChange={(event) => onEditOpisPoslaChange(event.target.value)}
					placeholder="Opis posla"
					className="pregled-naloga-input pregled-naloga-textarea"
				/>

				{!canEditOpisOnly && (
					<>
						<p className="pregled-naloga-status-label">Status naloga:</p>
						<div className="pregled-naloga-status-chip-wrap">
							{allowedStatuses.map((status) => {
								const isSelected = editStatusNaloga === status
								return (
									<button
										key={status}
										type="button"
										className={`pregled-naloga-status-chip${isSelected ? ' is-selected' : ''}`}
										onClick={() => onEditStatusNalogaChange(status)}
									>
										{status}
									</button>
								)
							})}
						</div>
					</>
				)}

				<div className="pregled-naloga-modal-actions">
					<button type="button" className="pregled-naloga-modal-btn" onClick={onCancel}>
						Otkaži
					</button>
					<button type="button" className="pregled-naloga-modal-btn primary" onClick={onSave}>
						Spremi
					</button>
				</div>
			</div>
		</div>
	)
}

export default PregledNalogaEditModal
