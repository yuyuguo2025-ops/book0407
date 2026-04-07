// =================== 公共方法 ===================
async function fetchJSON(url, options={}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "请求失败");
    return data;
}

// =================== 学生端 ===================
function initSeatGrid() {
    const seatGrid = document.getElementById("seatGrid");
    if (!seatGrid) return;

    seatGrid.innerHTML = "";

    const rows = 6;
    const cols = 8;

    for (let r=1;r<=rows;r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "seat-row";
        for (let c=1;c<=cols;c++) {
            const seatBtn = document.createElement("button");
            seatBtn.className = "seat-btn";
            seatBtn.textContent = `${r}-${c}`;
            seatBtn.dataset.row = r;
            seatBtn.dataset.col = c;
            seatBtn.addEventListener("click",()=>studentSign(seatBtn));
            rowDiv.appendChild(seatBtn);
        }
        seatGrid.appendChild(rowDiv);
    }
}

// 学生点击座位签到
async function studentSign(seatBtn) {
    const studentId = prompt("请输入学号:");
    if (!studentId) return alert("学号不能为空");

    const row = parseInt(seatBtn.dataset.row);
    const col = parseInt(seatBtn.dataset.col);

    try {
        const result = await fetchJSON("/api/submit",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
                studentId,
                seat: {row,col},
                selectedBookIds: []
            })
        });

        seatBtn.style.backgroundColor = "#34d399";
        seatBtn.textContent = result.studentName;
        const msgBox = document.getElementById("studentMessage");
        if(msgBox){ msgBox.textContent="签到成功！"; msgBox.className="message success"; }
    } catch(err){
        alert("签到失败："+err.message);
    }
}

// =================== 教师端 ===================
async function loadTeacherDashboard() {
    const seatGrid = document.getElementById("seatGridTeacher");
    if(!seatGrid) return;

    try {
        const data = await fetchJSON("/api/stats");
        const submissions = data.submissions || [];
        const seatMap = data.seatMap || [];
        const rows = 6;
        const cols = 8;

        seatGrid.innerHTML = "";

        for (let r=1;r<=rows;r++){
            const rowDiv = document.createElement("div");
            rowDiv.className = "seat-row";
            for (let c=1;c<=cols;c++){
                const seatBtn = document.createElement("button");
                seatBtn.className = "seat-btn";
                seatBtn.dataset.row = r;
                seatBtn.dataset.col = c;

                // 查找是否有人签到该座位
                const seatData = seatMap.find(s=>s.row===r && s.col===c);
                if(seatData && seatData.signed){
                    seatBtn.style.backgroundColor = "#34d399";
                    seatBtn.textContent = seatData.studentName;
                    seatBtn.addEventListener("click",()=>showStudentProfile(seatData));
                } else {
                    seatBtn.textContent = `${r}-${c}`;
                    seatBtn.style.backgroundColor = "#f3f4f6";
                }

                rowDiv.appendChild(seatBtn);
            }
            seatGrid.appendChild(rowDiv);
        }

        // 更新总签到人数
        const totalCount = document.getElementById("totalCount");
        if(totalCount) totalCount.textContent = data.total || 0;

    } catch(err){
        console.error("教师端数据加载失败",err);
    }
}

// 显示学生个人画像
function showStudentProfile(student){
    const profileBox = document.getElementById("studentProfile");
    if(!profileBox) return;

    const books = (student.selectedBookIds || []).join("、") || "无";
    const tags = (student.selectedTags || []).join("、") || "无";

    profileBox.innerHTML = `
        <h3>${student.studentName}</h3>
        <p>学号/座号: ${student.studentId||"未填写"}</p>
        <p>已选书籍: ${books}</p>
        <p>兴趣标签: ${tags}</p>
        <p>签到时间: ${student.signTime? new Date(student.signTime).toLocaleString() : "未签到"}</p>
    `;
}

// 教师端清空数据
async function resetTeacherData(){
    if(!confirm("确定要清空所有签到数据吗？")) return;
    try{
        await fetchJSON("/api/reset",{method:"POST"});
        await loadTeacherDashboard();
        alert("数据已清空");
    }catch(err){
        alert("清空失败："+err.message);
    }
}

// =================== 初始化 ===================
document.addEventListener("DOMContentLoaded",()=>{
    if(document.getElementById("seatGrid")) initSeatGrid();
    if(document.getElementById("seatGridTeacher")) loadTeacherDashboard();
});