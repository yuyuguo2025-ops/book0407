const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = 3001;

app.use(express.json());
app.use(express.static("public"));

// 设置响应编码为UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  next();
});

// ===== 文件 =====
const SUBMISSION_FILE = path.join(__dirname, "submissions.json");
const CLASSLIST_FILE = path.join(__dirname, "classlist.json");
const TASK_FILE = path.join(__dirname, "task-status.json");
const DESIGN_FILE = path.join(__dirname, "designs.json");

function getClassList() {
  return readJSON(CLASSLIST_FILE, []);
}

// ===== 工具 =====
function readJSON(file, def) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(def, null, 2));
      return def;
    }
    return JSON.parse(fs.readFileSync(file));
  } catch {
    return def;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===== 数据 =====
function getSubmissions() {
  return readJSON(SUBMISSION_FILE, []);
}
function saveSubmissions(data) {
  writeJSON(SUBMISSION_FILE, data);
}

function getTaskStatus() {
  const status = readJSON(TASK_FILE, {
    task1: true,
    task2: false,
    task3: false,
    designPlaza: false
  });
  // 确保兼容性，如果配置文件中没有此字段，自动添加默认值
  if (status.designPlaza === undefined) {
    status.designPlaza = false;
  }
  return status;
}
function saveTaskStatus(data) {
  writeJSON(TASK_FILE, data);
}

// ===== 设计方案广场 =====
function getDesigns() {
  return readJSON(DESIGN_FILE, []);
}
function saveDesigns(data) {
  writeJSON(DESIGN_FILE, data);
}

// ===== 页面 =====
app.get("/student", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/teacher", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "teacher.html"));
});

// ===== 任务状态 =====
app.get("/api/task-status", (req, res) => {
  res.json({ success: true, status: getTaskStatus() });
});

app.post("/api/task-status", (req, res) => {
  const current = getTaskStatus();

  const newStatus = {
    task1: req.body.task1 ?? current.task1,
    task2: req.body.task2 ?? current.task2,
    task3: req.body.task3 ?? current.task3,
    designPlaza: req.body.designPlaza ?? current.designPlaza
  };

  saveTaskStatus(newStatus);
  io.emit('taskStatus', newStatus);

  res.json({ success: true, status: newStatus });
});

// ===== 提交 =====
app.post("/api/submit", (req, res) => {
  const { studentId, seat, interests = [], selectedBookIds = [], inquiryAnswers = {}, cfInquiryAnswers = {} } = req.body;

  if (!studentId || !seat) {
    return res.status(400).json({ message: "信息不完整" });
  }

  const classList = getClassList();
  const matched = classList.find(s => s.studentId === studentId);
  const studentName = matched ? matched.studentName : `${studentId}(访客)`;

  let list = getSubmissions();

  const record = {
    studentId,
    studentName,
    seat,
    interests,
    selectedBookIds,
    inquiryAnswers,
    cfInquiryAnswers,
    isVisitor: !matched,
    time: new Date().toLocaleString()
  };

  const i = list.findIndex(s => s.studentId === studentId);
  if (i >= 0) list[i] = record;
  else list.push(record);

  saveSubmissions(list);

  io.emit('submissions', list);

  res.json({ success: true, studentName, record });
});

app.post("/api/submit/inquiry", (req, res) => {
  const { studentId, inquiryAnswers = {} } = req.body;

  if (!studentId) {
    return res.status(400).json({ message: "信息不完整" });
  }

  let list = getSubmissions();
  const i = list.findIndex(s => s.studentId === studentId);
  
  if (i >= 0) {
    list[i].inquiryAnswers = inquiryAnswers;
    list[i].inquirySubmittedTime = new Date().toLocaleString();
  } else {
    return res.status(400).json({ message: "未找到提交记录，请先签到" });
  }

  saveSubmissions(list);

  io.emit('submissions', list);

  res.json({ success: true });
});

app.post("/api/submit/cf-inquiry", (req, res) => {
  const { studentId, cfInquiryAnswers = {} } = req.body;

  if (!studentId) {
    return res.status(400).json({ message: "信息不完整" });
  }

  let list = getSubmissions();
  const i = list.findIndex(s => s.studentId === studentId);
  
  if (i >= 0) {
    list[i].cfInquiryAnswers = cfInquiryAnswers;
    list[i].cfInquirySubmittedTime = new Date().toLocaleString();
  } else {
    return res.status(400).json({ message: "未找到提交记录，请先签到" });
  }

  saveSubmissions(list);

  io.emit('submissions', list);

  res.json({ success: true });
});

// ===== 获取 =====
app.get("/api/submissions", (req, res) => {
  res.json({ success: true, submissions: getSubmissions() });
});

app.get("/api/stats", (req, res) => {
  const subs = getSubmissions();
  res.json({
    success: true,
    total: subs.length,
    submissions: subs
  });
});

// ===== 清除所有签到（下一个班级）=====
app.post("/api/clear-checkins", (req, res) => {
  saveSubmissions([]);
  saveDesigns([]);
  io.emit('submissions', []);
  io.emit('designs', []);
  res.json({ success: true, message: "已清除所有签到和提交记录" });
});

// ===== 方案广场API =====
app.get("/api/designs", (req, res) => {
  res.json({ success: true, designs: getDesigns() });
});

app.post("/api/designs/publish", (req, res) => {
  const { studentId, studentName, scene, algorithms, data, logic } = req.body;
  
  const designs = getDesigns();
  const existingIndex = designs.findIndex(d => d.studentId === studentId);
  
  const newDesign = {
    id: Date.now().toString(),
    studentId,
    studentName,
    scene,
    algorithms,
    data,
    logic,
    likes: 0,
    likedBy: [],
    time: new Date().toLocaleString()
  };
  
  if (existingIndex >= 0) {
    newDesign.likes = designs[existingIndex].likes;
    newDesign.likedBy = designs[existingIndex].likedBy;
    designs[existingIndex] = newDesign;
  } else {
    designs.push(newDesign);
  }
  
  saveDesigns(designs);
  io.emit('designs', designs);
  
  res.json({ success: true, designs });
});

app.post("/api/designs/like", (req, res) => {
  const { designId, studentId } = req.body;
  const designs = getDesigns();
  
  const design = designs.find(d => d.id === designId);
  if (!design) {
    return res.status(404).json({ success: false, message: "方案不存在" });
  }
  
  if (!design.likedBy) design.likedBy = [];
  
  const likeIndex = design.likedBy.indexOf(studentId);
  if (likeIndex >= 0) {
    design.likedBy.splice(likeIndex, 1);
    design.likes = Math.max(0, design.likes - 1);
  } else {
    design.likedBy.push(studentId);
    design.likes = design.likes + 1;
  }
  
  saveDesigns(designs);
  io.emit('designs', designs);
  
  res.json({ success: true, designs });
});

app.post("/api/designs/delete", (req, res) => {
  const { designId } = req.body;
  let designs = getDesigns();
  
  designs = designs.filter(d => d.id !== designId);
  
  saveDesigns(designs);
  io.emit('designs', designs);
  
  res.json({ success: true, designs });
});

// ===== Socket.io =====
io.on('connection', (socket) => {
  console.log('新客户端连接');
  
  // 发送初始任务状态
  socket.emit('taskStatus', getTaskStatus());
  socket.emit('submissions', getSubmissions());
  socket.emit('designs', getDesigns());
  
  socket.on('disconnect', () => {
    console.log('客户端断开连接');
  });
});

// ===== 启动 =====
server.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
});