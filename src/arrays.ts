import { ERRORS, TYPES } from "./defs";
import { hexdump, hexWord } from "./utils";

const ARRAY_RECORD_SIZE = 2 + 2;
const arrayList = new Uint8Array(2 + 20 * ARRAY_RECORD_SIZE);
const arrayData = new Uint8Array(2 + 20 * 255);

// global._ARRAYLIST = arrayList;
// global._ARRAYDATA = arrayData;

for (let idx = 0; idx < arrayList.length; idx++) arrayList[idx] = 0xff;

writeWord(arrayList, 0, 0);
writeWord(arrayData, 0, 2);

export function addArray(varType: number, dim: number) {
	const count = readWord(arrayList, 0);
	writeWord(arrayList, 0, count + 1);

	// console.log("*** addArray", count, EnumToName(TYPES, varType), dim);

	writeWord(arrayList, 2 + count * ARRAY_RECORD_SIZE, dim);

	let itemSize = 2;
	switch (varType) {
		case TYPES.byte: {
			itemSize = 1;
			break;
		}
	}
	const freePtr = readWord(arrayData, 0);
	writeWord(arrayData, 0, freePtr + dim * itemSize);

	for (let idx = freePtr; idx < freePtr + dim * itemSize; idx++) arrayData[idx] = 0xff;

	writeWord(arrayList, 2 + count * ARRAY_RECORD_SIZE + 2, freePtr);

	return count;
}

export function getArraySize(arrayIdx: number) {
	return readWord(arrayList, 2 + arrayIdx * ARRAY_RECORD_SIZE);
}

export function getArrayPtr(arrayIdx: number) {
	return readWord(arrayList, 2 + arrayIdx * ARRAY_RECORD_SIZE + 2);
}

export function setArrayItem(varType: number, arrayIdx: number, idx: number, value: number) {
	if (idx >= getArraySize(arrayIdx)) return ERRORS.OVERFLOW;

	let addr = getArrayPtr(arrayIdx);
	switch (varType & 0x3f) {
		case TYPES.string:
		case TYPES.int: {
			addr += idx * 2;
			writeWord(arrayData, addr, value);
			break;
		}
		case TYPES.byte: {
			addr += idx;
			writeByte(arrayData, addr, value);
			break;
		}
	}
	return 0;
}

export function getArrayItem(varType: number, arrayIdx: number, idx: number) {
	let addr = getArrayPtr(arrayIdx);
	switch (varType) {
		case TYPES.string:
		case TYPES.int: {
			addr += idx * 2;
			return readWord(arrayData, addr);
		}
		case TYPES.byte: {
			addr += idx;
			return readByte(arrayData, addr);
		}
		default:
			throw new TypeError("Unknown var type");
	}
}

function readByte(buffer: Uint8Array, idx: number) {
	return buffer[idx];
}

function readWord(buffer: Uint8Array, idx: number) {
	return buffer[idx] | (buffer[idx + 1] << 8);
}

function writeByte(buffer: Uint8Array, idx: number, byte: number) {
	buffer[idx] = byte & 0xff;
}

function writeWord(buffer: Uint8Array, idx: number, word: number) {
	buffer[idx] = word & 0xff;
	buffer[idx + 1] = (word >> 8) & 0xff;
}

export function dumpArray(arrayIdx: number) {
	const addr = getArrayPtr(arrayIdx);
	const size = getArraySize(arrayIdx);
	console.log("idx", arrayIdx, "size", size);
	console.log(hexdump(arrayData, addr, size));
}

export function dumpArrays() {
	console.log("-- ARRAYS --");

	const count = readWord(arrayList, 0);
	// console.log("count:", count);
	// console.log(hexdump(arrayList, 2, count * ARRAY_RECORD_SIZE + 2, 4));

	console.log("- LIST");
	for (let idx = 0; idx < count; idx++) {
		const arrPtr = getArrayPtr(idx);
		const arrDim = getArraySize(idx);
		console.log(hexWord(idx), `$${hexWord(arrPtr)}(${hexWord(arrDim)})`);
		// console.log(hexdump(arrayData, arrPtr, 4, 16));
	}

	const freeIdx = readWord(arrayData, 0);
	// console.log("size:", hexWord(freeIdx));
	console.log("- DATA");
	console.log(hexdump(arrayData, 0, freeIdx, 16));

	// while(idx < count) {
	// 	const nameIdx= readVarWord(idx, FIELDS.NAME);
	// 	const name= getString(nameIdx);
	// 	let type= readVarByte(idx, FIELDS.TYPE);
	// 	let value= readVarWord(idx, FIELDS.VALUE);

	// 	const isArray= type & TYPES.ARRAY;
	// 	if(isArray)
	// 		type= type & (TYPES.ARRAY ^ 0xFF);

	// 	switch(type) {
	// 		case TYPES.string: {
	// 			value= value ? '"' + getString(value) + '"' : undefined;
	// 			break;
	// 		}
	// 		case TYPES.iterator: {
	// 			idx++;
	// 			const max= readVarWord(idx, FIELDS.NAME);
	// 			const ptr= readVarWord(idx, FIELDS.VALUE);
	// 			value= `INC:${hexWord(value)} MAX:${hexWord(max)} PTR:${hexWord(ptr)}`;
	// 		}
	// 	}

	// 	console.log(
	// 		name,
	// 		":",
	// 		Object.keys(TYPES)[Object.values(TYPES).indexOf(type)] + (isArray?"[]":""),
	// 		"=",
	// 		value);

	// 	idx++;
	// }
}
