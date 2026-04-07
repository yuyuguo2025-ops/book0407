const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = 'E:\\桌面\\StuentInfo.xls';
const outputPath = path.join(__dirname, '..', 'classlist.json');

if (!fs.existsSync(excelPath)) {
  console.error('文件不存在:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const students = data.map(row => {
  const keys = Object.keys(row);
  const studentId = String(row[keys[0]] || row['学号'] || row['id'] || '').trim();
  const studentName = String(row[keys[1]] || row['姓名'] || row['name'] || '').trim();
  
  return { studentId, studentName };
}).filter(s => s.studentId && s.studentName);

console.log('读取到', students.length, '个学生');
console.log('前5个:', students.slice(0, 5));

fs.writeFileSync(outputPath, JSON.stringify(students, null, 2));
console.log('已保存到', outputPath);
