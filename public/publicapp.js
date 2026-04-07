async function submitData() {
  const name = document.getElementById("name").value;
  const checked = document.querySelectorAll("input[type=checkbox]:checked");

  const selected = Array.from(checked).map(c => c.value);

  await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentName: name,
      selectedBookIds: selected
    })
  });

  alert("提交成功！");
}

async function loadData() {
  const res = await fetch("/api/stats");
  const data = await res.json();

  document.getElementById("output").textContent =
    JSON.stringify(data, null, 2);
}

async function resetData() {
  await fetch("/api/reset", { method: "POST" });
  alert("已清空");
}