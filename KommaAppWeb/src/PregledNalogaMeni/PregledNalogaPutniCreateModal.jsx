import TabComboBoxRadnici from '../TabComponents/TabComboBoxRadnici'
import TabDatePicker from '../TabComponents/TabDatePicker'

function PregledNalogaPutniCreateModal({
	visible,
	poslodavac,
	putniRadnikIds,
	onPutniRadnikIdsChange,
	putniRadniciItems,
	selectedPutniNalog,
	resolveAdresaNaziv,
	putniSvrha,
	onPutniSvrhaChange,
	putniPolazak,
	onPutniPolazakChange,
	putniPovratak,
	onPutniPovratakChange,
	onClose,
	onSave,
}) {
	if (!visible) return null

	return (
		<div className="pregled-naloga-modal-overlay" onClick={onClose}>
			<div className="pregled-naloga-modal" onClick={(event) => event.stopPropagation()}>
				<h3>Kreiraj putni nalog</h3>

				<p className="pregled-naloga-field-label">Naziv firme</p>
				<input value={poslodavac.naziv || 'N/A'} className="pregled-naloga-input" readOnly disabled />

				<p className="pregled-naloga-field-label">Adresa (mjesto polaska)</p>
				<input value={poslodavac.adresa || 'N/A'} className="pregled-naloga-input" readOnly disabled />

				{poslodavac.jeHrvatska && (
					<>
						<p className="pregled-naloga-field-label">OIB poslodavca</p>
						<input value={poslodavac.oib || 'N/A'} className="pregled-naloga-input" readOnly disabled />
					</>
				)}

				<p className="pregled-naloga-field-label">Zaposlenici (jedan ili više)</p>
				<TabComboBoxRadnici
					placeholder="Odaberite jednog ili više radnika"
					value={putniRadnikIds}
					onChange={onPutniRadnikIdsChange}
					multiple
					items={putniRadniciItems}
				/>

				<p className="pregled-naloga-field-label">Odredište</p>
				<input
					value={selectedPutniNalog ? resolveAdresaNaziv(selectedPutniNalog) : 'N/A'}
					className="pregled-naloga-input"
					readOnly
					disabled
				/>

				<p className="pregled-naloga-field-label">Svrha putovanja</p>
				<textarea
					value={putniSvrha}
					onChange={(event) => onPutniSvrhaChange(event.target.value)}
					placeholder="Npr. sastanak s klijentom"
					className="pregled-naloga-input pregled-naloga-textarea"
				/>

				<p className="pregled-naloga-field-label">Datum polaska</p>
				<TabDatePicker
					value={putniPolazak}
					onChange={onPutniPolazakChange}
					output="string"
					className="pregled-naloga-date-picker"
				/>

				<p className="pregled-naloga-field-label">Datum povratka</p>
				<TabDatePicker
					value={putniPovratak}
					onChange={onPutniPovratakChange}
					output="string"
					className="pregled-naloga-date-picker"
				/>

				<div className="pregled-naloga-modal-actions">
					<button type="button" className="pregled-naloga-modal-btn" onClick={onClose}>
						Otkaži
					</button>
					<button type="button" className="pregled-naloga-modal-btn primary" onClick={onSave}>
						Spremi putni nalog
					</button>
				</div>
			</div>
		</div>
	)
}

export default PregledNalogaPutniCreateModal
