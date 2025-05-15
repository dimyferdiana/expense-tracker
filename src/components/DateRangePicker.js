import React, { useState } from 'react';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getDayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(date, start, end) {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

export default function DateRangePicker({ 
  value, 
  onChange, 
  onClose, 
  isSingleDatePicker = false,
  pickerLabel = "Select Date Range"
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selecting, setSelecting] = useState('start');
  const [range, setRange] = useState({ 
    start: value?.start || null, 
    end: value?.end || null 
  });

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = new Date(year, month, 1).getDay();

  const handleDayClick = (date) => {
    if (isSingleDatePicker) {
      // For single date picker, just set the date
      if (value?.start !== undefined) {
        setRange({ start: date, end: null });
        if (onChange) onChange({ start: date, end: null });
      } else if (value?.end !== undefined) {
        setRange({ start: null, end: date });
        if (onChange) onChange({ start: null, end: date });
      }
      setSelecting('start');
    } else {
      // Original range selection logic
      if (selecting === 'start') {
        setRange({ start: date, end: null });
        setSelecting('end');
      } else {
        if (date < range.start) {
          setRange({ start: date, end: range.start });
        } else {
          setRange({ start: range.start, end: date });
        }
        setSelecting('start');
        if (onChange) onChange({ 
          start: range.start, 
          end: date < range.start ? range.start : date 
        });
      }
    }
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg w-full max-w-xs mt-2">
      <div className="flex justify-between items-center mb-2">
        <button 
          type="button" 
          onClick={handlePrevMonth} 
          className="text-gray-400 hover:text-white px-2"
        >
          &#8592;
        </button>
        <span className="text-white font-semibold">
          {new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button 
          type="button" 
          onClick={handleNextMonth} 
          className="text-gray-400 hover:text-white px-2"
        >
          &#8594;
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => (
          <div key={d} className={`text-xs text-center ${i === 0 || i === 6 ? 'text-red-400' : 'text-gray-300'}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array(firstDay).fill(null).map((_, i) => <div key={i}></div>)}
        {Array(daysInMonth).fill(null).map((_, i) => {
          const date = new Date(year, month, i + 1);
          let isSelected = false;
          
          // Handle selection display for single date picker or range picker
          if (isSingleDatePicker) {
            if (value?.start !== undefined) {
              isSelected = isSameDay(date, range.start);
            } else if (value?.end !== undefined) {
              isSelected = isSameDay(date, range.end);
            }
          } else {
            isSelected = isSameDay(date, range.start) || isSameDay(date, range.end);
          }
          
          const inRange = !isSingleDatePicker && isInRange(date, range.start, range.end);
          
          return (
            <button
              key={i}
              className={`w-8 h-8 rounded-full text-sm flex items-center justify-center transition-colors
                ${isWeekend(date) ? 'text-red-400' : 'text-gray-200'}
                ${isSelected ? 'bg-indigo-600 text-white' : inRange ? 'bg-indigo-900 text-white' : 'hover:bg-gray-700'}
              `}
              onClick={() => handleDayClick(date)}
              type="button"
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center mt-4">
        <div className="text-xs text-gray-300">
          {isSingleDatePicker ? (
            pickerLabel
          ) : (
            <>
              {range.start ? `Start: ${range.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : 'Pick start date'}
              <br />
              {range.end ? `End: ${range.end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}` : (range.start ? 'Pick end date' : '')}
            </>
          )}
        </div>
        <button
          className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-xs"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
} 