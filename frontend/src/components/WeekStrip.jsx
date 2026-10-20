import React from 'react';

/**
 * Component thanh chọn thứ trong tuần (Thứ 2 đến Chủ Nhật)
 * @param {string} selectedDate - Ngày đang chọn định dạng YYYY-MM-DD
 * @param {function} onSelectDate - Callback khi chọn ngày mới (newDateStr)
 * @param {boolean} allowPast - Cho phép chọn ngày trong quá khứ hay không (true cho Admin/Staff, false cho Customer)
 * @param {string} title - Tiêu đề khối
 * @param {string} subtitle - Phụ đề hướng dẫn
 */
function WeekStrip({
  selectedDate,
  onSelectDate,
  allowPast = false,
  title = "Lịch Theo Tuần",
  subtitle = "Bấm chọn nhanh từ Thứ 2 đến Chủ Nhật"
}) {
  const todayStr = new Date().toISOString().split('T')[0];

  // Lấy tên Thứ trong tuần theo ngày YYYY-MM-DD
  const getDayOfWeekName = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const daysMap = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return daysMap[d.getDay()];
  };

  // Định dạng ngày hiển thị DD/MM/YYYY
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}/${mm}/${yyyy}`;
  };

  // Lấy danh sách 7 ngày từ Thứ 2 đến Chủ Nhật của tuần chứa baseDateStr
  const getWeekDays = (baseDateStr) => {
    const curr = new Date(baseDateStr + 'T00:00:00');
    const day = curr.getDay(); // 0 là Chủ Nhật, 1 là Thứ Hai...
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const week = [];
    const dayShortLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const dayFullNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      week.push({
        dateStr,
        label: dayShortLabels[i],
        fullName: dayFullNames[i],
        dayNum: dd,
        monthNum: mm,
        displayDate: `${dd}/${mm}`,
        isWeekend: i >= 5, // Thứ 7 & Chủ Nhật
        isToday: dateStr === todayStr,
        isPast: dateStr < todayStr
      });
    }

    return week;
  };

  const handlePrevWeek = () => {
    const curr = new Date(selectedDate + 'T00:00:00');
    curr.setDate(curr.getDate() - 7);
    onSelectDate(curr.toISOString().split('T')[0]);
  };

  const handleCurrentWeek = () => {
    onSelectDate(todayStr);
  };

  const handleNextWeek = () => {
    const curr = new Date(selectedDate + 'T00:00:00');
    curr.setDate(curr.getDate() + 7);
    onSelectDate(curr.toISOString().split('T')[0]);
  };

  const weekDays = getWeekDays(selectedDate);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      padding: '16px 18px',
      marginBottom: '20px',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
      {/* THANH ĐIỀU HƯỚNG & TIÊU ĐỀ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📅</span>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#064e3b', fontWeight: '800' }}>
              {getDayOfWeekName(selectedDate)} — Ngày {formatDisplayDate(selectedDate)}
            </h3>
          </div>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
            {subtitle}
          </p>
        </div>

        {/* CÁC NÚT ĐIỀU HƯỚNG TUẦN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrevWeek}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
            title="Xem tuần trước"
          >
            &larr; Tuần Trước
          </button>

          <button
            type="button"
            onClick={handleCurrentWeek}
            style={{
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Hôm Nay
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}
            title="Xem tuần sau"
          >
            Tuần Sau &rarr;
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
            <input
              type="date"
              min={!allowPast ? todayStr : undefined}
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              style={{
                padding: '5px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* DẢI 7 NÚT THỨ 2 ĐẾN CHỦ NHẬT (CHỐNG TRÀN VIỀN TUYỆT ĐỐI) */}
      <div style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        boxSizing: 'border-box',
        padding: '2px 0'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(72px, 1fr))',
          gap: '8px',
          width: '100%',
          minWidth: '540px',
          boxSizing: 'border-box'
        }}>
          {weekDays.map((dItem) => {
            const isSelected = dItem.dateStr === selectedDate;
            const isDisabled = dItem.isPast && !allowPast;

            return (
              <button
                key={dItem.dateStr}
                type="button"
                onClick={() => onSelectDate(dItem.dateStr)}
                disabled={isDisabled}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid #059669' : dItem.isWeekend ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  background: isSelected ? '#059669' : dItem.isWeekend ? '#fffdf5' : '#ffffff',
                  color: isSelected ? '#ffffff' : isDisabled ? '#94a3b8' : '#1e293b',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: (isDisabled && !isSelected) ? 0.45 : 1,
                  boxSizing: 'border-box',
                  minHeight: '70px',
                  width: '100%',
                  margin: 0,
                  outline: 'none',
                  boxShadow: isSelected ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none'
                }}
              >
                {/* HUY HIỆU NẰM GỌN BÊN TRONG NÚT - KHÔNG TRÀN VIỀN */}
                {dItem.isToday ? (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isSelected ? '#ffffff' : '#10b981',
                    color: isSelected ? '#064e3b' : '#ffffff',
                    marginBottom: '3px',
                    lineHeight: '1.2'
                  }}>
                    HÔM NAY
                  </span>
                ) : dItem.isWeekend ? (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    background: isSelected ? '#ffffff' : '#fef3c7',
                    color: isSelected ? '#b45309' : '#b45309',
                    marginBottom: '3px',
                    lineHeight: '1.2'
                  }}>
                    CUỐI TUẦN
                  </span>
                ) : (
                  <span style={{ height: '14px', marginBottom: '3px' }}></span>
                )}

                {/* TÊN THỨ */}
                <span style={{
                  fontSize: '12px',
                  fontWeight: isSelected ? '800' : '700',
                  color: isSelected ? '#ffffff' : dItem.isWeekend ? '#b45309' : '#475569',
                  lineHeight: '1.2',
                  marginBottom: '2px'
                }}>
                  {dItem.label}
                </span>

                {/* NGÀY THÁNG */}
                <span style={{
                  fontSize: '15px',
                  fontWeight: '900',
                  color: isSelected ? '#ffffff' : '#0f172a',
                  lineHeight: '1.2'
                }}>
                  {dItem.displayDate}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeekStrip;

