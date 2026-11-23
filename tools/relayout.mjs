import fs from 'fs';
import path from 'path';

const src = path.resolve('src');

function destRel(rel) {
  const norm = rel.replace(/\\/g, '/');
  const swap = (value) => value.split('infraestructure').join('infrastructure');
  if (norm.startsWith('lib-core/')) return 'core/' + norm.slice('lib-core/'.length);
  if (norm.startsWith('lib-client-feign/')) return 'core/feign/' + norm.slice('lib-client-feign/'.length);
  if (norm.startsWith('lib-entities/core/')) return 'core/contracts/' + norm.slice('lib-entities/core/'.length);
  if (norm.startsWith('lib-entities/gateway/')) return 'app/' + norm.slice('lib-entities/gateway/'.length);
  if (norm.startsWith('lib-entities/auth/')) return 'client/features/security/lifecycle/auth/domain/' + path.posix.basename(norm);
  if (norm.startsWith('lib-entities/users/user')) return 'client/features/security/lifecycle/registration/domain/' + path.posix.basename(norm);
  if (norm.startsWith('lib-entities/users/person')) return 'client/features/security/identity/profile/domain/' + path.posix.basename(norm);
  if (norm.startsWith('lib-entities/security/role')) return 'client/features/security/access/roles/domain/' + path.posix.basename(norm);
  if (norm.startsWith('lib-entities/security/service')) return 'client/features/security/access/services/domain/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/auth/')) return 'client/features/security/lifecycle/auth/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/user/user')) return 'client/features/security/lifecycle/registration/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/user/person')) return 'client/features/security/identity/profile/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/security/role-service')) return 'client/features/security/access/roles/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/security/role')) return 'client/features/security/access/roles/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('lib-models/security/service')) return 'client/features/security/access/services/infrastructure/models/' + path.posix.basename(norm);
  if (norm.startsWith('features/auth/')) return 'client/features/security/lifecycle/auth/' + swap(norm.slice('features/auth/'.length));
  if (norm.startsWith('features/users/user/')) return 'client/features/security/lifecycle/registration/' + norm.slice('features/users/user/'.length);
  if (norm.startsWith('features/users/person/')) return 'client/features/security/identity/profile/' + norm.slice('features/users/person/'.length);
  if (norm.startsWith('features/users/dependencies.ts')) return 'app/composition/identity.ts';
  if (norm.startsWith('features/security/role/')) return 'client/features/security/access/roles/' + swap(norm.slice('features/security/role/'.length));
  if (norm.startsWith('features/security/service/')) return 'client/features/security/access/services/' + swap(norm.slice('features/security/service/'.length));
  if (norm === 'features/security/dependencies.ts') return 'app/composition/access.ts';
  if (norm.startsWith('features/auth/dependencies.ts')) return 'app/composition/auth.ts';
  if (norm.startsWith('api-gateway/')) return 'app/' + norm.slice('api-gateway/'.length);
  if (norm === 'main.ts') return 'app/main.ts';
  return norm;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

const files = walk(src);
const map = new Map();
for (const file of files) {
  const rel = path.relative(src, file).replace(/\\/g, '/');
  map.set(rel, destRel(rel));
}

function resolveImport(fromRel, spec) {
  if (!spec.startsWith('.')) return spec;
  const fromDir = path.posix.dirname(fromRel);
  let target = path.posix.normalize(path.posix.join(fromDir, spec));
  if (target.endsWith('.js')) target = target.slice(0, -3);
  const candidates = [target, target + '.ts', target + '/index.ts'];
  for (const candidate of candidates) {
    if (map.has(candidate)) return candidate;
  }
  return null;
}

for (const [fromRel, toRel] of map) {
  const absolute = path.join(src, fromRel);
  let text = fs.readFileSync(absolute, 'utf8');
  text = text.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (all, lead, spec, tail) => {
    const resolved = resolveImport(fromRel, spec);
    if (!resolved) return all;
    const dest = map.get(resolved);
    let next = path.posix.relative(path.posix.dirname(toRel), dest);
    if (!next.startsWith('.')) next = './' + next;
    next = next.replace(/\.ts$/, '');
    return lead + next + tail;
  });
  const out = path.join(src, toRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
}

for (const fromRel of map.keys()) {
  const toRel = map.get(fromRel);
  if (fromRel !== toRel) fs.rmSync(path.join(src, fromRel));
}

function prune(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) prune(full);
  }
  if (fs.readdirSync(dir).length === 0 && dir !== src) fs.rmdirSync(dir);
}
prune(src);
console.log('moved', map.size);
