document.addEventListener('DOMContentLoaded', () => {
    const scanBtn = document.getElementById('scanBtn');
    const filePathInput = document.getElementById('filePath');
    const loading = document.getElementById('loading');
    const dashboard = document.getElementById('dashboard');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const tableBody = document.getElementById('tableBody');
    const restartBtn = document.getElementById('restartBtn');
    const clearCacheBtn = document.getElementById('clearCacheBtn');

    // Stats elements
    const statTotal = document.getElementById('statTotal');
    const statOk = document.getElementById('statOk');
    const statBroken = document.getElementById('statBroken');
    const statProtected = document.getElementById('statProtected');
    const statRedirect = document.getElementById('statRedirect');

    let allResults = [];

    if (restartBtn) {
        restartBtn.addEventListener('click', async () => {
            if (!confirm('האם אתה בטוח שברצונך להפעיל מחדש את השרת? פעולה זו תיקח מספר שניות לחזור.')) return;
            try {
                restartBtn.disabled = true;
                restartBtn.textContent = 'מפעיל מחדש...';
                await fetch('/api/restart', { method: 'POST' });
            } catch (e) {
                // Ignore disconnect errors as the server restarts
            }
            setTimeout(() => {
                window.location.reload();
            }, 2500); // Give server a bit of time to restart
        });
    }

    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            // Force reload by appending a querystring to the URL
            // This bypasses the HTML cache
            const url = new URL(window.location.href);
            url.searchParams.set('v', new Date().getTime());
            window.location.href = url.toString();
        });
    }

    scanBtn.addEventListener('click', async () => {
        const filePath = filePathInput.value.trim();
        if (!filePath) {
            alert('אנא הזן נתיב לקובץ הסימניות');
            return;
        }

        // Show loading state
        scanBtn.disabled = true;
        loading.classList.remove('hidden');
        dashboard.classList.add('hidden');

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file_path: filePath })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'שגיאה בסריקה');
            }

            const data = await response.json();
            allResults = data.results;

            updateDashboard();
            dashboard.classList.remove('hidden');

        } catch (error) {
            alert('שגיאה: ' + error.message);
        } finally {
            scanBtn.disabled = false;
            loading.classList.add('hidden');
        }
    });

    function getStatusCategory(result) {
        if (result.status >= 200 && result.status < 300) {
            return 'ok';
        } else if (result.status === 403 || result.status === 401 || result.status === 402) {
            return 'protected';
        } else if (result.status >= 400 || result.status === 0) {
            return 'broken';
        } else if (result.is_redirect) {
            return 'redirect';
        }
        return 'other'; // Should rarely hit here
    }

    function updateDashboard() {
        let okCount = 0;
        let protectedCount = 0;
        let brokenCount = 0;
        let redirectCount = 0;

        allResults.forEach(res => {
            const category = getStatusCategory(res);
            if (category === 'ok') okCount++;
            else if (category === 'protected') protectedCount++;
            else if (category === 'broken') brokenCount++;
            else if (category === 'redirect') redirectCount++;
        });

        // Animate count up (simple version)
        statTotal.textContent = allResults.length;
        statOk.textContent = okCount;
        statProtected.textContent = protectedCount;
        statBroken.textContent = brokenCount;
        statRedirect.textContent = redirectCount;

        renderTable();
    }

    function renderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const filterVal = statusFilter.value;

        tableBody.innerHTML = '';

        const filtered = allResults.filter(res => {
            const matchesSearch = res.name.toLowerCase().includes(searchTerm) ||
                res.url.toLowerCase().includes(searchTerm) ||
                res.folder.toLowerCase().includes(searchTerm);

            const category = getStatusCategory(res);
            const matchesFilter = filterVal === 'all' ||
                (filterVal === 'ok' && category === 'ok') ||
                (filterVal === 'protected' && category === 'protected') ||
                (filterVal === 'broken' && category === 'broken') ||
                (filterVal === 'redirect' && category === 'redirect');

            return matchesSearch && matchesFilter;
        });

        filtered.forEach(res => {
            const row = document.createElement('tr');

            let statusMarkup = '';
            let detailsMarkup = '';

            const category = getStatusCategory(res);

            if (category === 'ok') {
                statusMarkup = `<span class="badge status-ok">${res.status} OK</span>`;
                detailsMarkup = `<span style="color:#34d399; font-size:0.85rem;">✓ פעיל</span>`;
            } else if (category === 'protected') {
                statusMarkup = `<span class="badge status-protected">${res.status} Protected</span>`;
                detailsMarkup = `<div class="redirect-info">מוגן על ידי חומת אש / הגנת בוטים</div>`;
            } else if (category === 'broken') {
                const errText = res.status === 0 ? "שגיאה/ניתוק" : res.status;
                statusMarkup = `<span class="badge status-error">${errText}</span>`;
                detailsMarkup = res.error ? `<div class="redirect-info" style="color: #f87171">${res.error}</div>` : '';
            } else if (category === 'redirect') {
                statusMarkup = `<span class="badge status-redirect">${res.status} Redirect</span>`;
                detailsMarkup = `<div class="redirect-info">➡️ ${res.final_url}</div>`;
            } else {
                statusMarkup = `<span class="badge">${res.status}</span>`;
            }

            let actionsMarkup = `
                <div class="actions btn-group">
                    <a href="${res.url}" target="_blank" class="action-btn" title="פתח קישור">🔗</a>
            `;
            if (category === 'broken') {
                actionsMarkup += `
                    <button class="action-btn" onclick="searchWeb('${res.name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="חפש חלופות ברשת">🔍</button>
                    <button class="action-btn" onclick="editBookmark('${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="ערוך סימניה">✏️</button>
                `;
            } else if (category === 'protected') {
                actionsMarkup += `
                    <button class="action-btn" onclick="editBookmark('${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="ערוך סימניה">✏️</button>
                `;
            } else if (category === 'redirect') {
                actionsMarkup += `
                    <button class="action-btn" onclick="editBookmark('${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${res.final_url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="עדכן לכתובת החדשה">🔄</button>
                    <button class="action-btn" onclick="editBookmark('${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="ערוך סימניה">✏️</button>
                `;
            } else {
                actionsMarkup += `
                    <button class="action-btn" onclick="editBookmark('${res.url.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" title="ערוך סימניה">✏️</button>
                `;
            }
            actionsMarkup += `</div>`;

            row.innerHTML = `
                <td>${statusMarkup}</td>
                <td>${actionsMarkup}</td>
                <td>${res.name}</td>
                <td style="color: #94a3b8; font-size: 0.9rem;">${res.folder}</td>
                <td class="url-cell"><a href="${res.url}" target="_blank" title="${res.url}">${res.url}</a></td>
                <td>${detailsMarkup}</td>
            `;

            tableBody.appendChild(row);
        });
    }

    // Stat card clicks filter the table
    document.querySelectorAll('.stat-card[data-filter]').forEach(card => {
        card.addEventListener('click', () => {
            statusFilter.value = card.dataset.filter;
            renderTable();
        });
    });

    searchInput.addEventListener('input', renderTable);
    statusFilter.addEventListener('change', renderTable);

    window.triggerRescan = () => {
        scanBtn.click();
    };
});

// Global functions for inline onclick handlers
window.searchWeb = async (query, oldUrl) => {
    const modal = document.getElementById('searchModal');
    const queryText = document.getElementById('searchQueryText');
    const resultsContainer = document.getElementById('searchResults');

    modal.classList.remove('hidden');
    queryText.textContent = `מחפש תוצאות עבור: "${query}"...`;
    resultsContainer.innerHTML = '<div class="spinner"></div> מחפש...';

    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        resultsContainer.innerHTML = '';
        if (data.results.length === 0) {
            resultsContainer.innerHTML = '<p>לא נמצאו תוצאות.</p>';
            return;
        }

        data.results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <h4>${res.title}</h4>
                <div class="search-url">${res.href}</div>
                <p>${res.body}</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn primary use-btn" style="flex: 1; margin: 0;" onclick="replaceBookmarkDirectly('${oldUrl}', '${res.href}')">עדכן קישור בקובץ</button>
                    <button class="btn secondary use-btn" style="background: transparent; border: 1px solid var(--accent); color: var(--accent); margin: 0; padding: 0.5rem 1rem;" onclick="copyToClipboard('${res.href}')">העתק</button>
                </div>
            `;
            resultsContainer.appendChild(item);
        });
    } catch (error) {
        resultsContainer.innerHTML = `<p style="color: #ef4444;">שגיאה בחיפוש: ${error.message}</p>`;
    }
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert('הקישור הועתק בהצלחה! תוכל עכשיו לערוך את הסימניה ולהדביק אותו.');
    });
};

window.replaceBookmarkDirectly = async (oldUrl, newUrl) => {
    const filePath = document.getElementById('filePath').value.trim();
    if (!filePath) return;

    try {
        const response = await fetch('/api/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: filePath,
                old_url: oldUrl,
                new_url: newUrl
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'שגיאה בעדכון הסימניה');
        }

        document.getElementById('searchModal').classList.add('hidden');

        // Auto rescan after updating!
        if (window.triggerRescan) {
            window.triggerRescan();
        } else {
            alert('הסימניה עודכנה בהצלחה! לחץ על "סרוק סימניות" כדי לרענן את התצוגה.');
        }

    } catch (error) {
        alert('שגיאה: ' + error.message);
    }
};

window.editBookmark = async (oldUrl, suggestedUrl = '') => {
    const filePath = document.getElementById('filePath').value.trim();
    const newUrl = prompt(`עריכת סימניה:\nהזן את הכתובת החדשה במקום הכתובת הישנה.\n\nשים לב: זה יערוך ישירות את קובץ ה-HTML!`, suggestedUrl || oldUrl);

    if (!newUrl || newUrl === oldUrl) return;

    try {
        const response = await fetch('/api/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: filePath,
                old_url: oldUrl,
                new_url: newUrl
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'שגיאה בעריכת הסימניה');
        }

        if (window.triggerRescan) {
            window.triggerRescan();
        } else {
            alert('הסימניה עודכנה בהצלחה בקובץ! בסיום מומלץ לסרוק מחדש כדי לראות את הנתונים המעודכנים.');
        }
    } catch (error) {
        alert('שגיאה: ' + error.message);
    }
};

document.getElementById('closeSearchModal').addEventListener('click', () => {
    document.getElementById('searchModal').classList.add('hidden');
});
