function PregledNalogaHeader({
	allowedStatuses,
	selectedStatuses,
	onToggleStatus,
	onResetStatusSelection,
}) {
	return (
		<div className="pregled-naloga-header">
			<p className="pregled-naloga-title">Pregled Naloga</p>
			<div className="pregled-naloga-status-chip-wrap header-inline">
				{allowedStatuses.map((status) => {
					const isSelected = selectedStatuses.includes(status)
					return (
						<button
							key={status}
							type="button"
							className={`pregled-naloga-status-chip${isSelected ? ' is-selected' : ''}`}
							onClick={() => onToggleStatus(status)}
						>
							{status}
						</button>
					)
				})}
				<button type="button" className="pregled-naloga-modal-btn" onClick={onResetStatusSelection}>
					Sve
				</button>
			</div>
		</div>
	)
}

export default PregledNalogaHeader
