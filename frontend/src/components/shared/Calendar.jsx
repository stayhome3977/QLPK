import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { api } from "../../api/http";
import "./Calendar.css";

export function Calendar({ doctorId, patientId, selectedDate, onDateSelect, onMonthChange }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const isUpdatingFromSelectedDate = useRef(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  useEffect(() => {
    if (doctorId) {
      fetchAvailability();
    }
  }, [doctorId, year, month]);

  useEffect(() => {
    if (selectedDate) {
      const selected = new Date(selectedDate);
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const selectedYear = selected.getFullYear();
      const selectedMonth = selected.getMonth();
      
      console.log('useEffect selectedDate:', { 
        selectedDate, 
        currentYear, 
        currentMonth, 
        selectedYear, 
        selectedMonth 
      });
      
      // Only update if the selected date is in a different month
      if (currentYear !== selectedYear || currentMonth !== selectedMonth) {
        console.log('Updating currentDate to match selectedDate month');
        setCurrentDate(new Date(selectedYear, selectedMonth, 1));
        
        // Call fetchAvailability directly with the new month
        setTimeout(() => {
          fetchAvailabilityForMonth(selectedYear, selectedMonth);
        }, 0);
      }
    }
  }, [selectedDate]);

  const fetchAvailabilityForMonth = async (targetYear, targetMonth) => {
    setLoading(true);
    console.log('fetchAvailabilityForMonth called for:', { doctorId, patientId, year: targetYear, month: targetMonth });
    try {
      const params = {
        doctor_id: doctorId,
        year: targetYear,
        month: targetMonth + 1 // JavaScript months are 0-indexed
      };
      if (patientId) {
        params.patient_id = patientId;
      }
      const response = await api.get('/api/v1/appointments/calendar-availability', { params });
      console.log('Availability received:', response.data.availability?.length, 'days');
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

  const fetchAvailability = async () => {
    setLoading(true);
    console.log('fetchAvailability called for:', { doctorId, patientId, year, month });
    try {
      const params = {
        doctor_id: doctorId,
        year: year,
        month: month + 1 // JavaScript months are 0-indexed
      };
      if (patientId) {
        params.patient_id = patientId;
      }
      const response = await api.get('/api/v1/appointments/calendar-availability', { params });
      console.log('Availability received:', response.data.availability?.length, 'days');
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
    console.log('handleDateClick called:', { day, dayInfo });
    if (!dayInfo.clickable) {
      console.log('Day not clickable, returning');
      return;
    }
    
    // Create date in local timezone and format properly
    const selected = new Date(year, month, day);
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('Calling onDateSelect with:', formattedDate, 'from date:', selected);
    onDateSelect(formattedDate, dayInfo);
  };

  const getDayInfo = (day) => {
    return availability.find(item => item.day === day);
  };

  const getDayClassName = (day, dayInfo) => {
    const baseClass = "calendar-day";
    const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isSelected = selectedDate === currentDateStr;
    
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
      case 'orange':
        return `${baseClass} patient-booked`;
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
          <span className="legend-dot patient-booked"></span>
          <span>Bạn đã có lịch hẹn</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unavailable"></span>
          <span>Ngoài ca làm việc</span>
        </div>
      </div>
    </div>
  );
}
