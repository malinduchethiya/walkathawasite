import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const draftPath = path.resolve(process.cwd(), 'DRAFT_firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

function loadRules(): string {
  const target = fs.existsSync(rulesPath) ? rulesPath : draftPath;
  return fs.readFileSync(target, 'utf8');
}

function loadBlueprint() {
  return JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
}

test('Firestore rules enforce global default-deny catch-all and rules_version 2', () => {
  const rules = loadRules();
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match\s*\/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('Dirty Dozen #1–#3: Shadow fields, identity spoofing, and unverified email writes are blocked', () => {
  const rules = loadRules();
  assert.match(rules, /isVerifiedUser\(\)/);
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);
  assert.match(rules, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rules, /incoming\(\)\.authorId\s*==\s*request\.auth\.uid/);
});

test('Dirty Dozen #4: Private PII collection restricts get to owner and denies list', () => {
  const rules = loadRules();
  assert.match(rules, /match\s*\/userPrivate\/\{userId\}/);
  assert.match(rules, /allow get:\s*if\s*isValidId\(userId\)\s*&&\s*isOwner\(userId\);/);
  assert.match(rules, /allow list:\s*if\s*false;/);
});

test('Dirty Dozen #5–#7: Timestamp forgery, view count jumps, and self-verification are blocked', () => {
  const rules = loadRules();
  assert.match(rules, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rules, /incoming\(\)\.views\s*==\s*existing\(\)\.views\s*\+\s*1/);
  assert.match(rules, /incoming\(\)\.isVerified\s*==\s*false/);
  assert.match(rules, /incoming\(\)\.authorVerified\s*==\s*false/);
});

test('Dirty Dozen #8–#12: Path ID poisoning, oversized payloads, orphaned chapters, and unauthorized list queries are blocked', () => {
  const rules = loadRules();
  const blueprint = loadBlueprint();

  assert.match(rules, /id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/);
  assert.ok(
    rules.includes(`data.content.size() <= ${blueprint.entities.StoryChapter.properties.content.maxLength}`),
    'Chapter content maxLength matches firebase-blueprint.json'
  );
  assert.ok(
    rules.includes(`data.title.size() <= ${blueprint.entities.Story.properties.title.maxLength}`),
    'Story title maxLength matches firebase-blueprint.json'
  );
  assert.match(rules, /existsAfter\(\/databases\/\$\(database\)\/documents\/stories\/\$\(storyId\)\)/);
  assert.match(rules, /allow list:\s*if\s*existing\(\)\.status\s*==\s*'published'/);
  assert.doesNotMatch(rules, /allow list:\s*if\s*isSignedIn\(\);/);
});
