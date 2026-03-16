import TabDatePicker from '../TabComponents/TabDatePicker'

function PregledNalogaFilters({
	nameFilter,
	klijentFilter,
	startDateFilter,
	endDateFilter,
	onNameFilterChange,
	onKlijentFilterChange,
	onStartDateFilterChange,
	onEndDateFilterChange,
	onResetFilters,
}) {
	return (
		<div className="pregled-naloga-filter-wrap">
			<input
				value={nameFilter}
				onChange={(event) => onNameFilterChange(event.target.value)}
				placeholder="Filtriraj po nazivu ili adresi naloga"
				className="pregled-naloga-input"
			/>
			<input
				value={klijentFilter}
				onChange={(event) => onKlijentFilterChange(event.target.value)}
				placeholder="Filtriraj po klijentu"
				className="pregled-naloga-input"
			/>
			<div className="pregled-naloga-date-filters">
				<TabDatePicker
					value={startDateFilter}
					onChange={onStartDateFilterChange}
					output="string"
					className="pregled-naloga-date-picker"
				/>
				<TabDatePicker
					value={endDateFilter}
					onChange={onEndDateFilterChange}
					output="string"
					className="pregled-naloga-date-picker"
				/>
			</div>
			<button type="button" className="pregled-naloga-reset-btn" onClick={onResetFilters}>
				Reset filtera
			</button>
		</div>
	)
}

export default PregledNalogaFilters
