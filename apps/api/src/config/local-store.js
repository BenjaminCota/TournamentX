const fs = require('node:fs');
const path = require('node:path');

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);
const dataFile = process.env.LOCAL_DATA_FILE
  ? path.resolve(process.env.LOCAL_DATA_FILE)
  : path.resolve(__dirname, '../../data/tournamentx.local.json');

let memoryState = {};

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
  const temporary = `${dataFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, dataFile);
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
