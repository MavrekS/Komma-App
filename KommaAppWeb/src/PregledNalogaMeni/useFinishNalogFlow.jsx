import { useEffect, useRef, useState } from 'react'
import { updateNalog } from '../services/naloziApi'

function useFinishNalogFlow({ loggedInRadnikId, onExportPdf, onReloadNalozi }) {
	const [finishModalVisible, setFinishModalVisible] = useState(false)
	const [finishingNalog, setFinishingNalog] = useState(null)
	const [hasSignature, setHasSignature] = useState(false)
	const signatureCanvasRef = useRef(null)
	const isDrawingRef = useRef(false)

	const getCanvasContext = () => {
		const canvas = signatureCanvasRef.current
		if (!canvas) return null
		const context = canvas.getContext('2d')
		if (!context) return null
		return { canvas, context }
	}

	const prepareSignatureCanvas = () => {
		const prepared = getCanvasContext()
		if (!prepared) return

		const { canvas, context } = prepared
		const ratio = window.devicePixelRatio || 1
		const displayWidth = Math.max(520, canvas.parentElement?.clientWidth || 520)
		const displayHeight = 200

		canvas.width = Math.floor(displayWidth * ratio)
		canvas.height = Math.floor(displayHeight * ratio)
		canvas.style.width = `${displayWidth}px`
		canvas.style.height = `${displayHeight}px`

		context.setTransform(1, 0, 0, 1, 0, 0)
		context.scale(ratio, ratio)
		context.fillStyle = '#ffffff'
		context.fillRect(0, 0, displayWidth, displayHeight)
		context.lineWidth = 2
		context.lineCap = 'round'
		context.strokeStyle = '#111111'
		setHasSignature(false)
	}

	const getPointerPosition = (event) => {
		const canvas = signatureCanvasRef.current
		if (!canvas) return null
		const rect = canvas.getBoundingClientRect()
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		}
	}

	const handleSignatureStart = (event) => {
		const prepared = getCanvasContext()
		const point = getPointerPosition(event)
		if (!prepared || !point) return

		event.preventDefault()
		const { context } = prepared
		context.beginPath()
		context.moveTo(point.x, point.y)
		context.lineTo(point.x + 0.1, point.y + 0.1)
		context.stroke()
		isDrawingRef.current = true
		setHasSignature(true)
	}

	const handleSignatureMove = (event) => {
		if (!isDrawingRef.current) return
		const prepared = getCanvasContext()
		const point = getPointerPosition(event)
		if (!prepared || !point) return

		event.preventDefault()
		const { context } = prepared
		context.lineTo(point.x, point.y)
		context.stroke()
	}

	const handleSignatureEnd = () => {
		isDrawingRef.current = false
	}

	const clearSignature = () => {
		prepareSignatureCanvas()
	}

	const closeFinishModal = () => {
		setFinishModalVisible(false)
		setFinishingNalog(null)
		setHasSignature(false)
	}

	const handleOpenFinishNalog = (nalog) => {
		setFinishingNalog(nalog)
		setFinishModalVisible(true)
	}

	useEffect(() => {
		if (!finishModalVisible) return
		requestAnimationFrame(() => {
			prepareSignatureCanvas()
		})
	}, [finishModalVisible])

	const handleFinishNalog = async () => {
		if (!finishingNalog) return

		if (!hasSignature) {
			window.alert('Greška: Potpis je obavezan za završetak naloga')
			return
		}

		if (!Number.isInteger(loggedInRadnikId) || loggedInRadnikId <= 0) {
			window.alert('Greška: Neispravan korisnik za potvrdu završetka naloga')
			return
		}

		const payload = {
			status_naloga: 'izvrseni',
			actor_id_radnik: loggedInRadnikId,
		}

		const signatureDataUrl = signatureCanvasRef.current?.toDataURL('image/png') || null

		const result = await updateNalog(finishingNalog.id_nalog, payload)
		if (result?.ok) {
			const finishedNalogForPdf = {
				...finishingNalog,
				status_naloga: 'izvrseni',
			}
			await onExportPdf(finishedNalogForPdf, {
				customerSignatureDataUrl: signatureDataUrl,
			})
			window.alert('Nalog je uspješno završen')
			closeFinishModal()
			await onReloadNalozi()
			return
		}

		window.alert(`Greška: ${result?.error || 'Neuspješno zatvaranje naloga'}`)
	}

	return {
		finishModalVisible,
		finishingNalog,
		signatureCanvasRef,
		handleSignatureStart,
		handleSignatureMove,
		handleSignatureEnd,
		clearSignature,
		closeFinishModal,
		handleOpenFinishNalog,
		handleFinishNalog,
	}
}

export default useFinishNalogFlow
