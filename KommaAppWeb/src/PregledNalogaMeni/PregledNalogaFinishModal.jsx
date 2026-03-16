function PregledNalogaFinishModal({
	visible,
	finishingNalog,
	signatureCanvasRef,
	onSignatureStart,
	onSignatureMove,
	onSignatureEnd,
	onClearSignature,
	onClose,
	onConfirm,
}) {
	if (!visible) return null

	return (
		<div className="pregled-naloga-modal-overlay" onClick={onClose}>
			<div className="pregled-naloga-modal" onClick={(event) => event.stopPropagation()}>
				<h3>Završi nalog</h3>
				<p className="pregled-naloga-field-label">Nalog</p>
				<input
					value={finishingNalog?.naziv_naloga || 'N/A'}
					className="pregled-naloga-input"
					disabled
					readOnly
				/>

				<p className="pregled-naloga-field-label">Potpis naručitelja</p>
				<div className="pregled-naloga-signature-wrap">
					<canvas
						ref={signatureCanvasRef}
						className="pregled-naloga-signature-canvas"
						onPointerDown={onSignatureStart}
						onPointerMove={onSignatureMove}
						onPointerUp={onSignatureEnd}
						onPointerLeave={onSignatureEnd}
						onPointerCancel={onSignatureEnd}
					/>
				</div>

				<div className="pregled-naloga-modal-actions">
					<button type="button" className="pregled-naloga-modal-btn" onClick={onClearSignature}>
						Obriši potpis
					</button>
					<button type="button" className="pregled-naloga-modal-btn" onClick={onClose}>
						Otkaži
					</button>
					<button type="button" className="pregled-naloga-modal-btn primary" onClick={onConfirm}>
						Potvrdi završetak
					</button>
				</div>
			</div>
		</div>
	)
}

export default PregledNalogaFinishModal
