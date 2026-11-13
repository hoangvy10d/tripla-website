/**
 * TRIPLA DATABASE EXPORT TOOL (`export_db.js`)
 * Xuất toàn bộ 18+ Collections từ MongoDB Compass (tripla_db) thành các file JSON chuẩn
 * và tự động đóng gói thành file `tripla_database.zip` để chia sẻ cho nhóm / nộp đồ án.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tripla_db';
const EXPORT_DIR = path.join(__dirname, 'database_export');
const ZIP_OUTPUT = path.join(__dirname, 'tripla_database.zip');

async function exportDatabase() {
  console.log(`🚀 Đang kết nối tới MongoDB: ${MONGO_URI}...`);
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Kết nối thành công!`);

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`📦 Tìm thấy ${collections.length} collections trong database tripla_db.`);

  let totalDocs = 0;
  for (const col of collections) {
    const colName = col.name;
    const docs = await mongoose.connection.collection(colName).find({}).toArray();
    const filePath = path.join(EXPORT_DIR, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`   • Đã xuất ${colName.padEnd(20)}: ${docs.length.toString().padStart(4)} bản ghi -> ${colName}.json`);
    totalDocs += docs.length;
  }

  await mongoose.disconnect();
  console.log(`\n🎉 Đã xuất thành công ${totalDocs} bản ghi vào thư mục: ${EXPORT_DIR}`);

  // Đóng gói thành file zip
  try {
    console.log(`🗜️ Đang nén thư mục database_export thành ${ZIP_OUTPUT}...`);
    if (fs.existsSync(ZIP_OUTPUT)) {
      fs.unlinkSync(ZIP_OUTPUT);
    }
    // Sử dụng PowerShell Compress-Archive trên Windows
    const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${EXPORT_DIR}\\*' -DestinationPath '${ZIP_OUTPUT}' -Force"`;
    execSync(cmd, { stdio: 'inherit' });
    const stats = fs.statSync(ZIP_OUTPUT);
    console.log(`✅ Đã tạo thành công file nén: tripla_database.zip (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.warn(`⚠️ Lỗi khi tạo file zip: ${err.message}`);
  }
}

exportDatabase().catch((err) => {
  console.error('❌ Xuất database thất bại:', err);
  process.exit(1);
});

