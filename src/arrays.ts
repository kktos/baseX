import { ERRORS, TYPES } from "./defs";
import { memAlloc } from "./memmgr";
import { hexdump, hexWord } from "./utils";

/*

	0000: arrays count

	0002: array[0] length
	0004: array[0] offset in Data

	0006: array[1] length
	0008: array[1] offset in Data

	type Int16 = number;
	type TArrayItem = {
		size: Int16;
		ptr: Int16;
	};

	type TArrayList = {
		count: Int16;
		items: TArrayItem[];
	};
*/

const ARRAY_COUNT = 20;
const ARRAY_RECORD_SIZE = 2 + 2;
const ARRAY_LIST_COUNT = 2;
const ARRAY_DATA_SIZE = 2;

const ARRAY_DATA_DIM_COUNT_SIZE = 1;
const ARRAY_DATA_DIM_SIZE = 2;

const arrayList = memAlloc(ARRAY_LIST_COUNT + ARRAY_COUNT * ARRAY_RECORD_SIZE);
const arrayData = memAlloc(ARRAY_DATA_SIZE + ARRAY_COUNT * 255);

// global._ARRAYLIST = arrayList;
// global._ARRAYDATA = arrayData;

for (let idx = 0; idx < arrayList.length; idx++) arrayList[idx] = 0xff;

writeWord(arrayList, 0, 0);
writeWord(arrayData, 0, 2);

//
// ARRAY LIST
// 0000 : nn nn ; count -> count + 1
// ...
// XXX0 : ss ss ; array items count : all dims multiplied
// XXX2 : pp pp ; data ptr in ARRAY DATA
//
// ARRAY DATA
// 0000 : nn nn ; next free ptr
// pppp : dd dd ; byte[ssss]
//
export function addArray(varType: number, dims: number[]) {
	// inc array count
	const count = readWord(arrayList, 0);
	writeWord(arrayList, 0, count + 1);

	// console.log("*** addArray", count, EnumToName(TYPES, varType), dim);

	// mutliply all dims together a(2,3) <=> a(6)
	let arrayItemsCount = 1;
	for (let idx = 0; idx < dims.length; idx++) {
		arrayItemsCount *= dims[idx];
	}

	let itemSize = 2;
	switch (varType) {
		case TYPES.byte: {
			itemSize = 1;
			break;
		}
	}

	const dataSizeInBytes= arrayItemsCount * itemSize;
	const headerSizeInBytes= ARRAY_DATA_DIM_COUNT_SIZE + dims.length * ARRAY_DATA_DIM_SIZE;
	const sizeInBytes= headerSizeInBytes + dataSizeInBytes;

	// add new array bytes size into the ARRAY LIST
	writeWord(arrayList, 2 + count * ARRAY_RECORD_SIZE, sizeInBytes);

	// move ARRAY DATA free ptr after new array
	const freePtr = readWord(arrayData, 0);
	writeWord(arrayData, 0, freePtr + sizeInBytes);

	// initialise new array data with $FF
	for (let idx = freePtr; idx < freePtr + sizeInBytes; idx++) arrayData[idx] = 0xff;

	writeByte(arrayData, freePtr, dims.length);
	for (let idx = 0; idx < dims.length; idx++) {
		writeWord(arrayData, freePtr+1+ idx*2, dims[idx]);
	}

	// add new array ptr into the ARRAY LIST
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
	switch (varType) {
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
