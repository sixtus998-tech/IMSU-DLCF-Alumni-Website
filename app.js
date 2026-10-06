'use strict';

/* =====================================================
   1. HELPERS
   ===================================================== */
const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = n => '₦' + Number(n || 0).toLocaleString();
const val = id => $(id).value.trim();

/** Clone a <template> and fill it with data.
 *  data-f="x"     -> textContent = d.x
 *  data-show="x"  -> visible only if d.x is truthy
 *  data-img="x"   -> img src = d.x
 *  data-id        -> dataset.id = d.id            */
function fill(tplId, d) {
  const n = $(tplId).content.firstElementChild.cloneNode(true);
  n.querySelectorAll('[data-f]').forEach(e => e.textContent = d[e.dataset.f] ?? '');
  n.querySelectorAll('[data-show]').forEach(e => e.hidden = !d[e.dataset.show]);
  n.querySelectorAll('[data-img]').forEach(e => { if (d[e.dataset.img]) e.src = d[e.dataset.img]; });
  n.querySelectorAll('[data-id]').forEach(e => e.dataset.id = d.id);
  return n;
}

/** Render a list of items into a container using a template. */
function render(containerId, tplId, items) {
  $(containerId).replaceChildren(...items.map(d => fill(tplId, d)));
  const empty = $(containerId + '-empty');
  if (empty) empty.hidden = items.length > 0;
}

/** Resize an image file and return it as a small JPEG data URL. */
function shrink(file, max, cb) {
  const r = new FileReader();
  r.onload = () => {
    const i = new Image();
    i.onload = () => {
      const k = Math.min(1, max / Math.max(i.width, i.height));
      const c = document.createElement('canvas');
      c.width = i.width * k; c.height = i.height * k;
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      cb(c.toDataURL('image/jpeg', .72));
    };
    i.src = r.result;
  };
  r.readAsDataURL(file);
}
function pick(inputId, max, cb) {
  const f = $(inputId).files[0];
  f ? shrink(f, max, cb) : cb('');
}

/* =====================================================
   2. DATA & STORAGE
   ===================================================== */
const DEFAULT_DB = {
  adminPass: 'admin123',
  users: [], ann: [], inv: [],
  site: {
    mission: 'To raise godly leaders and nurture Imo State University alumni who serve God and humanity wherever they are.',
    vision: 'A united IMSU alumni family impacting our communities and nation for Christ.',
    commitment: 'We are committed to standing firmly on biblical teachings without negotiation or cultural compromise.',
    about: 'Edit this: This is the alumni portal of the Deeper Life Campus Fellowship (DLCF), Imo State University (IMSU), Owerri. Tell the story of the fellowship, its history and core values here.',
    email: 'info@dlcf.example',
    phone: '+234 000 000 0000',
    address: 'Imo State University, Owerri, Imo State, Nigeria'
  },
  leaders: [
    { id: uid(), name: 'Name of President', role: 'National President', photo: '' },
    { id: uid(), name: 'Name of Secretary', role: 'General Secretary', photo: '' }
  ],
  fells: [['DLCF Imo State University', 'IMSU'], ['Alumni Chapter', 'Alumni']].map(([u, t]) => ({
    id: uid(), uni: u, short: t,
    meets: 'Meeting times (edit)', venue: 'Venue (edit)',
    desc: 'Add details here: history, activities, units and how to join.',
    contact: 'Contact person (edit)'
  }))
};

let db;
try { db = JSON.parse(localStorage.getItem('dlcf_imsu_db')); } catch (e) {}
db = db || JSON.parse(JSON.stringify(DEFAULT_DB));

let sess;
try { sess = JSON.parse(localStorage.getItem('dlcf_imsu_sess')) || {}; } catch (e) { sess = {}; }

function save() {
  try { localStorage.setItem('dlcf_imsu_db', JSON.stringify(db)); }
  catch (e) { alert('Browser storage is full or unavailable. Try smaller images.'); }
}
function setSess(s) {
  sess = s;
  try { localStorage.setItem('dlcf_imsu_sess', JSON.stringify(s)); } catch (e) {}
}
const me = () => db.users.find(u => u.id === sess.uid);

/* UI state */
let dirTab = 'all', adminTab = 'inv', invFilter = '';

/* Shared mapper: adds avatar fields used by the person templates */
const withAvatar = p => ({ ...p, initial: (p.name || '?')[0], hasPhoto: !!p.photo, noPhoto: !p.photo });

/* =====================================================
   3. VIEW RENDERERS (one per page)
   ===================================================== */
const views = {};

views.home = () => {
  $('hero-cta').hidden = !!(me() || sess.admin);
  const a = db.ann[0];
  $('home-ann').hidden = !a;
  $('home-ann-none').hidden = !!a;
  if (a) {
    $('home-ann-title').textContent = a.title;
    $('home-ann-date').textContent = a.date;
  }
};

views.directory = () => {
  const years = [...new Set(db.users.map(u => u.yr).filter(Boolean))].sort().reverse();
  if (dirTab !== 'all' && !years.includes(dirTab)) dirTab = 'all';

  const tabs = [['all', 'All sets'], ...years.map(y => [y, 'Set of ' + y])];
  $('dir-tabs').replaceChildren(...tabs.map(([key, label]) => {
    const b = fill('tpl-dirtab', { label });
    b.dataset.action = 'dirYear';
    b.dataset.year = key;
    b.classList.toggle('on', key === dirTab);
    return b;
  }));

  const list = db.users.filter(u => dirTab === 'all' || u.yr === dirTab);
  $('dir-count').textContent = list.length + ' alumni';
  render('dir-list', 'tpl-alumnus', list.map(u => withAvatar({
    ...u, setLabel: 'Set of ' + u.yr, phoneLine: '📞 ' + u.phone, jobLine: '💼 ' + u.job
  })));
};

views.announcements = () => {
  render('ann-list', 'tpl-ann', db.ann.map(a => ({
    ...a, dateLine: '📅 ' + a.date + (a.venue ? ' · 📍 ' + a.venue : '')
  })));
};

views.fellowships = () => {
  render('fel-list', 'tpl-fel', db.fells.map(f => ({
    ...f,
    heading: f.uni + (f.short ? ` (${f.short})` : ''),
    meetsLine: '🕒 ' + f.meets, venueLine: '📍 ' + f.venue, contactLine: '☎ ' + f.contact
  })));
};

views.leadership = () => render('lead-list', 'tpl-leader', db.leaders.map(withAvatar));

views.account = () => {
  const u = me();
  $('acc-img').hidden = !u.photo;
  if (u.photo) $('acc-img').src = u.photo;
  $('acc-initial').hidden = !!u.photo;
  $('acc-initial').textContent = (u.name || '?')[0];
  $('acc-name').value = u.name;
  $('acc-phone').value = u.phone;
  $('acc-job').value = u.job;
};

views.admin = () => {
  const on = !!sess.admin;
  $('admin-login').hidden = on;
  $('admin-panel').hidden = !on;
  if (!on) return;

  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === adminTab));
  document.querySelectorAll('.admin-tab').forEach(p => p.hidden = p.id !== 'tab-' + adminTab);

  /* Inventory */
  const sum = (items, c) => items.filter(i => !c || i.cat === c).reduce((s, i) => s + +i.amt, 0);
  const shown = db.inv.filter(i => !invFilter || i.cat === invFilter);
  $('stat-total').textContent = fmt(sum(db.inv));
  $('stat-welfare').textContent = fmt(sum(db.inv, 'Welfare'));
  $('stat-project').textContent = fmt(sum(db.inv, 'Project'));
  $('inv-users').replaceChildren(...db.users.map(u => Object.assign(document.createElement('option'), { value: u.name })));
  if (!$('inv-date').value) $('inv-date').value = new Date().toISOString().slice(0, 10);
  $('inv-filter').value = invFilter;
  render('inv-body', 'tpl-inv', shown.map(i => ({ ...i, amtText: fmt(i.amt) })));
  $('inv-shown').textContent = fmt(sum(shown));

  /* Announcements, leadership, fellowship lists */
  render('admin-ann-list', 'tpl-admin-ann', db.ann);
  render('admin-lead-list', 'tpl-admin-lead', db.leaders.map(l => ({ ...l, label: `${l.name} — ${l.role}` })));
  render('admin-fel-list', 'tpl-admin-fel', db.fells);

  /* Site content form */
  const s = db.site;
  $('site-mission').value = s.mission; $('site-vision').value = s.vision; $('site-about').value = s.about;
  $('site-email').value = s.email; $('site-phone').value = s.phone; $('site-address').value = s.address;
};

/* =====================================================
   4. ROUTER
   ===================================================== */
const PAGES = ['home', 'directory', 'announcements', 'fellowships', 'leadership',
               'about', 'contact', 'login', 'register', 'account', 'admin'];

function go() {
  let page = location.hash.replace('#/', '') || 'home';
  if (!PAGES.includes(page)) page = 'home';
  if (page === 'account' && !me()) page = 'login';

  document.querySelectorAll('.view').forEach(s => s.hidden = s.id !== 'view-' + page);
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.view === page));
  $('nav-login').hidden = !!me();
  $('nav-account').hidden = !me();

  /* Fill editable site text (mission, vision, about, contact info) */
  document.querySelectorAll('[data-site]').forEach(e => e.textContent = db.site[e.dataset.site]);

  if (views[page]) views[page]();
}

/* =====================================================
   5. FORM HANDLERS
   ===================================================== */
const forms = {
  register(f) {
    const email = val('reg-email').toLowerCase();
    if (db.users.some(u => u.email === email)) return alert('Email already registered.');
    pick('reg-photo', 200, photo => {
      const u = { id: uid(), name: val('reg-name'), phone: val('reg-phone'), email,
                  pw: val('reg-pw'), yr: val('reg-year'), job: val('reg-job'), photo };
      db.users.push(u); save(); setSess({ uid: u.id });
      f.reset(); location.hash = '#/account';
    });
  },
  login() {
    const u = db.users.find(u => u.email === val('login-email').toLowerCase() && u.pw === $('login-pw').value);
    if (!u) return alert('Wrong email or password.');
    setSess({ uid: u.id });
    location.hash = '#/account';
  },
  account() {
    const u = me();
    pick('acc-photo', 200, photo => {
      u.name = val('acc-name'); u.phone = val('acc-phone'); u.job = val('acc-job');
      if (photo) u.photo = photo;
      save(); alert('Saved'); go();
    });
  },
  adminLogin(f) {
    if ($('admin-pw').value !== db.adminPass) return alert('Incorrect password.');
    setSess({ admin: 1 }); f.reset(); go();
  },
  contact(f) { alert('Thanks! Your message has been noted.'); f.reset(); },
  inv(f) {
    db.inv.unshift({ id: uid(), who: val('inv-who'), amt: val('inv-amt'), cat: $('inv-cat').value,
                     type: $('inv-type').value, to: val('inv-to'), date: val('inv-date'), note: val('inv-note') });
    save(); f.reset(); go();
  },
  ann(f) {
    pick('ann-flyer', 700, flyer => {
      db.ann.unshift({ id: uid(), title: val('ann-title'), date: val('ann-date'),
                       venue: val('ann-venue'), body: val('ann-body'), flyer });
      save(); f.reset(); go();
    });
  },
  site() {
    Object.assign(db.site, { mission: val('site-mission'), vision: val('site-vision'), about: val('site-about'),
                             email: val('site-email'), phone: val('site-phone'), address: val('site-address') });
    if (val('site-pw')) db.adminPass = val('site-pw');
    $('site-pw').value = '';
    save(); alert('Saved'); go();
  },
  lead(f) {
    pick('lead-photo', 200, photo => {
      db.leaders.push({ id: uid(), name: val('lead-name'), role: val('lead-role'), photo });
      save(); f.reset(); go();
    });
  },
  fel(f) {
    db.fells.push({ id: uid(), uni: val('fel-title'), short: val('fel-short'), meets: val('fel-meets'),
                    venue: val('fel-venue'), desc: val('fel-desc'), contact: val('fel-contact') });
    save(); f.reset(); go();
  }
};

/* =====================================================
   6. BUTTON ACTIONS (via data-action attributes)
   ===================================================== */
const actions = {
  dirYear(el)  { dirTab = el.dataset.year; go(); },
  adminTab(el) { adminTab = el.dataset.tab; go(); },
  logout()     { setSess({}); location.hash = '#/home'; go(); },
  del(el) {
    if (!confirm('Delete this entry?')) return;
    db[el.dataset.k] = db[el.dataset.k].filter(x => x.id !== el.dataset.id);
    save(); go();
  },
  editFel(el) {
    const f = db.fells.find(x => x.id === el.dataset.id);
    for (const k of ['uni', 'short', 'meets', 'venue', 'desc', 'contact']) {
      const n = prompt(k, f[k]);
      if (n === null) break;
      f[k] = n;
    }
    save(); go();
  },
  csv() {
    const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const rows = [['Date', 'Alumnus', 'Type', 'Category', 'For', 'Amount', 'Note'],
                  ...db.inv.map(i => [i.date, i.who, i.type, i.cat, i.to, i.amt, i.note])];
    const blob = new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dlcf-inventory.csv';
    a.click();
  }
};

/* =====================================================
   7. EVENT WIRING & START
   ===================================================== */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (el && actions[el.dataset.action]) actions[el.dataset.action](el);
});

document.addEventListener('submit', e => {
  const name = e.target.dataset.form;
  if (name && forms[name]) { e.preventDefault(); forms[name](e.target); }
});

$('inv-filter').addEventListener('change', e => { invFilter = e.target.value; go(); });

addEventListener('hashchange', () => { go(); scrollTo(0, 0); });
go();
