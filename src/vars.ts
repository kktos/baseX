import { getArrayDims } from "./arrays";
import { FIELDS, TYPES, VAR_FLAGS } from "./defs";
import { getString, newString } from "./strings";
import { EnumToName, hexByte, hexdump, hexLong, hexWord } from "./utils";

// 2: namedIdx
// 2: type
// 2: int / string
// x: float
// x: iterator
const VAR_RECORD_SIZE = 2 + 2 + 2;
const varsBuffer = new Uint8Array(50 * VAR_RECORD_SIZE + 2);

export const ITERATOR = {
	VAR: 2,
	INC: 4,
	MAX: 8,
	PTR: 10,
};

// global._VARS = varsBuffer;

for (let idx = 0; idx < varsBuffer.length; idx++) varsBuffer[idx] = 0xff;
writeWord(0, 0);

function readWord(idx: number) {
	return varsBuffer[idx] | (varsBuffer[idx + 1] << 8);
}

function writeWord(idx: number, word: number) {
	varsBuffer[idx] = word & 0xff;
	varsBuffer[idx + 1] = (word >> 8) & 0xff;
}

function readVarByte(idx: number, field: number) {
	idx = idx * VAR_RECORD_SIZE + field + 2;
	return varsBuffer[idx];
}

function writeVarByte(idx: number, field: number, byte: number) {
	// console.log("writeVarByte", idx, EnumToName(FIELDS, field), byte);

	idx = idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx] = byte & 0xff;

	// console.log(hexdump(varsBuffer, 2, readWord(0)*VAR_RECORD_SIZE+2, 5));
}

export function readVarWord(idx: number, field: number) {
	idx = idx * VAR_RECORD_SIZE + field + 2;
	return varsBuffer[idx] | (varsBuffer[idx + 1] << 8);
}

function writeVarWord(idx: number, field: number, word: number) {
	// console.log("writeVarWord", idx, EnumToName(FIELDS, field), word);

	idx = idx * VAR_RECORD_SIZE + field + 2;
	varsBuffer[idx] = word & 0xff;
	varsBuffer[idx + 1] = (word >> 8) & 0xff;

	// console.log(hexdump(varsBuffer, 2, readWord(0)*VAR_RECORD_SIZE+2, 5));
}

export function getVarValueAddr(idx: number) {
	return idx * VAR_RECORD_SIZE + 2 + FIELDS.VALUE;
}

export function addVarNameIdx(nameIdx: number, level: number, varType: number, isArray = false, isDeclared = false) {
	const count = readWord(0);
	let slotCount = 1;

	writeVarByte(count, FIELDS.TYPE, varType | (isDeclared ? 0 : VAR_FLAGS.UNDECLARED) | (isArray ? VAR_FLAGS.ARRAY : 0));
	writeVarByte(count, FIELDS.LEVEL, level);
	writeVarWord(count, FIELDS.NAME, nameIdx);
	writeVarWord(count, FIELDS.VALUE, 0xffff);

	if (!isArray && varType === TYPES.float) {
		slotCount++;
		writeVarByte(count + 1, FIELDS.TYPE, 0x00);
		writeVarByte(count + 1, FIELDS.LEVEL, 0xff);
		writeVarWord(count + 1, FIELDS.NAME, 0);
		writeVarWord(count + 1, FIELDS.VALUE, 0);
	}

	writeWord(0, count + slotCount);

	return count;
}

export function addVar(name: string, level: number = 0, isArray = false, isDeclared = false) {
	const nameIdx = newString(name, true);

	// console.log("addVar", name, hexWord(nameIdx));

	const varType = getTypeFromName(name);

	return addVarNameIdx(nameIdx, level, varType, isArray, isDeclared);
}

export function declareVar(name: string, level: number = 0, isArray = false) {
	return addVar(name, level, isArray, true);
}

export function declareArray(name: string, level: number = 0) {
	return addVar(name, level, true, true);
}

export function removeVarsForLevel(level: number) {
	let count = readWord(0);
	if (!count) return -1;

	let idx = count;

	do {
		idx--;
		const type = getVarType(idx);
		if (type === 0) {
			continue;
		}
		const varLevel = getVarLevel(idx);
		if (varLevel === level) {
			setVarType(idx, 0);
			count--;
		}
	} while (idx);

	writeWord(0, count);

	return count;
}

export function setVarDeclared(idx: number) {
	writeVarByte(idx, FIELDS.TYPE, readVarByte(idx, FIELDS.TYPE) & (VAR_FLAGS.UNDECLARED ^ 0xff));
}

export function findVar(name: string, level = -1) {
	let idx = readWord(0);
	if (!idx) return -1;

	do {
		idx--;
		const type = getVarType(idx);
		if (type === 6 || type === 0) {
			continue;
		}

		if (level !== -1 && level !== getVarLevel(idx)) continue;

		if (name === getVarName(idx)) return idx;
	} while (idx);

	return -1;
}

export function setVar(idx: number, value: number) {
	const varType = getVarType(idx);
	if (varType === TYPES.float) {
		const buffer = new Uint8Array(4);
		const view = new DataView(buffer.buffer);
		view.setFloat32(0, value);
		for (let fidx = 0; fidx < 4; fidx++) writeVarByte(idx + 1, FIELDS.NAME + fidx, view.getUint8(fidx));
		return;
	}

	writeVarWord(idx, FIELDS.VALUE, value);
}

export function copyVar(idx: number, valueArray: Uint8Array, ptr: number) {
	const varType = getVarType(idx);
	if (varType === TYPES.float) {
		for (let fidx = 0; fidx < 4; fidx++) {
			writeVarByte(idx + 1, FIELDS.NAME + fidx, valueArray[ptr++]);
		}
		return ptr;
	}

	writeVarByte(idx, FIELDS.VALUE, valueArray[ptr++]);
	writeVarByte(idx, FIELDS.VALUE+1, valueArray[ptr++]);
	return ptr;
}

// export function copyVar(destIdx: number, srcIdx: number) {
// 	const destType = getVarType(destIdx);
// 	const srcType = getVarType(srcIdx);
// 	if(destType !== srcType) return ERRORS.TYPE_MISMATCH;

// 	if(destType === TYPES.string) {
// 		return copyString(readVarWord(destIdx, FIELDS.VALUE), readVarWord(destIdx, FIELDS.VALUE));
// 	} else {
// 		writeVarWord(destIdx, FIELDS.VALUE, srcIdx);
// 	}

// 	return ERRORS.NONE;
// }

export function getVar(idx: number) {
	const varType = getVarType(idx);
	if (varType === TYPES.float) {
		const buffer = new Uint8Array(4);
		const view = new DataView(buffer.buffer);
		for (let fidx = 0; fidx < 4; fidx++) view.setUint8(fidx, readVarByte(idx + 1, FIELDS.NAME + fidx));
		return view.getFloat32(0);
	}

	return readVarWord(idx, FIELDS.VALUE);
}

export function getVarName(idx: number) {
	// const result= getString(readVarWord(idx, FIELDS.NAME));

	// const count = readWord(0);
	// for(let idx=0; idx<count; idx++) {
	// 	const typeFlags = readVarByte(idx, FIELDS.TYPE);
	// 	if(!typeFlags)
	// 		continue;
	// 	const nameIdx = readVarWord(idx, FIELDS.NAME);
	// 	const name = getString(nameIdx);
	// 	const value = readVarWord(idx, FIELDS.VALUE);
	// 	const level = readVarByte(idx, FIELDS.LEVEL);
	// 	console.log(`***${idx} T:${hexByte(typeFlags)} L:${hexByte(level)} N:${hexWord(nameIdx)} V:${hexWord(value)} "${typeFlags===6?"iterator":name}"`);
	// }

	return getString(readVarWord(idx, FIELDS.NAME));
	// return result;
}

export function getVarLevel(idx: number) {
	return readVarByte(idx, FIELDS.LEVEL);
}

export function getTypeFromName(name: string) {
	let varType;
	switch (name[name.length - 1]) {
		case "$":
			varType = TYPES.string;
			break;
		case "%":
			varType = TYPES.int;
			break;
		default:
			varType = TYPES.float;
	}
	return varType;
}

export function getVarType(idx: number) {
	return readVarByte(idx, FIELDS.TYPE) & VAR_FLAGS.TYPE;
}
export function getVarFlags(idx: number) {
	return readVarByte(idx, FIELDS.TYPE) & VAR_FLAGS.FLAGS;
}
export function isVarArray(idx: number) {
	return getVarFlags(idx) & VAR_FLAGS.ARRAY;
}
export function isVarInt(idx: number) {
	return getVarType(idx) === TYPES.int;
}
export function isVarDeclared(idx: number) {
	return !(getVarFlags(idx) & VAR_FLAGS.UNDECLARED);
}
export function isVarFunction(idx: number) {
	return getVarFlags(idx) & VAR_FLAGS.FUNCTION;
}

export function setVarType(idx: number, type: number) {
	return writeVarByte(idx, FIELDS.TYPE, type | getVarFlags(idx));
}
export function setVarAsFunction(idx: number) {
	const flags = getVarFlags(idx) | VAR_FLAGS.FUNCTION;
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) | flags);
}

export function setVarAsArray(idx: number) {
	const flags = getVarFlags(idx) | VAR_FLAGS.ARRAY;
	writeVarByte(idx, FIELDS.TYPE, getVarType(idx) | flags);
}

export function addIteratorVar(idx: number) {
	const count = readWord(0);
	writeWord(0, count + 2);

	writeVarByte(count, FIELDS.TYPE, TYPES.iterator);
	writeVarByte(count, FIELDS.LEVEL, 0);
	writeVarWord(count, FIELDS.NAME, idx); // ITERATOR.VAR
	writeVarWord(count, FIELDS.VALUE, 0); // ITERATOR.INC

	writeVarByte(count + 1, FIELDS.TYPE, 0x00);
	writeVarWord(count + 1, FIELDS.NAME, 0); // ITERATOR.MAX
	writeVarWord(count + 1, FIELDS.VALUE, 0); // ITERATOR.PTR

	// console.log("************ addIteratorVar", getVarName(idx));
	// dumpVars();

	return count;
}

export function setIteratorVar(idx: number, part: number, value: number) {
	writeVarWord(idx, part, value);
}

export function getIteratorVar(idx: number, part: number) {
	return readVarWord(idx, part);
}

export function findIteratorVar(varIdx: number) {
	let idx = 0;
	const count = readWord(0);
	while (idx < count) {
		const type = getVarType(idx);
		const nameIdx = readVarWord(idx, FIELDS.NAME);
		if (type === TYPES.iterator && nameIdx === varIdx) return idx;
		idx++;
	}
	return -1;
}

export function dumpVars(out: (...args: string[]) => void) {
	const count = readWord(0);

	out("\n----------- VARS\n");
	out(`count: ${count}\n`);
	out(hexdump(varsBuffer, 2, count * VAR_RECORD_SIZE + 2, VAR_RECORD_SIZE), "\n");

	// let idx = count - 1;
	let idx = 0;
	// while (idx >= 0) {
	while (idx < count) {
		const typeFlags = readVarByte(idx, FIELDS.TYPE);
		const level = readVarByte(idx, FIELDS.LEVEL);
		const nameIdx = readVarWord(idx, FIELDS.NAME);
		const value = readVarWord(idx, FIELDS.VALUE);

		if (!typeFlags) {
			// idx--;
			out(String(idx).padStart(2, "0"), `T:${hexByte(typeFlags)} L:${hexByte(level)} N:${hexWord(nameIdx)} V:${hexWord(value)}`, "\n");
			idx++;
			continue;
		}

		let name = getString(nameIdx);

		let arrayDims;
		const isArray = typeFlags & VAR_FLAGS.ARRAY;
		if (isArray) {
			// typeFlags= typeFlags & (TYPES.ARRAY ^ 0xFF);
			arrayDims = getArrayDims(value).join(",");
		}
		const isFunction = typeFlags & VAR_FLAGS.FUNCTION;
		const isDeclared = !(typeFlags & VAR_FLAGS.UNDECLARED);
		const type = typeFlags & VAR_FLAGS.TYPE;

		const getValueString = () => {
			if (isArray) return hexWord(value);

			if (isFunction) return "";

			switch (type) {
				case TYPES.string: {
					return value !== 0xffff ? `"${getString(value)}"` : "??";
				}
				case TYPES.int: {
					return value;
				}
				case TYPES.iterator: {
					name = getVarName(nameIdx);
					const max = readVarWord(idx + 1, FIELDS.NAME);
					const ptr = readVarWord(idx + 1, FIELDS.VALUE);
					return `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
				}
				case TYPES.float: {
					const buffer = new Uint8Array(4);
					const view = new DataView(buffer.buffer);
					for (let offset = 0; offset < 4; offset++) {
						view.setInt8(offset, readVarByte(idx + 1, FIELDS.NAME + offset));
					}
					return `${view.getFloat32(0)} - $${hexLong(view.getUint32(0))}`;
				}
				default:
					return "";
			}
		};

		const valueStr = getValueString();

		out(
			String(idx).padStart(2, "0"),
			`T:${hexByte(typeFlags)} L:${hexByte(level)} N:${hexWord(nameIdx)} V:${hexWord(value)}`,
			(level > 0 ? "L" : "G") + hexByte(level),
			name.padEnd(20, " "),
			":",
			EnumToName(TYPES, type) + (isArray ? `[${arrayDims}]` : "") + (isFunction ? "()" : ""),
			"=",
			isDeclared ? "" : "undeclared!",
			String(valueStr),
			"\n",
		);

		// idx--;
		idx++;
	}
	out("\n");
}
