// =============================================================================
// 시스템명: 야드 현장 업무용 패드 웹 시스템 (Yard Pad MES)
// 파일명: docViewer.js
// 설명: 도면 및 검사 사양서/밀시트 모달 뷰어
// =============================================================================

const DocumentViewer = {
  open(docUrl, itemInfo = {}) {
    const modal = document.getElementById('docModal');
    const titleEl = document.getElementById('docModalTitle');
    const contentEl = document.getElementById('docModalContent');

    if (!modal) return;

    if (titleEl) {
      titleEl.textContent = `[품질 규격서/도면] ${itemInfo.ITEM_NAME || '자재 사양서'} (${itemInfo.ITEM_CODE || ''})`;
    }

    if (contentEl) {
      // 도면/사양서 모의 렌더링 뷰
      contentEl.innerHTML = `
        <div style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:18px; color:#f8fafc;">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid #334155; padding-bottom:10px; margin-bottom:14px;">
            <div>
              <h4 style="font-size:1.1rem; color:#60a5fa;">자재 품질 및 치수 검사 규격서</h4>
              <p style="font-size:0.85rem; color:#94a3b8;">도면번호: DWG-${itemInfo.ITEM_CODE || '2026-STD'} | 개정: REV.03</p>
            </div>
            <div style="text-align:right;">
              <span style="background:#10b98122; color:#34d399; padding:4px 8px; border-radius:4px; font-size:0.8rem; font-weight:600;">승인완료</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.9rem; margin-bottom:16px;">
            <div><strong>품번:</strong> ${itemInfo.ITEM_CODE || '-'}</div>
            <div><strong>품명:</strong> ${itemInfo.ITEM_NAME || '-'}</div>
            <div><strong>공급사:</strong> ${itemInfo.SUPPLIER_NAME || '-'}</div>
            <div><strong>규격 사양:</strong> ${itemInfo.SPEC || '표준 규격 준수'}</div>
          </div>

          <!-- 도면 가상 렌더링 SVG -->
          <div style="background:#1e293b; border:1px dashed #475569; border-radius:6px; padding:20px; text-align:center;">
            <svg width="100%" height="160" viewBox="0 0 500 160" style="max-width:500px; display:inline-block;">
              <rect x="50" y="30" width="400" height="90" fill="#0f172a" stroke="#60a5fa" stroke-width="2" stroke-dasharray="4" />
              <line x1="50" y1="20" x2="450" y2="20" stroke="#f59e0b" stroke-width="2" marker-start="url(#dot)" marker-end="url(#dot)" />
              <text x="250" y="15" fill="#fbbf24" font-size="12" text-anchor="middle">전장: L = 6096mm (공차 ±2.0)</text>
              <line x1="35" y1="30" x2="35" y2="120" stroke="#f59e0b" stroke-width="2" />
              <text x="25" y="80" fill="#fbbf24" font-size="12" text-anchor="middle" transform="rotate(-90 25,80)">두께: 12T (±0.3)</text>
              <text x="250" y="80" fill="#94a3b8" font-size="14" text-anchor="middle">${itemInfo.ITEM_NAME || '자재 도면 상세'}</text>
            </svg>
            <div style="margin-top:10px; font-size:0.8rem; color:#94a3b8;">
              * 검사 포인트: 표면 스크래치, 치수 공차(폭/두께), 굽힘 및 용접부 결함 여부 확인
            </div>
          </div>
        </div>
      `;
    }

    modal.classList.add('open');
  },

  close() {
    const modal = document.getElementById('docModal');
    if (modal) {
      modal.classList.remove('open');
    }
  }
};
