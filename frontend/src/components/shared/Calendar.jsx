import { useState, useEffect } from "react";
import { api } from "../../api/http";
import "./Calendar.css";

export function Calendar({ doctorId, selectedDate, onDateSelect, onMonthChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  useEffect(() => {
    if (doctorId) {
      fetchAvailability();
    }
  }, [doctorId, year, month]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/v1/appointments/calendar-availability', {
        params: {
          doctor_id: doctorId,
          year: year,
          month: month + 1 // JavaScript months are 0-indexed
        }
      });
      setAvailability(response.data.availability || []);
      if (onMonthChange) {
        onMonthChange(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching calendar availability:', error);
      setAvailability([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1);
    setCurrentDate(newDate);
  };

  const handleDateClick = (day, dayInfo) => {
    if (!dayInfo.clickable) return;
    
    const selected = new Date(year, month, day);
    const formattedDate = selected.toISOString().split('T')[0];
    onDateSelect(formattedDate, dayInfo);
  };

  const getDayInfo = (day) => {
    return availability.find(item => item.day === day);
  };

  const getDayClassName = (day, dayInfo) => {
    const baseClass = "calendar-day";
    const isSelected = selectedDate === new Date(year, month, day).toISOString().split('T')[0];
    
    if (isSelected) {
      return `${baseClass} selected`;
    }
    
    if (!dayInfo) {
      return `${baseClass} empty`;
    }
    
    switch (dayInfo.color) {
      case 'green':
        return `${baseClass} available`;
      case 'yellow':
        return `${baseClass} almost-full`;
      case 'red':
        return `${baseClass} full`;
      case 'grey':
      default:
        return `${baseClass} unavailable`;
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayInfo = getDayInfo(day);
      days.push(
        <div
          key={day}
          className={getDayClassName(day, dayInfo)}
          onClick={() => handleDateClick(day, dayInfo)}
          title={dayInfo ? `${dayInfo.available_slots}/${dayInfo.total_slots} slots available` : 'No schedule'}
        >
          {day}
        </div>
      );
    }
    
    return days;
  };

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button type="button" onClick={handlePrevMonth} className="calendar-nav-button">
          &lt;
        </button>
        <h3>{monthNames[month]} {year}</h3>
        <button type="button" onClick={handleNextMonth} className="calendar-nav-button">
          &gt;
        </button>
      </div>
      
      {loading && (
        <div className="calendar-loading">
          <p>Đang tải dữ liệu...</p>
        </div>
      )}
      
      <div className="calendar-weekdays">
        {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>
      
      <div className="calendar-days">
        {renderCalendarDays()}
      </div>
      
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-dot available"></span>
          <span>Còn trống</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot almost-full"></span>
          <span>Sắp hết slot</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot full"></span>
          <span>Hết slot</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unavailable"></span>
          <span>Ngoài ca làm việc</span>
        </div>
      </div>
    </div>
  );
}
