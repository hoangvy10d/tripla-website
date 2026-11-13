/**
 * TRIPLA DATABASE IMPORT TOOL (`import_db.js`)
 * Tự động giải nén (nếu cần) và nạp 100% dữ liệu từ các file JSON vào MongoDB Compass (tripla_db).
 * Sử dụng: `npm run import-db`
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tripla_db';
const EXPORT_DIR = path.join(__dirname, 'database_export');
const ZIP_FILE = path.join(__dirname, 'tripla_database.zip');

async function importDatabase() {
  console.log(`🚀 Bắt đầu quá trình Import Database vào: ${MONGO_URI}`);

  // Nếu chưa có thư mục database_export mà có file zip thì giải nén ra
  if (!fs.existsSync(EXPORT_DIR) && fs.existsSync(ZIP_FILE)) {
    console.log(`📦 Đang tự động giải nén tripla_database.zip vào ${EXPORT_DIR}...`);
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${ZIP_FILE}' -DestinationPath '${EXPORT_DIR}' -Force"`, {
      stdio: 'inherit'
    });
  }

  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`❌ Không tìm thấy thư mục ${EXPORT_DIR} hoặc file ${ZIP_FILE}!`);
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`✅ Kết nối thành công tới MongoDB Compass!`);

  const files = fs.readdirSync(EXPORT_DIR).filter((f) => f.endsWith('.json'));
  console.log(`📁 Tìm thấy ${files.length} file dữ liệu JSON để import.`);

  let totalImported = 0;
  for (const file of files) {
    const colName = path.basename(file, '.json');
    const filePath = path.join(EXPORT_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const docs = JSON.parse(content);

      if (Array.isArray(docs) && docs.length > 0) {
        // Làm sạch collection trước khi import để tránh duplicate
        await mongoose.connection.collection(colName).deleteMany({});

        // Chuyển đổi chuỗi _id hex thành ObjectId của MongoDB nếu cần
        const formattedDocs = docs.map((doc) => {
          if (doc._id && typeof doc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(doc._id)) {
            doc._id = new mongoose.Types.ObjectId(doc._id);
          }
          return doc;
        });

        await mongoose.connection.collection(colName).insertMany(formattedDocs);
        console.log(`   • Đã nạp thành công [${colName.padEnd(18)}]: ${docs.length.toString().padStart(4)} bản ghi`);
        totalImported += docs.length;
      } else {
        console.log(`   • Bỏ qua [${colName}]: file trống hoặc không có bản ghi`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Lỗi khi nạp file ${file}: ${err.message}`);
    }
  }

  await mongoose.disconnect();
  console.log(`\n🎉 HOÀN TẤT IMPORT! Đã nạp ${totalImported} bản ghi vào database tripla_db.`);
  console.log(`👉 Bạn có thể mở MongoDB Compass để xem ngay database "tripla_db"!`);
}

importDatabase().catch((err) => {
  console.error('❌ Import thất bại:', err);
  process.exit(1);
});

