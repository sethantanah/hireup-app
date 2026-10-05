// Run with: node --test tests/api-pool-copilot.test.cjs
// Exercise the real component with mocked UI and HTTP boundaries; no browser data is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { BehaviorSubject, Subject, of } = require('rxjs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

function fixture(poolId = 'a', existingStorage) {
  const storage = existingStorage || new Map([['USER', JSON.stringify({ id: 'u' })]]);
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/pages/api-connection-copilot/api-connection-copilot.component.ts'), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true }
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, require: name => name === 'rxjs' ? require('rxjs') : name === '@angular/core' ? {
      Component: () => klass => klass, Input: () => () => {}
    } : name.includes('environment') ? { environment: { apiUrl: 'http://test/api' } } : {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    console, crypto: { randomUUID }, setTimeout: () => {}, FormData,
    document: { getElementById: () => null }
  });
  const route = { queryParams: new BehaviorSubject({ connection_id: poolId }) };
  const org = { currentOrg$: new BehaviorSubject({ id: 'org' }), getCurrentOrgValue: () => ({ id: 'org' }) };
  const pools = [
    { id: 'a', name: 'Pool A', copilot_requirements_text: 'Python' },
    { id: 'b', name: 'Pool B', copilot_requirements_text: 'Java' }
  ];
  const requests = [];
  const responses = [];
  const copilot = { chatApiPool: (orgId, payload) => {
    requests.push({ orgId, payload }); const response = new Subject(); responses.push(response); return response;
  }};
  const http = { get: () => of({ api_connections: pools }), put: () => of({ copilot_requirements_text: 'Saved Python' }) };
  const component = new exports.ApiConnectionCopilotComponent({}, copilot, {}, {}, {}, {}, {}, org, http, route, { navigate() {} }, { markForCheck() {} });
  component.ngOnInit();
  return { component, storage, route, requests, responses };
}

test('API workspace ignores legacy job chats and persists only its own history', () => {
  const f = fixture();
  f.storage.set('COPILOT_SESSIONS_org', JSON.stringify([{ messages: [{ content: 'job secret' }] }]));
  f.component.sendPrompt('Pool A question');
  f.responses[0].next({ response: 'A answer', candidates: [] });
  f.route.queryParams.next({ connection_id: 'b' });
  assert.equal(f.component.requirementsText, 'Java');
  assert.ok(!JSON.stringify(f.component.messages).includes('A answer'));
  f.route.queryParams.next({ connection_id: 'a' });
  assert.ok(JSON.stringify(f.component.messages).includes('A answer'));
  assert.ok(!JSON.stringify(f.component.messages).includes('job secret'));
  f.component.ngOnDestroy();
});

test('source selection does not change owner or requirements and restores on reload', () => {
  const f = fixture();
  f.component.onSourcePoolsChange(['b']);
  f.component.sendPrompt('Compare profiles');
  assert.equal(f.requests[0].payload.context_connection_id, 'a');
  assert.deepEqual(Array.from(f.requests[0].payload.connection_ids), ['b']);
  assert.equal(f.component.requirementsText, 'Python');
  const reloaded = fixture('a', f.storage);
  assert.deepEqual(Array.from(reloaded.component.sourceConnectionIds), ['b']);
  f.component.ngOnDestroy(); reloaded.component.ngOnDestroy();
});

test('empty selection cannot send and select all is explicit', () => {
  const f = fixture();
  f.component.onSourcePoolsChange([]);
  f.component.sendPrompt('Search');
  assert.equal(f.requests.length, 0);
  f.component.selectAllPools();
  f.component.sendPrompt('Search');
  assert.deepEqual(Array.from(f.requests[0].payload.connection_ids), ['a', 'b']);
  f.component.ngOnDestroy();
});

test('late responses cannot land in another pool or chat', () => {
  const f = fixture();
  f.component.sendPrompt('Search');
  f.route.queryParams.next({ connection_id: 'b' });
  f.responses[0].next({ response: 'stale answer' });
  assert.ok(!JSON.stringify(f.component.messages).includes('stale answer'));
  f.component.sendPrompt('Search B');
  f.component.createNewSession();
  f.responses[1].next({ response: 'stale chat' });
  assert.ok(!JSON.stringify(f.component.messages).includes('stale chat'));
  assert.equal(f.component.isLoading, false);
  f.component.ngOnDestroy();
});

test('revoking a source stops old results from entering future model context', () => {
  const f = fixture();
  f.component.selectAllPools();
  f.component.sendPrompt('Search');
  f.responses[0].next({ response: 'Pool B result' });
  f.component.onSourcePoolsChange(['a']);
  f.component.sendPrompt('Follow up');
  assert.equal(f.requests[1].payload.history.length, 0);
  f.component.ngOnDestroy();
});

test('deleting the active session persists deletion', () => {
  const f = fixture();
  const oldId = f.component.activeSessionId;
  f.component.createNewSession();
  f.component.deleteSession(f.component.activeSessionId, { stopPropagation() {} });
  const reloaded = fixture('a', f.storage);
  assert.equal(reloaded.component.chatSessions.length, 1);
  assert.equal(reloaded.component.activeSessionId, oldId);
  f.component.ngOnDestroy(); reloaded.component.ngOnDestroy();
});

test('resume display preserves nested data despite empty card fields and JSON encoding', () => {
  const { component } = fixture();
  const source = {
    full_name: 'Applicant', email: '', skills: [], education: [], work_experience: [],
    resume_data: JSON.stringify({
      personal_details: { full_name: 'Resume Name', email: 'resume@example.test', phone_number: '123' },
      skills: ['Python', 'SQL'],
      education: [{ school: 'University', degree: 'BSc', major: 'Computing' }],
      work_experience: [{ title: 'Engineer', employer: 'Example', responsibilities: 'Built APIs' }],
      certifications: ['AWS'],
      projects: [{ title: 'API', technologies: ['Python'] }]
    }),
    uploaded_files: { resume: { metadata: { url: 'https://example.test/resume.pdf' } } }
  };
  const snapshot = JSON.stringify(source);
  const mapped = component.formatCandidateForDetails(source);
  assert.equal(mapped.full_name, 'Resume Name');
  assert.equal(mapped.resume_data.personal_details.email, 'resume@example.test');
  assert.equal(mapped.resume_data.personal_details.phone_number, '123');
  assert.equal(mapped.resume_data.skills.technical_skills.join(','), 'Python,SQL');
  assert.equal(mapped.education[0].institution, 'University');
  assert.equal(mapped.work_experience[0].job_title, 'Engineer');
  assert.equal(mapped.work_experience[0].responsibilities[0], 'Built APIs');
  assert.equal(mapped.certifications[0].name, 'AWS');
  assert.equal(mapped.projects[0].technologies_used[0], 'Python');
  assert.equal(mapped.resume_url, 'https://example.test/resume.pdf');
  assert.equal(JSON.stringify(source), snapshot);
  component.ngOnDestroy();
});

test('API record fallback unwraps form values and preserves nonempty resume sections', () => {
  const { component } = fixture();
  const mapped = component.formatCandidateForDetails({
    resume_data: {}, structured_resume: { education: [] },
    original_record: {
      form_data: { first_name: { value: 'First' }, last_name: { value: 'Last' }, email: { value: 'form@example.test' } },
      resume_data: { education: [{ institution: 'College' }], skills: { languages: [{ language: 'English' }] } }
    }
  });
  assert.equal(mapped.full_name, 'First Last');
  assert.equal(mapped.email, 'form@example.test');
  assert.equal(mapped.education[0].institution, 'College');
  assert.equal(mapped.resume_data.skills.languages[0], 'English');
  component.ngOnDestroy();
});
