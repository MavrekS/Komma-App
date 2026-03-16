import { useEffect, useMemo, useRef, useState } from 'react'
import './TabDatetimePicker.css'

const pad2 = (value) => String(value).padStart(2, '0')

const parseDateValue = (value) => {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(String(value).trim())
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function TabTimePicker({ value, onChange, placeholder = 'HH:mm', className = '' }) {
  const [selectedHour, setSelectedHour] = useState('')
  const [selectedMinute, setSelectedMinute] = useState('')
  const [timeMenuOpen, setTimeMenuOpen] = useState(false)
  const [timeStep, setTimeStep] = useState('hour')
  const timeMenuRef = useRef(null)

  const parseTimeValue = (rawValue) => {
    const normalized = String(rawValue || '').trim()
    if (!normalized) return null

    const match = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
    if (!match) return null

    const hours = Number(match[1])
    const minutes = Number(match[2])
    const nextDate = new Date()
    nextDate.setHours(hours, minutes, 0, 0)
    return nextDate
  }

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => pad2(index)), [])
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, index) => pad2(index)), [])

  useEffect(() => {
    const parsed = parseDateValue(value)

    if (!parsed) {
      setSelectedHour('')
      setSelectedMinute('')
      return
    }

    setSelectedHour(pad2(parsed.getHours()))
    setSelectedMinute(pad2(parsed.getMinutes()))
  }, [value])

  useEffect(() => {
    if (!timeMenuOpen) return undefined

    const handleClickOutside = (event) => {
      if (!timeMenuRef.current?.contains(event.target)) {
        setTimeMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [timeMenuOpen])

  const emitTimeChange = (hour, minute) => {
    if (!hour || !minute) {
      onChange?.(null)
      return
    }

    const parsed = parseTimeValue(`${hour}:${minute}`)
    if (!parsed) return
    onChange?.(parsed)
  }

  const handleHourSelect = (nextHour) => {
    setSelectedHour(nextHour)

    if (!nextHour) {
      setSelectedMinute('')
      onChange?.(null)
      return
    }

    if (selectedMinute) {
      emitTimeChange(nextHour, selectedMinute)
    }

    setTimeStep('minute')
  }

  const handleMinuteSelect = (nextMinute) => {
    setSelectedMinute(nextMinute)
    emitTimeChange(selectedHour, nextMinute)
    if (nextMinute) {
      setTimeMenuOpen(false)
      setTimeStep('hour')
    }
  }

  const timeDisplay = selectedHour && selectedMinute ? `${selectedHour}:${selectedMinute}` : placeholder
  const optionList = timeStep === 'hour' ? hourOptions : minuteOptions
  const selectedValue = timeStep === 'hour' ? selectedHour : selectedMinute

  return (
    <div className={`tab-datetime-picker tab-datetime-picker-time-wrap ${className}`.trim()} ref={timeMenuRef}>
      <button
        type="button"
        className="tab-datetime-picker-input tab-datetime-picker-time-trigger"
        onClick={() => {
          setTimeMenuOpen((current) => {
            const nextOpen = !current
            if (nextOpen) {
              setTimeStep('hour')
            }
            return nextOpen
          })
        }}
        aria-label="Odaberi vrijeme"
        aria-expanded={timeMenuOpen}
      >
        {timeDisplay}
      </button>

      {timeMenuOpen && (
        <div className="tab-datetime-picker-time-menu">
          <div className="tab-datetime-picker-time-menu-header">
            <span>{timeStep === 'hour' ? 'Sat (HH)' : 'Minuta (mm)'}</span>
            {timeStep === 'minute' && (
              <button
                type="button"
                className="tab-datetime-picker-time-back"
                onClick={() => setTimeStep('hour')}
              >
                Natrag
              </button>
            )}
          </div>

          <div className="tab-datetime-picker-time-options">
            {optionList.map((option) => {
              const isSelected = option === selectedValue
              return (
                <button
                  key={option}
                  type="button"
                  className={`tab-datetime-picker-time-option${isSelected ? ' is-selected' : ''}`}
                  onClick={() => {
                    if (timeStep === 'hour') {
                      handleHourSelect(option)
                      return
                    }

                    handleMinuteSelect(option)
                  }}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TabTimePicker
