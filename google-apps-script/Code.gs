/**
 * GOOGLE SHEETS — nhận dữ liệu từ website (qua Vercel)
 *
 * Cách làm (một lần):
 * 1. Tạo Google Sheet mới (trang tính trống).
 * 2. Menu: Extensions → Apps Script (Mở rộng → Apps Script).
 * 3. Xóa code mặc định, dán TOÀN BỘ file này vào, Ctrl+S lưu.
 * 4. Nút Deploy (Triển khai) → New deployment → chọn type: Web app (Ứng dụng web).
 *    - Execute as: Me (Tôi)
 *    - Who has access: Anyone (Bất kỳ ai) — để server Vercel gọi được.
 * 5. Deploy → copy URL (dạng https://script.google.com/macros/s/.../exec).
 * 6. Vercel → Environment Variables → GOOGLE_SCRIPT_URL = URL đó → Save → Redeploy.
 *
 * Mỗi lần người chơi gửi khảo sát, một dòng mới: thời gian | mã người tham gia | JSON đầy đủ.
 * Bạn mở Sheet → File → Download → CSV để phân tích, hoặc xem cột payload_json.
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["timestamp", "participant_id", "payload_json"]);
    }
    var raw = e.postData && e.postData.contents ? e.postData.contents : "{}";
    var data = JSON.parse(raw);
    var pid = data.participantId != null ? String(data.participantId) : "";
    var jsonStr = JSON.stringify(data);
    sheet.appendRow([new Date(), pid, jsonStr]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
      ContentService.MimeType.JSON
    );
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Use POST with JSON body. Configure GOOGLE_SCRIPT_URL on Vercel."
  ).setMimeType(ContentService.MimeType.TEXT);
}
