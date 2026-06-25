import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
const imagesDir = path.join(out, 'images');

fs.mkdirSync(imagesDir, { recursive: true });

function write(file, content) {
  const dest = path.join(out, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
}

function extractBase64Images(html, prefix) {
  let index = 0;
  return html.replace(/src="(data:image\/(jpeg|png|webp|gif);base64,[^"]+)"/g, (_, dataUrl, ext) => {
    index += 1;
    const base64 = dataUrl.split(',')[1];
    const filename = `${prefix}-${index}.${ext === 'jpeg' ? 'jpg' : ext}`;
    fs.writeFileSync(path.join(imagesDir, filename), Buffer.from(base64, 'base64'));
    return `src="/images/${filename}"`;
  });
}

const PRODUCT = 'independent-agents';

function injectAnalytics(html, site) {
  const tag = `<script src="/analytics.js" data-site="${site}" data-product="${PRODUCT}"></script>`;
  return html.replace('</body>', `${tag}\n</body>`);
}

const metaBlock = `
<meta name="description" content="BookCover gives independent insurance agents HIPAA-compliant Claude — upload member documents freely, filter PII automatically, and give members a branded 24/7 helper app.">
<meta name="theme-color" content="#1d9e75">
<meta property="og:type" content="website">
<meta property="og:title" content="BookCover — HIPAA-compliant Claude for insurance agents">
<meta property="og:description" content="An AI customer-service team for independent agents. Safe Claude access, organized by member, with a branded member app.">
<meta property="og:site_name" content="BookCover">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="BookCover — HIPAA-compliant Claude for insurance agents">
<meta name="twitter:description" content="An AI customer-service team for independent agents. Safe Claude access, organized by member, with a branded member app.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.svg">
`;

let indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
indexHtml = extractBase64Images(indexHtml, 'preview');
indexHtml = indexHtml.replace('</title>', `</title>${metaBlock}`);
indexHtml = indexHtml.replace(
  /<a class="cta" href="#launch">Open the demos<\/a>/,
  '<a class="cta" href="#launch">See the demos</a>'
);
indexHtml = indexHtml.replace(
  /<span class="sec-eyebrow">Two prototypes · open them now<\/span>/,
  '<span class="sec-eyebrow">Interactive demos</span>'
);
indexHtml = indexHtml.replace(
  /<p class="sec-lede">Agents get a HIPAA-safe Claude workspace\. Members get a branded app of their own\. Each prototype is a self-contained build — open either in a new tab\.<\/p>/,
  '<p class="sec-lede">Agents get a HIPAA-safe Claude workspace. Members get a branded app of their own. Explore each interactive demo below.</p>'
);
indexHtml = indexHtml.replace(/\.\/agent-portal\.html/g, '/agent');
indexHtml = indexHtml.replace(/\.\/member-app\.html/g, '/member');
indexHtml = indexHtml.replace(/ target="_blank" rel="noopener"/g, '');
indexHtml = indexHtml.replace(/\s*<div class="filehint">[^<]*<\/div>/g, '');
indexHtml = indexHtml.replace(
  /<p>Open the two prototypes to see how BookCover gives independent agents the power of Claude — safely — and gives their members an experience worth staying for\.<\/p>/,
  '<p>Explore the interactive demos to see how BookCover gives independent agents the power of Claude — safely — and gives their members an experience worth staying for.</p>'
);
indexHtml = indexHtml.replace(/Agent Workspace ↗/g, 'Agent Workspace');
indexHtml = indexHtml.replace(/Member App ↗/g, 'Member App');
indexHtml = indexHtml.replace(/href="\/agent"/g, 'href="/agent" data-track-demo="agent"');
indexHtml = indexHtml.replace(/href="\/member"/g, 'href="/member" data-track-demo="member"');
write('index.html', injectAnalytics(indexHtml, 'landing'));

const demoBannerHtml = `
<div class="demo-banner">
  <span>Interactive demo</span>
  <span class="sep">·</span>
  <a href="/">← Back to BookCover</a>
</div>`;

const demoStyles = '<link rel="stylesheet" href="/demo-mobile.css">';

function injectDemoStyles(html) {
  if (html.includes('/demo-mobile.css')) return html;
  return html.replace('</style>', `</style>\n${demoStyles}`);
}

let agentHtml = fs.readFileSync(path.join(root, 'agent-portal.html'), 'utf8');
agentHtml = agentHtml.replace(
  '<title>BookCover — Workspace</title>',
  `<title>BookCover — Agent Workspace Demo</title>
<meta name="description" content="Interactive demo of the BookCover agent workspace — HIPAA-safe Claude, client organization, and member inquiries.">
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
);
agentHtml = injectDemoStyles(agentHtml);
agentHtml = agentHtml.replace(
  '<div class="topbar">',
  `<div class="topbar">
      <button type="button" class="mob-nav" id="mobNavBtn" aria-label="Open menu" onclick="toggleMobNav()"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>`
);
agentHtml = agentHtml.replace(
  '<div class="app">',
  `<div class="mob-scrim" id="mobScrim" onclick="closeMobNav()"></div>
<div class="app">`
);
agentHtml = agentHtml.replace('<body>', `<body class="has-demo-banner agent-demo">${demoBannerHtml}`);
agentHtml = agentHtml.replace(
  /function goHome\(\)\{/,
  `function closeMobNav(){
  document.querySelector('.sidecol')?.classList.remove('open');
  document.getElementById('mobScrim')?.classList.remove('show');
}
function toggleMobNav(){
  document.querySelector('.sidecol')?.classList.toggle('open');
  document.getElementById('mobScrim')?.classList.toggle('show');
}
document.querySelectorAll('.s-nav .nav-i, .sidecol .s-new').forEach(function(el){
  el.addEventListener('click',function(){ if(window.innerWidth<=900) closeMobNav(); });
});
function goHome(){closeMobNav();`
);
agentHtml = agentHtml.replace(
  /function openClient\(id\)\{/,
  `function openClient(id){closeMobNav();`
);
agentHtml = agentHtml.replace(
  /function openConversation\(id,idx\)\{/,
  `function openConversation(id,idx){closeMobNav();`
);
write('agent/index.html', injectAnalytics(agentHtml, 'agent'));

let memberHtml = fs.readFileSync(path.join(root, 'member-app.html'), 'utf8');
memberHtml = memberHtml.replace(
  '<title>Your HealthPlan Helper — Member App Prototype</title>',
  `<title>Your HealthPlan Helper — Member App Demo</title>
<meta name="description" content="Interactive demo of the BookCover white-labeled member app — plan help, agent messaging, and 24/7 assistance.">
<meta name="robots" content="noindex">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
);
memberHtml = injectDemoStyles(memberHtml);
memberHtml = memberHtml.replace('<body>', `<body class="has-demo-banner member-demo">${demoBannerHtml}`);
memberHtml = memberHtml.replace(/<div class="head">[\s\S]*?<\/div>\s*\n\s*<div class="stage">/, '<div class="stage">');
memberHtml = memberHtml.replace(/\s*<div class="jump" id="jump"><\/div>/, '');
memberHtml = memberHtml.replace(/\/\* screen jump[\s\S]*?\.hint\{[^}]+\}\n\n/, '');
memberHtml = memberHtml.replace(/\n\/\* ───────────── Review jump bar ───────────── \*\/\nconst JUMP=[\s\S]*?function renderJump\(active\)\{[\s\S]*?\}\n/, '\n');
memberHtml = memberHtml.replace(/\s*renderJump\(id\);/, '');
memberHtml = memberHtml.replace(/go\('home'\);\s*$/, "go('home');");
write('member/index.html', injectAnalytics(memberHtml, 'member'));

const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
write('admin/index.html', adminHtml);

fs.copyFileSync(path.join(root, 'public', 'favicon.svg'), path.join(out, 'favicon.svg'));
fs.copyFileSync(path.join(root, 'public', 'robots.txt'), path.join(out, 'robots.txt'));
fs.copyFileSync(path.join(root, 'public', 'admin.css'), path.join(out, 'admin.css'));
fs.copyFileSync(path.join(root, 'public', 'analytics.js'), path.join(out, 'analytics.js'));
fs.copyFileSync(path.join(root, 'public', 'demo-mobile.css'), path.join(out, 'demo-mobile.css'));

console.log('Build complete → dist/');
