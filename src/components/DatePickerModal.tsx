import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTodayDateString } from '../utils/formatters';

interface DatePickerModalProps {
  visible: boolean;
  currentDate: string; // DD-MM-YYYY or YYYY-MM-DD
  onClose: () => void;
  onSelectDate: (dateDDMMYYYY: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  currentDate,
  onClose,
  onSelectDate,
}) => {
  // Parse initial date
  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      // If DD-MM-YYYY
      if (parts[0].length === 2 && parts[2].length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      // If YYYY-MM-DD
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
    }
    return new Date();
  };

  const [selectedDate, setSelectedDate] = useState<Date>(() => parseDate(currentDate));
  const [viewYear, setViewYear] = useState<number>(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => selectedDate.getMonth());

  useEffect(() => {
    if (visible) {
      const parsed = parseDate(currentDate);
      setSelectedDate(parsed);
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [visible, currentDate]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const y = selectedDate.getFullYear();
    const formatted = `${d}-${m}-${y}`;
    onSelectDate(formatted);
    onClose();
  };

  const handleSetToday = () => {
    const now = new Date();
    setSelectedDate(now);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDayOfWeek || i >= firstDayOfWeek + daysInMonth) {
      cells.push(null);
    } else {
      cells.push(i - firstDayOfWeek + 1);
    }
  }

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  const formattedSelected = `${String(selectedDate.getDate()).padStart(2, '0')}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, '0')}-${selectedDate.getFullYear()}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.calendarCard}>
          {/* Header with Selected Date Banner */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerSubtitle}>Select Bill Date</Text>
              <Text style={styles.selectedDateBanner}>{formattedSelected}</Text>
            </View>
            <TouchableOpacity onPress={handleSetToday} style={styles.todayBtn}>
              <Ionicons name="today-outline" size={16} color="#0f172a" />
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrow}>
              <Ionicons name="chevron-back" size={20} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navArrow}>
              <Ionicons name="chevron-forward" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {/* Day of week headers */}
          <View style={styles.weekdaysRow}>
            {DAYS_OF_WEEK.map((d, idx) => (
              <Text key={idx} style={styles.weekdayText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCell} />;
              }
              const selected = isSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    today && styles.todayCell,
                    selected && styles.selectedCell,
                  ]}
                  onPress={() => handleSelectDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      today && styles.todayText,
                      selected && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDateBanner: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingVertical: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  weekdayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 19,
  },
  todayCell: {
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  selectedCell: {
    backgroundColor: '#0f172a',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  todayText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
