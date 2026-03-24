// src/routes.js — Express routes + Admin UI
const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const logger   = require('./logger');
const config   = require('./config-store');
const { handleVoice, handleGather, handleStatus } = require('./voice');

const router     = express.Router();
const SCRIPT_PATH = path.join(__dirname, 'data/script.json');

router.get('/health', (req, res) => {
  res.json({ status: 'ok', agents: { receptionist: config.receptionist_name, knowledge: config.knowledge_name, scheduler: config.scheduler_name }, brand: config.brand_name, uptime: Math.round(process.uptime()) });
});

router.post('/voice',  handleVoice);
router.post('/gather', handleGather);
router.post('/status', handleStatus);

function adminAuth(req, res, next) {
  const pw = req.query.pw || req.body?.pw || req.headers['x-admin-password'];
  if (pw && pw === config.admin_password) return next();
  res.status(401).send('<h1>Admin Login</h1><form method="GET" action="/admin"><input type="password" name="pw" placeholder="Password"/><button type="submit">Sign In</button></form>');
}

router.get('/admin', adminAuth, (req, res) => {
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8')); } catch { }
  const pw = req.query.pw;
  res.send(`<h1>${config.brand_name} Admin</h1><p>${entries.length} entries</p>${entries.map(e => `<div><p>${e.question}</p><textarea id="a-${e.id}">${e.answer}</textarea><button onclick="save(${e.id})">Save</button><span>${e.approved?'Approved':'Pending'}</span><button onclick="del(${e.id})">Delete</button></div>`).join('')}<h2>Add Entry</h2><input type="text" id="new-q" placeholder="Question"/><textarea id="new-a"></textarea><button onclick="add()">Add</button><script>const PW='${pw}';async function save(id){await fetch('/admin/script/'+id+'?pw='+PW,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({answer:document.getElementById('a-'+id).value})});location.reload()}async function del(id){if(confirm('Delete?')){await fetch('/admin/script/'+id+'?pw='+PW,{method:'DELETE'});location.reload()}}async function add(){const q=document.getElementById('new-q').value;const a=document.getElementById('new-a').value;await fetch('/admin/script?pw='+PW,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,answer:a,approved:true})});location.reload()}</script>`);
});

function readScript() { try { return JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf8')); } catch { return []; } }
function writeScript(d) { fs.writeFileSync(SCRIPT_PATH, JSON.stringify(d, null, 2), 'utf8'); }

router.post('/admin/script', adminAuth, express.json(), (req, res) => {
  const { question, answer, approved = false } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'required' });
  const entries = readScript();
  const id = entries.length > 0 ? Math.max(...entries.map(e => e.id)) + 1 : 1;
  entries.push({ id, question, answer, approved });
  writeScript(entries);
  res.json({ id });
});
router.patch('/admin/script/:id', adminAuth, express.json(), (req, res) => {
  const id = parseInt(req.params.id);
  const { answer } = req.body;
  const entries = readScript();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  entries[idx].answer = answer;
  writeScript(entries);
  res.json({ ok: true });
});
router.post('/admin/script/:id/approve', adminAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const entries = readScript();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  entries[idx].approved = true;
  writeScript(entries);
  res.json({ ok: true });
});
router.delete('/admin/script/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id);
  writeScript(readScript().filter(e => e.id !== id));
  res.json({ ok: true });
});
router.get('/admin/script', adminAuth, (req, res) => res.json(readScript()));

function escHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

module.exports = router;
