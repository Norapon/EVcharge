// Code.gs
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ระบบจองเวลาชาร์จรถ EV')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getBookings() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bookingSheet = ss.getSheetByName('Bookings');
    if (!bookingSheet) {
      // ถ้าไม่มีชีทให้สร้างใหม่
      const sheet = ss.insertSheet('Bookings');
      sheet.appendRow(['ผู้จอง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'แท่นชาร์จ', 'จำนวนชั่วโมง', 'ค่าใช้จ่าย']);
      return [];
    }

    const bookings = bookingSheet.getDataRange().getValues();
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0]; // รูปแบบ: YYYY-MM-DD

    const filteredBookings = bookings.filter((row, index) => {
      if (index === 0) return false; // ข้ามแถว header
      const bookingDate = new Date(row[1]); // สมมติว่า column 'เวลาเริ่ม' อยู่ที่ index 1
      const bookingDateString = bookingDate.toISOString().split('T')[0];
      return bookingDateString === todayDateString;
    });

    return filteredBookings;
  } catch (error) {
    Logger.log('Error in getBookings: ' + error.toString());
    throw error;
  }
}

function addBooking(bookingData) {
  try {
    Logger.log('Received booking data: ' + JSON.stringify(bookingData));
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let bookingSheet = ss.getSheetByName('Bookings');
    
    if (!bookingSheet) {
      bookingSheet = ss.insertSheet('Bookings');
      bookingSheet.appendRow(['ผู้จอง', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'แท่นชาร์จ', 'จำนวนชั่วโมง', 'ค่าใช้จ่าย']);
    }
    
    // Check for booking conflicts
    const existingBookings = getBookings();
    const newStartTime = new Date(bookingData.startDateTime);
    const newEndTime = new Date(bookingData.endDateTime);
    
    Logger.log('Checking conflicts for time range: ' + newStartTime + ' to ' + newEndTime);
    
   for (let booking of existingBookings) {
  const bookingStart = new Date(booking[1]);
  const bookingEnd = new Date(booking[2]);

  // ตรวจสอบเวลาทับซ้อน (ครอบคลุมทุกกรณี)
  if (booking[3] === bookingData.stationId && 
      (newStartTime < bookingEnd && newEndTime > bookingStart)) {
    throw new Error('ช่วงเวลานี้มีการจองแล้ว');
  }
}
    
    // Add new booking
    const rowData = [
      bookingData.name,
      newStartTime,
      newEndTime,
      bookingData.stationId,
      bookingData.duration,
      bookingData.cost
    ];
    
    Logger.log('Adding new booking row: ' + JSON.stringify(rowData));
    bookingSheet.appendRow(rowData);
    
    return true;
  } catch (error) {
    Logger.log('Error in addBooking: ' + error.toString());
    throw error;
  }
}

function getAvailableTimeSlots() {
  try {
    const bookings = getBookings();
    const timeSlots = [];
    
    for (let station = 1; station <= 2; station++) {
      const stationSlots = [];
      for (let hour = 7; hour <= 16; hour++) {
        const slot = {
          time: `${hour}:00`,
          available: true,
          bookedBy: ''
        };
        
        // Check if slot is booked
        for (let booking of bookings) {
          const startHour = new Date(booking[1]).getHours();
          const endHour = new Date(booking[2]).getHours();
          if (booking[3] === station && hour >= startHour && hour < endHour) {
            slot.available = false;
            slot.bookedBy = booking[0];
            break;
          }
        }
        
        stationSlots.push(slot);
      }
      timeSlots.push(stationSlots);
    }
    
    return timeSlots;
  } catch (error) {
    Logger.log('Error in getAvailableTimeSlots: ' + error.toString());
    throw error;
  }
}
