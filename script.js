// ⚠️ Firebase 설정을 본인의 값으로 수정하세요
const firebaseConfig = {
  apiKey: "AIzaSyC0C58uuKhw-SgRoDLbMCmk4tI_Vk3lfHE",
  authDomain: "vn-pay-beae6.firebaseapp.com",
  projectId: "vn-pay-beae6",
  storageBucket: "vn-pay-beae6.firebasestorage.app",
  messagingSenderId: "297192541426",
  appId: "1:297192541426:web:484be688c3f460714f546b",
  measurementId: "G-24R7YSRHE4"

};

firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // Realtime Database 연결

let currentCurrency = 'VND';
const RATE = 0.061; 
let expensesData = [];

function setCurrency(cur) {
    currentCurrency = cur;
    document.getElementById('btn-vnd').className = (cur === 'VND' ? 'active' : '');
    document.getElementById('btn-krw').className = (cur === 'KRW' ? 'active' : '');
    document.getElementById('amount').placeholder = (cur === 'VND' ? '금액 (VND)' : '금액 (KRW)');
}

function saveData() {
    const desc = document.getElementById('desc').value;
    const amount = document.getElementById('amount').value;
    if (!desc || !amount) return alert("내역과 금액을 모두 입력해주세요!");

    // Realtime DB의 'expenses' 경로에 데이터 푸시
    db.ref('expenses').push({
        item: desc,
        price: Number(amount),
        currency: currentCurrency,
        timestamp: Date.now() // 현재 시간을 밀리초로 저장
    }).then(() => {
        document.getElementById('desc').value = "";
        document.getElementById('amount').value = "";
    });
}

function deleteItem(id) {
    if (confirm("삭제하시겠습니까?")) {
        db.ref('expenses/' + id).remove();
    }
}

function loadData() {
    // 실시간 데이터 감시
    db.ref('expenses').on('value', (snapshot) => {
        const list = document.getElementById('expense-list');
        const pdfBody = document.getElementById('pdf-table-body');
        list.innerHTML = "";
        pdfBody.innerHTML = "";
        expensesData = [];
        let totalSum = 0;

        const dataObj = snapshot.val();
        if (dataObj) {
            // 데이터를 배열로 변환 후 최신순 정렬
            const keys = Object.keys(dataObj).reverse();
            
            keys.forEach((key) => {
                const data = dataObj[key];
                const dateObj = new Date(data.timestamp);
                const timeStr = `${dateObj.getMonth()+1}/${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
                
                let krw = data.currency === 'VND' ? Math.floor(data.price * RATE) : data.price;
                totalSum += krw;

                expensesData.push({ timeStr, item: data.item, price: data.price, currency: data.currency, krw });

                list.innerHTML += `
                    <li>
                        <div class="item-info">
                            <div class="item-name">${data.item}</div>
                            <div class="item-date">${timeStr}</div>
                        </div>
                        <div class="item-price">
                            <div class="p-main">${data.price.toLocaleString()}${data.currency === 'VND' ? ' ₫' : '원'}</div>
                            ${data.currency === 'VND' ? `<div class="p-sub">(약 ${krw.toLocaleString()}원)</div>` : ''}
                            <button class="del-btn" onclick="deleteItem('${key}')">×</button>
                        </div>
                    </li>`;

                pdfBody.innerHTML += `<tr><td>${timeStr}</td><td>${data.item}</td><td>${data.price.toLocaleString()} ${data.currency}</td><td>${krw.toLocaleString()}원</td></tr>`;
            });
        }
        document.getElementById('total-sum').innerText = totalSum.toLocaleString();
        document.getElementById('pdf-total-krw').innerText = totalSum.toLocaleString() + "원";
    });
}

function formatKoreanAmount(amount) {
    if (amount < 10000) return amount.toLocaleString() + "원";
    const man = Math.floor(amount / 10000);
    const rest = amount % 10000;
    return man + "만" + (rest > 0 ? rest.toLocaleString() : "") + "원";
}

function exportToExcel() {
    if (expensesData.length === 0) return alert("데이터가 없습니다.");
    let excelRows = expensesData.map(e => ({
        "날짜": e.timeStr, "내역": e.item, "금액": e.price.toLocaleString() + (e.currency === 'VND' ? ' 동' : ' 원'), "원": e.krw
    }));
    const totalSum = expensesData.reduce((acc, cur) => acc + cur.krw, 0);
    excelRows.push({ "날짜": "합계", "내역": "", "금액": "", "원": formatKoreanAmount(totalSum) });

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "베트남_가계부_후니.xlsx");
}

function exportToPDF() {
    const element = document.getElementById('pdf-hidden-area');
    document.getElementById('pdf-date').innerText = "출력일시: " + new Date().toLocaleString();
    element.style.display = 'block';
    const opt = {
        margin: 10,
        filename: '베트남_여행_보고서_후니.pdf',
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => { element.style.display = 'none'; });
}

loadData();