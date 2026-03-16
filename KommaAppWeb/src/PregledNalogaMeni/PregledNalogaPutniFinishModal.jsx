import TabTimePicker from '../TabComponents/TabTimePicker'
import TabDatePicker from '../TabComponents/TabDatePicker'

const timeStringToDate = (value) => {
	const normalized = String(value || '').trim()
	if (!normalized) return null

	const match = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
	if (!match) return null

	const nextDate = new Date()
	nextDate.setHours(Number(match[1]), Number(match[2]), 0, 0)
	return nextDate
}

const dateToTimeString = (value) => {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) return ''
	const hours = String(value.getHours()).padStart(2, '0')
	const minutes = String(value.getMinutes()).padStart(2, '0')
	return `${hours}:${minutes}`
}

function PregledNalogaPutniFinishModal({
	visible,
	finishPutniParentNalog,
	selectedFinishPutniNalog,
	formatDateRangeLabel,
	finishPolazakDate,
	onFinishPolazakDateChange,
	finishPolazakTime,
	onFinishPolazakTimeChange,
	finishDolazakDate,
	onFinishDolazakDateChange,
	finishDolazakTime,
	onFinishDolazakTimeChange,
	finishTrosakSpavanja,
	onFinishTrosakSpavanjaChange,
	finishTrosakGoriva,
	onFinishTrosakGorivaChange,
	finishTrosakMaterijala,
	onFinishTrosakMaterijalaChange,
	finishCestarinaTrajekt,
	onFinishCestarinaTrajektChange,
	finishOstalo,
	onFinishOstaloChange,
	onClose,
	onConfirm,
}) {
	if (!visible) return null

	return (
		<div className="pregled-naloga-modal-overlay" onClick={onClose}>
			<div className="pregled-naloga-modal" onClick={(event) => event.stopPropagation()}>
				<h3>Završi putni nalog</h3>

				<p className="pregled-naloga-field-label">Radni nalog</p>
				<input
					value={finishPutniParentNalog?.naziv_naloga || 'N/A'}
					className="pregled-naloga-input"
					readOnly
					disabled
				/>

				<p className="pregled-naloga-field-label">Odabrani putni nalog</p>
				<input
					value={selectedFinishPutniNalog ? formatDateRangeLabel(selectedFinishPutniNalog.pocetak_naloga, selectedFinishPutniNalog.kraj_naloga) : 'N/A'}
					className="pregled-naloga-input"
					readOnly
					disabled
				/>

				<p className="pregled-naloga-field-label">Vrijeme polaska</p>
				<div className="pregled-naloga-datetime-grid">
					<TabDatePicker
						value={finishPolazakDate}
						onChange={onFinishPolazakDateChange}
						output="string"
						className="pregled-naloga-date-picker"
					/>
					<TabTimePicker
						value={timeStringToDate(finishPolazakTime)}
						onChange={(nextValue) => onFinishPolazakTimeChange(dateToTimeString(nextValue))}
						className="pregled-naloga-time-picker"
					/>
				</div>

				<p className="pregled-naloga-field-label">Vrijeme dolaska</p>
				<div className="pregled-naloga-datetime-grid">
					<TabDatePicker
						value={finishDolazakDate}
						onChange={onFinishDolazakDateChange}
						output="string"
						className="pregled-naloga-date-picker"
					/>
					<TabTimePicker
						value={timeStringToDate(finishDolazakTime)}
						onChange={(nextValue) => onFinishDolazakTimeChange(dateToTimeString(nextValue))}
						className="pregled-naloga-time-picker"
					/>
				</div>

				<p className="pregled-naloga-field-label">Trošak spavanja</p>
				<input
					type="number"
					min="0"
					step="0.01"
					value={finishTrosakSpavanja}
					onChange={(event) => onFinishTrosakSpavanjaChange(event.target.value)}
					className="pregled-naloga-input"
					placeholder="0"
				/>

				<p className="pregled-naloga-field-label">Trošak goriva</p>
				<input
					type="number"
					min="0"
					step="0.01"
					value={finishTrosakGoriva}
					onChange={(event) => onFinishTrosakGorivaChange(event.target.value)}
					className="pregled-naloga-input"
					placeholder="0"
				/>

				<p className="pregled-naloga-field-label">Trošak materijala</p>
				<input
					type="number"
					min="0"
					step="0.01"
					value={finishTrosakMaterijala}
					onChange={(event) => onFinishTrosakMaterijalaChange(event.target.value)}
					className="pregled-naloga-input"
					placeholder="0"
				/>

				<p className="pregled-naloga-field-label">Cestarina / trajekt</p>
				<input
					type="number"
					min="0"
					step="0.01"
					value={finishCestarinaTrajekt}
					onChange={(event) => onFinishCestarinaTrajektChange(event.target.value)}
					className="pregled-naloga-input"
					placeholder="0"
				/>

				<p className="pregled-naloga-field-label">Ostalo</p>
				<input
					type="number"
					min="0"
					step="0.01"
					value={finishOstalo}
					onChange={(event) => onFinishOstaloChange(event.target.value)}
					className="pregled-naloga-input"
					placeholder="0"
				/>

				<div className="pregled-naloga-modal-actions">
					<button type="button" className="pregled-naloga-modal-btn" onClick={onClose}>
						Otkaži
					</button>
					<button type="button" className="pregled-naloga-modal-btn primary" onClick={onConfirm}>
						Potvrdi i kreiraj PDF
					</button>
				</div>
			</div>
		</div>
	)
}

export default PregledNalogaPutniFinishModal
