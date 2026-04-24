// ═══════════════════════════════════════════════════════════
//  Tishky Zerin — script.js
//  Public finder + full admin management in one page.
//  Guest  → card grid, read-only detail modal.
//  Admin  → card grid  OR  admin list with full actions.
// ═══════════════════════════════════════════════════════════

// ── Theme ──────────────────────────────────────────────────
const themebtn = document.getElementById('themebtn');
function applyTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else               document.documentElement.removeAttribute('data-theme');
    if (themebtn) themebtn.innerHTML = t === 'light'
        ? '<i class="fas fa-moon"></i>'
        : '<i class="fas fa-sun"></i>';
}
applyTheme(localStorage.getItem('theme') || 'dark');
themebtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    applyTheme(next);
});

// ── State ──────────────────────────────────────────────────
let all      = [];   // all properties from DB
let mode     = 'all'; // rent / sell / all
let isAdmin  = false;
let viewMode = 'card'; // 'card' | 'list'

// ── Auth init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    isAdmin = !!session;
    setupUI();
    await loadAll();
});

function setupUI() {
    // header links
    document.getElementById('loginLink').style.display  = isAdmin ? 'none' : '';
    document.getElementById('adminLink').style.display  = isAdmin ? ''     : 'none';
    document.getElementById('logoutBtn').style.display  = isAdmin ? ''     : 'none';
    // stats + view bar
    document.getElementById('statsRow').style.display   = isAdmin ? ''     : 'none';
    document.getElementById('viewBar').style.display    = isAdmin ? ''     : 'none';
    // auth notice
    document.getElementById('authNotice').style.display = isAdmin ? 'none' : '';

    // logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
}

// ── Load ───────────────────────────────────────────────────
async function loadAll() {
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        document.getElementById('grid').innerHTML =
            '<div class="empty"><i class="fas fa-triangle-exclamation"></i> نەتوانرا خانوبەرەکان بارکرێن.</div>';
        return;
    }
    all = data || [];
    if (isAdmin) updateStats(all);
    applyFilter();
}

// ── Stats (admin) ───────────────────────────────────────────
function updateStats(props) {
    setText('sTotal',  props.length);
    setText('sAvail',  props.filter(p => p.status === 'available').length);
    setText('sRented', props.filter(p => p.status === 'rented').length);
    setText('sRent',   props.filter(p => (p.listing_type||'rent') === 'rent').length);
    setText('sSell',   props.filter(p => (p.listing_type||'rent') === 'sell').length);
}
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

// ── Mode toggle (Rent/Sell/All) ────────────────────────────
function setMode(m, btn) {
    mode = m;
    document.querySelectorAll('.tgl').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    applyFilter();
}

// ── View switch (card / list) ──────────────────────────────
function switchView(v) {
    viewMode = v;
    document.getElementById('btnCardView').classList.toggle('on', v === 'card');
    document.getElementById('btnListView').classList.toggle('on', v === 'list');
    document.getElementById('grid').style.display  = v === 'card' ? '' : 'none';
    document.getElementById('alist').style.display = v === 'list' ? '' : 'none';
    applyFilter();
}

// ── Filter ─────────────────────────────────────────────────
function applyFilter() {
    let res = [...all];
    if (mode === 'rent') res = res.filter(p => (p.listing_type||'rent') === 'rent');
    if (mode === 'sell') res = res.filter(p => (p.listing_type||'rent') === 'sell');

    const loc    = (document.getElementById('fLoc')?.value    || '').toLowerCase().trim();
    const type   =  document.getElementById('fType')?.value   || '';
    const status =  document.getElementById('fStatus')?.value || '';
    const mn     = parseFloat(document.getElementById('fMin')?.value);
    const mx     = parseFloat(document.getElementById('fMax')?.value);

    if (loc)        res = res.filter(p => p.location.toLowerCase().includes(loc));
    if (type)       res = res.filter(p => p.property_type === type);
    if (status)     res = res.filter(p => p.status === status);
    if (!isNaN(mn)) res = res.filter(p => p.price >= mn);
    if (!isNaN(mx)) res = res.filter(p => p.price <= mx);

    document.getElementById('cnt').textContent = res.length;

    if (isAdmin && viewMode === 'list') {
        renderList(res);
    } else {
        renderCards(res);
    }
}

// ══════════════════════════════════════════════════════════════
//  CARD VIEW (public + admin)
// ══════════════════════════════════════════════════════════════
function renderCards(list) {
    const grid = document.getElementById('grid');
    grid.style.display = '';
    document.getElementById('alist').style.display = 'none';

    if (!list.length) {
        grid.innerHTML = '<div class="empty"><i class="fas fa-magnifying-glass"></i> هیچ خانوبەرەیەک نەدۆزرایەوە.</div>';
        return;
    }

    grid.innerHTML = list.map(p => {
        const lt     = p.listing_type || 'rent';
        const rented = p.status === 'rented';
        const avail  = p.status === 'available';
        const cur    = (p.currency || 'IQD').toUpperCase();

        const ltBadge   = lt === 'rent'
            ? '<span class="badge b-rent"><i class="fas fa-key"></i> بە کرێ</span>'
            : '<span class="badge b-sell"><i class="fas fa-tag"></i> بۆ فرۆشتن</span>';
        const stBadge   = avail
            ? '<span class="badge b-avail"><i class="fas fa-circle-dot"></i> بەردەست</span>'
            : rented
            ? '<span class="badge b-rented"><i class="fas fa-lock"></i> کرێدراو</span>'
            : '<span class="badge b-sold"><i class="fas fa-ban"></i> فرۆشراو</span>';
        const typeBadge = `<span class="badge ${typeClass(p.property_type)}"><i class="fas ${typeIcon(p.property_type)}"></i> ${typeKu(p.property_type)}</span>`;
        const ribbon    = rented ? '<div class="rented-ribbon">کرێدراو</div>' : '';
        const desc      = p.description ? `<div class="pdesc">${esc(p.description)}</div>` : '';
        const dirLine   = p.facing_direction ? `<span><i class="fas fa-compass"></i> ${dirKu(p.facing_direction)}</span>` : '';

        return `
        <div class="pcard${rented ? ' rented-card' : ''}" onclick='openCardModal(${JSON.stringify(p).replace(/'/g,"&#39;")})'>
            ${ribbon}
            <div class="pcard-top">
                <div class="pbadges">${typeBadge}${ltBadge}${stBadge}</div>
                <div class="ploc"><i class="fas fa-location-dot"></i>${esc(p.location)}</div>
                <div class="pmeta">
                    ${p.size ? `<span><i class="fas fa-expand"></i> ${esc(p.size)}</span>` : ''}
                    <span><i class="fas fa-phone"></i> ${fmtPhone(p.phone)}</span>
                    ${dirLine}
                </div>
                ${desc}
            </div>
            <div class="pcard-bot">
                <div class="pprice">
                    <div class="plbl">${lt === 'rent' ? 'کرێی مانگانە' : 'نرخی فرۆشتن'}</div>
                    <div class="pamt">${fmtPrice(p)}${lt === 'rent' ? '<span class="pcur">/مانگ</span>' : ''}</div>
                </div>
                <button class="btn-info"><i class="fas fa-circle-info"></i> وردەکاری</button>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════════
//  LIST VIEW — admin management (same as admin dashboard)
// ══════════════════════════════════════════════════════════════
function renderList(list) {
    const el = document.getElementById('alist');
    document.getElementById('grid').style.display = 'none';
    el.style.display = '';

    if (!list.length) {
        el.innerHTML = '<div class="empty"><i class="fas fa-plus-circle"></i> هیچ خانوبەرەیەک نەدۆزرایەوە.</div>';
        return;
    }
    el.innerHTML = list.map(p => buildRow(p)).join('');
}

function buildRow(p) {
    const lt     = p.listing_type || 'rent';
    const rented = p.status === 'rented';
    const avail  = p.status === 'available';

    const ltBadge = lt === 'rent'
        ? `<span class="badge b-rent" style="font-size:.65rem;"><i class="fas fa-key"></i> کرێ</span>`
        : `<span class="badge b-sell" style="font-size:.65rem;"><i class="fas fa-tag"></i> فرۆشتن</span>`;
    const stBadge = avail
        ? `<span class="badge b-avail" style="font-size:.65rem;">✅ بەردەست</span>`
        : rented
        ? `<span class="badge b-rented" style="font-size:.65rem;">🔑 کرێدراو</span>`
        : `<span class="badge b-sold" style="font-size:.65rem;">⛔ فرۆشراو</span>`;
    const typeBadge = `<span class="badge ${typeClass(p.property_type)}" style="font-size:.65rem;"><i class="fas ${typeIcon(p.property_type)}"></i> ${typeKu(p.property_type)}</span>`;
    const curBadge  = (p.currency||'IQD') === 'USD'
        ? `<span class="badge b-sell" style="font-size:.6rem;">$USD</span>`
        : `<span class="badge b-type" style="font-size:.6rem;">IQD</span>`;

    const renterLine = rented && p.renter_name
        ? `<div class="arow-renter"><i class="fas fa-user-clock"></i> کرێچی: ${esc(p.renter_name)} — ${fmtPhone(p.renter_phone)}</div>`
        : '';
    const dirLine = p.facing_direction
        ? `<span><i class="fas fa-compass"></i> ${dirKu(p.facing_direction)}</span>` : '';

    const renterBtn = rented
        ? `<button class="ab ab-rn" onclick="viewRenter(${p.id})"><i class="fas fa-id-card"></i> کرێچی</button>`
        : `<button class="ab ab-rn" onclick="openRenterModal(${p.id})"><i class="fas fa-user-plus"></i> زیادکردنی کرێچی</button>`;

    return `
    <div class="arow" data-id="${p.id}">
        <div class="arow-info">
            <div class="arow-loc">
                ${typeBadge} ${ltBadge} ${stBadge} ${curBadge}
                ${esc(p.location)}
                <i class="fas fa-location-dot"></i>
            </div>
            <div class="arow-meta">
                ${p.owner_name ? `<span><i class="fas fa-user-tie"></i> ${esc(p.owner_name)}</span>` : ''}
                <span><i class="fas fa-phone"></i> ${fmtPhone(p.phone)}</span>
                ${p.size ? `<span><i class="fas fa-expand"></i> ${esc(p.size)}</span>` : ''}
                <span><i class="fas fa-coins"></i> ${fmtPrice(p)}${lt==='rent'?'/مانگ':''}</span>
                ${dirLine}
            </div>
            ${renterLine}
        </div>
        <div class="aacts">
            <button class="ab ab-dl" onclick="delProp(${p.id})" title="سڕینەوە"><i class="fas fa-trash"></i></button>
            <button class="ab ab-sl" onclick="setStatus(${p.id},'sold')"><i class="fas fa-ban"></i> فرۆشراو</button>
            ${renterBtn}
            <button class="ab ab-av" onclick="setStatus(${p.id},'available')"><i class="fas fa-check-circle"></i> بەردەست</button>
        </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
//  CARD DETAIL MODAL
// ══════════════════════════════════════════════════════════════
function openCardModal(p) {
    const lt       = p.listing_type || 'rent';
    const rented   = p.status === 'rented';
    const statusKu = p.status === 'available' ? 'بەردەست' : p.status === 'rented' ? 'کرێدراو' : 'فرۆشراو';

    document.getElementById('mtitle').textContent = p.location;

    const renterSection = rented ? `
        <div class="rblock">
            <div class="rblock-title" style="flex-direction:row-reverse;"><i class="fas fa-user-clock"></i> کرێچیی ئێستا</div>
            ${irow('fas fa-user',     'ناوی کرێچی',   p.renter_name  || '—')}
            ${irow('fas fa-phone',    'ژمارەی کرێچی', fmtPhone(p.renter_phone))}
            ${p.rented_since ? irow('fas fa-calendar', 'کرێ لە', fmtDate(p.rented_since)) : ''}
        </div>` : '';

    // admin gets action buttons inside the card modal too
    const adminActions = isAdmin ? `
        <div class="modal-acts">
            <button class="ab ab-av" onclick="setStatus(${p.id},'available');closeModal();">
                <i class="fas fa-check-circle"></i> بەردەست
            </button>
            ${rented
                ? `<button class="ab ab-rn" onclick="closeModal();viewRenter(${p.id});">
                       <i class="fas fa-id-card"></i> کرێچی
                   </button>`
                : `<button class="ab ab-rn" onclick="closeModal();openRenterModal(${p.id});">
                       <i class="fas fa-user-plus"></i> زیادکردنی کرێچی
                   </button>`
            }
            <button class="ab ab-sl" onclick="setStatus(${p.id},'sold');closeModal();">
                <i class="fas fa-ban"></i> فرۆشراو
            </button>
            <button class="ab ab-dl" onclick="closeModal();delProp(${p.id});" title="سڕینەوە">
                <i class="fas fa-trash"></i>
            </button>
        </div>` : '';

    document.getElementById('mbody').innerHTML = `
        ${irow('fas fa-location-dot', 'شوێن',        p.location)}
        ${irow(`fas ${typeIcon(p.property_type)}`, 'جۆر', typeKu(p.property_type))}
        ${p.size ? irow('fas fa-expand', 'قەبارە', p.size) : ''}
        ${irow('fas fa-tag',         'جۆری لیستە',   lt === 'rent' ? 'بە کرێ' : 'بۆ فرۆشتن')}
        ${irow('fas fa-circle-dot',  'دۆخ',           statusKu)}
        ${irow('fas fa-coins', lt === 'rent' ? 'کرێی مانگانە' : 'نرخی فرۆشتن',
               fmtPrice(p) + (lt==='rent'?' /مانگ':''), true)}
        ${p.facing_direction ? irow('fas fa-compass', 'ئاراستە', dirKu(p.facing_direction)) : ''}
        ${p.owner_name ? irow('fas fa-user-tie', 'خاوەن', p.owner_name) : ''}
        ${irow('fas fa-phone', 'ژمارەی پەیوەندی', fmtPhone(p.phone))}
        ${p.description ? irow('fas fa-align-left', 'تێبینی', p.description) : ''}
        ${renterSection}
        ${adminActions}
    `;

    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.body.style.overflow = '';
}
document.getElementById('modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
});

// ══════════════════════════════════════════════════════════════
//  ADMIN ACTIONS (status, delete, renter)
// ══════════════════════════════════════════════════════════════
async function setStatus(id, status) {
    if (!isAdmin) return;
    const upd = { status };
    if (status === 'available') {
        upd.renter_name  = null;
        upd.renter_phone = null;
        upd.rented_since = null;
    }
    const { error } = await supabase.from('properties').update(upd).eq('id', id);
    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    const ku = status === 'available' ? 'بەردەست' : status === 'rented' ? 'کرێدراو' : 'فرۆشراو';
    notify(`نیشاندرا وەک: ${ku}`, 'ok');
    await loadAll();
}

async function delProp(id) {
    if (!isAdmin) return;
    if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم خانوبەرەیە بۆ هەمیشە؟')) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    notify('سڕایەوە.', 'ok');
    await loadAll();
}

// ── Renter modal ───────────────────────────────────────────
function openRenterModal(id) {
    document.getElementById('rPropId').value = id;
    document.getElementById('rName').value   = '';
    document.getElementById('rPhone').value  = '';
    document.getElementById('rSince').value  = today();
    document.getElementById('renterModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeRenterModal() {
    document.getElementById('renterModal').classList.remove('open');
    document.body.style.overflow = '';
}
async function saveRenter() {
    const id    = document.getElementById('rPropId').value;
    const name  = document.getElementById('rName').value.trim();
    const phone = document.getElementById('rPhone').value.trim();
    const since = document.getElementById('rSince').value;
    if (!name || !phone) { notify('ناو و ژمارە پێویستن', 'err'); return; }

    const { error } = await supabase.from('properties').update({
        status: 'rented', renter_name: name, renter_phone: phone,
        rented_since: since || null,
    }).eq('id', id);

    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    notify('کرێچی تۆمارکرا و خانوبەرەکە کرێدراو نیشاندرا!', 'ok');
    closeRenterModal();
    await loadAll();
}

// ── View renter detail ─────────────────────────────────────
function viewRenter(id) {
    const p = all.find(x => x.id === id);
    if (!p) return;
    document.getElementById('viewBody').innerHTML = `
        ${irow('fas fa-location-dot', 'شوێن',        p.location)}
        ${p.owner_name ? irow('fas fa-user-tie', 'خاوەن', p.owner_name) : ''}
        ${irow('fas fa-phone', 'ژمارەی خاوەن',        fmtPhone(p.phone))}
        <div class="rblock">
            <div class="rblock-title" style="flex-direction:row-reverse;"><i class="fas fa-user-clock"></i> کرێچی</div>
            ${irow('fas fa-user',     'ناو',   p.renter_name  || '—')}
            ${irow('fas fa-phone',    'ژمارە', fmtPhone(p.renter_phone))}
            ${irow('fas fa-calendar', 'کرێ لە', p.rented_since ? fmtDate(p.rented_since) : '—')}
        </div>
        <div class="modal-acts">
            <button class="ab ab-rn" onclick="closeViewModal();openRenterModal(${p.id});">
                <i class="fas fa-pen"></i> دەستکاری کرێچی
            </button>
            <button class="ab ab-av" onclick="setStatus(${p.id},'available');closeViewModal();">
                <i class="fas fa-check-circle"></i> بەردەست نیشاندان
            </button>
        </div>`;
    document.getElementById('viewModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeViewModal() {
    document.getElementById('viewModal').classList.remove('open');
    document.body.style.overflow = '';
}

// close modals on backdrop click / Escape
['modal','renterModal','viewModal'].forEach(mid => {
    document.getElementById(mid)?.addEventListener('click', e => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeRenterModal(); closeViewModal(); }
});

// ══════════════════════════════════════════════════════════════
//  NOTIFY
// ══════════════════════════════════════════════════════════════
function notify(msg, type = 'ok') {
    const n = document.createElement('div');
    n.className = `notif ${type === 'ok' ? 'nok' : 'nerr'}`;
    n.innerHTML = `<i class="fas ${type==='ok' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i> ${msg}`;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.transition  = 'all .25s';
        n.style.opacity     = '0';
        n.style.transform   = 'translateX(-110%)';
        setTimeout(() => n.remove(), 260);
    }, 3200);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════
function irow(icon, label, val, mono = false) {
    return `<div class="irow">
        <div class="iicon"><i class="${icon}"></i></div>
        <div>
            <div class="ilbl">${label}</div>
            <div class="ival${mono ? ' mono' : ''}">${esc(String(val ?? '—'))}</div>
        </div>
    </div>`;
}
function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function fmtPhone(raw) {
    if (!raw) return '—';
    let s = String(raw).replace(/\s+/g, '');
    if (s.startsWith('+'))     return s;
    if (s.startsWith('00964')) return '+964 ' + s.slice(5);
    if (s.startsWith('0'))     return '+964 ' + s.slice(1);
    return s;
}
function fmtPrice(p) {
    const cur = (p.currency || 'IQD').toUpperCase();
    return cur === 'USD'
        ? '$' + Number(p.price).toLocaleString('en-US')
        : Number(p.price).toLocaleString('en-IQ') + ' IQD';
}
function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function today() { return new Date().toISOString().split('T')[0]; }

function typeKu(t) {
    return t === 'apartment' ? 'شووقە' : t === 'house' ? 'خانوو' : t === 'land' ? 'زەوی' : t || '—';
}
function typeIcon(t) {
    return t === 'apartment' ? 'fa-building' : t === 'house' ? 'fa-home' : 'fa-mountain-sun';
}
function typeClass(t) {
    return t === 'land' ? 'b-earth' : 'b-type';
}
function dirKu(d) {
    const map = { sunrise:'🌅 ئاوابوون', sunset:'🌇 ئاژاوابوون',
                  north:'🧭 باکوور', south:'🧭 باشوور',
                  east:'🧭 ڕۆژهەڵات', west:'🧭 ڕۆژئاوا' };
    return map[d] || d || '—';
}