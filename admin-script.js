// ── Theme ──
const themebtn = document.getElementById('themebtn');
function applyTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    if (themebtn) themebtn.innerHTML = t === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
}
applyTheme(localStorage.getItem('theme') || 'dark');
themebtn?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    applyTheme(next);
});

// ── State ──
let allProps = [];
let adminMode = 'all';

// ── Load ──
document.addEventListener('DOMContentLoaded', () => {
    loadProps();
    document.getElementById('addForm').addEventListener('submit', addProperty);
});

async function loadProps() {
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) { notify('هەڵە لە بارکردنی خانوبەرەکان', 'err'); return; }
    allProps = data || [];
    updateStats(allProps);
    adminRender();
}

// ── Stats ──
function updateStats(props) {
    setText('sTotal',  props.length);
    setText('sAvail',  props.filter(p => p.status === 'available').length);
    setText('sRented', props.filter(p => p.status === 'rented').length);
    setText('sRent',   props.filter(p => (p.listing_type||'rent') === 'rent').length);
    setText('sSell',   props.filter(p => (p.listing_type||'rent') === 'sell').length);
}
function setText(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }

// ── Admin filter toggle ──
function adminFilter(m, btn) {
    adminMode = m;
    document.querySelectorAll('.card .tgl').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    adminRender();
}

// ── Render admin list ──
function adminRender() {
    const search = (document.getElementById('adminSearch')?.value || '').toLowerCase().trim();

    let list = [...allProps];
    if (adminMode === 'rent')   list = list.filter(p => (p.listing_type||'rent') === 'rent');
    if (adminMode === 'sell')   list = list.filter(p => (p.listing_type||'rent') === 'sell');
    if (adminMode === 'rented') list = list.filter(p => p.status === 'rented');
    if (search) list = list.filter(p => p.location.toLowerCase().includes(search));

    const el = document.getElementById('alist');
    const cnt = document.getElementById('mCnt');
    if (cnt) cnt.textContent = list.length;

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
        ? '<span class="badge b-rent" style="font-size:0.65rem;"><i class="fas fa-key"></i> کرێ</span>'
        : '<span class="badge b-sell" style="font-size:0.65rem;"><i class="fas fa-tag"></i> فرۆشتن</span>';

    const stBadge = avail
        ? '<span class="badge b-avail" style="font-size:0.65rem;">✅ بەردەست</span>'
        : rented
        ? '<span class="badge b-rented" style="font-size:0.65rem;">🔑 کرێدراو</span>'
        : '<span class="badge b-sold" style="font-size:0.65rem;">⛔ فرۆشراو</span>';

    const renterLine = rented && p.renter_name
        ? `<div class="arow-renter" style="flex-direction:row-reverse;"><i class="fas fa-user-clock"></i> کرێچی: ${esc(p.renter_name)} — ${esc(p.renter_phone||'')}</div>`
        : '';

    const renterBtn = rented
        ? `<button class="ab ab-rn" onclick="viewRenter(${p.id})"><i class="fas fa-id-card"></i> کرێچی</button>`
        : `<button class="ab ab-rn" onclick="openRenterModal(${p.id})"><i class="fas fa-user-plus"></i> زیادکردنی کرێچی</button>`;

    return `
    <div class="arow" data-id="${p.id}">
        <div class="arow-info" style="flex:1;min-width:180px;">
            <div class="arow-loc" style="flex-direction:row-reverse;">
                ${ltBadge} ${stBadge}
                ${esc(p.location)}
                <i class="fas fa-location-dot" style="color:var(--primary);font-size:0.75rem;"></i>
            </div>
            <div class="arow-meta" style="flex-direction:row-reverse;">
                ${p.owner_name ? `<span><i class="fas fa-user-tie"></i> ${esc(p.owner_name)}</span>` : ''}
                <span><i class="fas fa-phone"></i> ${esc(p.phone)}</span>
                ${p.size ? `<span><i class="fas fa-expand"></i> ${esc(p.size)}</span>` : ''}
                <span><i class="fas fa-coins"></i> ${fmtIQD(p.price)}${lt==='rent'?'/مانگ':''}</span>
            </div>
            ${renterLine}
        </div>
        <div class="aacts" style="flex-direction:row-reverse;">
            <button class="ab ab-dl" onclick="delProp(${p.id})" title="سڕینەوە"><i class="fas fa-trash"></i></button>
            <button class="ab ab-sl" onclick="setStatus(${p.id},'sold')"><i class="fas fa-ban"></i> فرۆشراو</button>
            ${renterBtn}
            <button class="ab ab-av" onclick="setStatus(${p.id},'available')"><i class="fas fa-check-circle"></i> بەردەست</button>
        </div>
    </div>`;
}

// ── Add Property ──
async function addProperty(e) {
    e.preventDefault();
    const btn = document.getElementById('addBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> زیادکردن…';

    const payload = {
        location:      document.getElementById('fLocation').value.trim(),
        owner_name:    document.getElementById('fOwner').value.trim(),
        phone:         document.getElementById('fPhone').value.trim(),
        size:          document.getElementById('fSize').value.trim() || null,
        price:         parseFloat(document.getElementById('fPrice').value),
        property_type: document.getElementById('fType').value,
        listing_type:  document.getElementById('fListingType').value,
        status:        'available',
        description:   document.getElementById('fDesc').value.trim() || null,
    };

    const { error } = await supabase.from('properties').insert([payload]);
    if (error) { notify('هەڵە: ' + error.message, 'err'); }
    else {
        notify('خانوبەرەکە زیادکرا!', 'ok');
        document.getElementById('addForm').reset();
        loadProps();
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> زیادکردنی خانوبەرە';
}

// ── Set Status ──
async function setStatus(id, status) {
    const upd = { status };
    if (status === 'available') {
        upd.renter_name  = null;
        upd.renter_phone = null;
        upd.rented_since = null;
    }
    const { error } = await supabase.from('properties').update(upd).eq('id', id);
    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    const statusKu = status === 'available' ? 'بەردەست' : status === 'rented' ? 'کرێدراو' : 'فرۆشراو';
    notify(`نیشاندرا وەک: ${statusKu}`, 'ok');
    loadProps();
}

// ── Delete ──
async function delProp(id) {
    if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم خانوبەرەیە بۆ هەمیشە؟')) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    notify('سڕایەوە.', 'ok');
    loadProps();
}

// ── Renter Modal ──
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
        status:       'rented',
        renter_name:  name,
        renter_phone: phone,
        rented_since: since || null,
    }).eq('id', id);

    if (error) { notify('هەڵە: ' + error.message, 'err'); return; }
    notify('کرێچی تۆمارکرا و خانوبەرەکە کرێدراو نیشاندرا!', 'ok');
    closeRenterModal();
    loadProps();
}

// ── View Renter ──
function viewRenter(id) {
    const p = allProps.find(x => x.id === id);
    if (!p) return;

    document.getElementById('viewBody').innerHTML = `
        ${irow('fas fa-location-dot', 'شوێن', p.location)}
        ${p.owner_name ? irow('fas fa-user-tie','خاوەن', p.owner_name) : ''}
        ${irow('fas fa-phone','ژمارەی خاوەن', p.phone)}
        <div class="rblock">
            <div class="rblock-title" style="flex-direction:row-reverse;"><i class="fas fa-user-clock"></i> کرێچی</div>
            ${irow('fas fa-user',     'ناو',         p.renter_name  || '—')}
            ${irow('fas fa-phone',    'ژمارە',        p.renter_phone || '—')}
            ${irow('fas fa-calendar', 'کرێ لە', p.rented_since ? fmtDate(p.rented_since) : '—')}
        </div>
        <div class="modal-acts" style="flex-direction:row-reverse;">
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

['renterModal','viewModal'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeRenterModal(); closeViewModal(); }
});

// ── Notify ──
function notify(msg, type='ok') {
    const n = document.createElement('div');
    n.className = `notif ${type === 'ok' ? 'nok' : 'nerr'}`;
    n.style.cssText = 'right:auto;left:1.1rem;';
    n.innerHTML = `<i class="fas ${type==='ok' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i> ${msg}`;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.transition = 'all 0.25s';
        n.style.opacity = '0';
        n.style.transform = 'translateX(-110%)';
        setTimeout(() => n.remove(), 260);
    }, 3200);
}

// ── Helpers ──
function irow(icon, label, val) {
    return `<div class="irow" style="flex-direction:row-reverse;text-align:right;">
        <div class="iicon"><i class="${icon}"></i></div>
        <div><div class="ilbl">${label}</div><div class="ival">${esc(String(val))}</div></div>
    </div>`;
}
function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function fmtIQD(n) { return Number(n).toLocaleString('en-IQ') + ' IQD'; }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function today() { return new Date().toISOString().split('T')[0]; }