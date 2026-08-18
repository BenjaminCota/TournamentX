const fs = require('node:fs');
const path = require('node:path');

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
const dataFile = process.env.LOCAL_DATA_FILE
  ? path.resolve(process.env.LOCAL_DATA_FILE)
  : path.resolve(__dirname, '../../data/tournamentx.local.json');

let memoryState = {};

const transientWriteErrors = new Set(['EACCES', 'EBUSY', 'EPERM']);

function waitForFileUnlock(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function replaceDataFile(temporary) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.renameSync(temporary, dataFile);
      return;
    } catch (error) {
      if (!transientWriteErrors.has(error.code) || attempt === 4) {
        if (!transientWriteErrors.has(error.code)) throw error;
        break;
      }
      waitForFileUnlock(20 * (attempt + 1));
    }
  }

  // Windows can briefly lock the destination while an editor, antivirus or a
  // second local process reads it. The temporary file already contains a full,
  // valid JSON document, so copying it is a safe last resort for local mode.
  fs.copyFileSync(temporary, dataFile);
  fs.rmSync(temporary, { force: true });
}

function readDisk() {
  if (isTest) return memoryState;
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`No fue posible leer ${dataFile}: ${error.message}`);
    return {};
  }
}

function writeDisk(state) {
  memoryState = state;
  if (isTest) return;
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temporary = `${dataFile}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    replaceDataFile(temporary);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function collection(name, seed = []) {
  const state = readDisk();
  if (!Array.isArray(state[name])) {
    state[name] = structuredClone(seed);
    writeDisk(state);
  }
  return state[name];
}

function saveCollection(name, value) {
  const state = readDisk();
  state[name] = structuredClone(value);
  writeDisk(state);
  return value;
}

function value(name, seed) {
  const state = readDisk();
  if (state[name] === undefined) {
    state[name] = structuredClone(seed);
    writeDisk(state);
  }
  return state[name];
}

function saveValue(name, nextValue) {
  const state = readDisk();
  state[name] = structuredClone(nextValue);
  writeDisk(state);
  return nextValue;
}

module.exports = { collection, saveCollection, value, saveValue, dataFile, isTest };
