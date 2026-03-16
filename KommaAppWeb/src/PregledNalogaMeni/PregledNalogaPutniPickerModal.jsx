function PregledNalogaPutniPickerModal({
	visible,
	finishPutniParentNalog,
	selectedFinishPutniId,
	onSelectedFinishPutniIdChange,
	finishPutniItems,
	isPutniNalogAktivan,
	formatDateRangeLabel,
	selectedFinishPutniNalog,
	onClose,
	onProceed,
}) {
	if (!visible) return null

	return (
		<div className="pregled-naloga-modal-overlay" onClick={onClose}>
			<div className="pregled-naloga-modal" onClick={(event) => event.stopPropagation()}>
				<h3>Odaberi putni nalog</h3>

				<p className="pregled-naloga-field-label">Radni nalog</p>
				<input
					value={finishPutniParentNalog?.naziv_naloga || 'N/A'}
					className="pregled-naloga-input"
					readOnly
					disabled
				/>

				<p className="pregled-naloga-field-label">Putni nalozi za odabranog radnika</p>
				<select
					value={selectedFinishPutniId}
					onChange={(event) => onSelectedFinishPutniIdChange(event.target.value)}
					className="pregled-naloga-input"
				>
					{finishPutniItems.map((item) => (
						<option
							key={String(item.id_putnog_nalog)}
							value={String(item.id_putnog_nalog)}
							disabled={!isPutniNalogAktivan(item)}
						>
							{`${formatDateRangeLabel(item.pocetak_naloga, item.kraj_naloga)} (${item.status || 'N/A'})`}
						</option>
					))}
				</select>

				<div className="pregled-naloga-modal-actions">
					<button type="button" className="pregled-naloga-modal-btn" onClick={onClose}>
						Otkaži
					</button>
					<button
						type="button"
						className="pregled-naloga-modal-btn primary"
						onClick={onProceed}
						disabled={!selectedFinishPutniNalog || !isPutniNalogAktivan(selectedFinishPutniNalog)}
					>
						Nastavi
					</button>
				</div>
			</div>
		</div>
	)
}

export default PregledNalogaPutniPickerModal
