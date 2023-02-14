import { addArray, getArrayItem, getArraySize, setArrayItem } from "./arrays";
import { ERRORS, TYPES } from "./defs";
import { hexWord } from "./utils";

/*

	0000: strings count

	0002: string[0] length
	0004: string[0] array index

	0006: string[1] length
	0008: string[1] array index

	type Int16 = number;
	type TStringItem = {
		length: Int16;
		arrayIdx: Int16;
	};

	type TStringList = {
		count: Int16;
		items: TStringItem[];
	};
*/

const STRINGS_COUNT = 64;
const STRING_BLOCK_SIZE = 32;
const STRING_RECORD_SIZE = 2 + 2;
const FIELD_COUNT_SIZE = 2;
const FIELD_NEXT_SIZE = 2;
const FIELD = {
	STRING_COUNT: 0,
	STRING_LENGTH: 0,
	STRING_ARRAY_IDX: 2,
	NEXT_BLOCK: 0,
};

let stringArrayIdx = -1;

//
// create array to hold TStringList
//
function createStringIndexesArray() {
	// TStringItem size is
	//    sizeof(length) + sizeof(arrayIdx)
	//    2 + 2 = 4
	// TStringList size is
	//    sizeof(count) + STRING_COUNT * sizeof(TStringItem)
	//    2 + 64 * 4 = 258

	// add a array to store indices to array(of chars used as string)
	stringArrayIdx = addArray(TYPES.byte, [FIELD_COUNT_SIZE + STRING_RECORD_SIZE * STRINGS_COUNT]);
	// fist item if the strings count
	setArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT, 0);
}

export function createString(length: number, isVarName = false) {
	if (stringArrayIdx < 0) createStringIndexesArray();

	// get strings count
	const strCount = getArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT) + 1;
	// set it + 1
	setArrayItem(TYPES.int, stringArrayIdx, FIELD.STRING_COUNT, strCount);

	const strIdx = FIELD_COUNT_SIZE + strCount * STRING_RECORD_SIZE;

	// store the string length
	setArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_LENGTH, length);

	// add 1st block array to store the string
	const arrayIdx = addArray(TYPES.byte, [STRING_BLOCK_SIZE]) | (isVarName ? 0x8000 : 0x0000);

	// add the idx to the string array indices
	setArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX, arrayIdx);

	let previousBlockIdx = arrayIdx;
	while (true) {
		length = length - STRING_BLOCK_SIZE - FIELD_NEXT_SIZE;
		if (length <= 0) break;

		const blockIdx = addArray(TYPES.byte, [STRING_BLOCK_SIZE]);

		// set previous block NEXT to point to blockIdx
		setArrayItem(TYPES.byte, previousBlockIdx, FIELD.NEXT_BLOCK, blockIdx);

		previousBlockIdx = blockIdx;
	}

	return arrayIdx;
}

/**
 *
 * @param str string to add
 * @param isVarName flag to indicate the string is used for a variable name
 * @returns new string count
 */
export function newString(str: string, isVarName = false) {
	const strIdx = createString(str.length, isVarName);

	// copy string chars into the new array
	for (let idx = 0; idx < str.length; idx++) {
		setArrayItem(TYPES.byte, strIdx, idx, str.charCodeAt(idx));
	}

	// console.log("addString", str, isVarName, strIdx);

	return getArrayItem(TYPES.int, stringArrayIdx, 0);
}

export function setString(idx: number, str: string) {
	let strIdx = FIELD_COUNT_SIZE + idx * STRING_RECORD_SIZE;
	let arrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX) & 0x7fff;

	const len = str.length; //getArraySize(arrayIdx);
	let remainingLen = len - STRING_BLOCK_SIZE - FIELD_NEXT_SIZE;
	let runningLen = len;
	for (let idx = 0; idx < len; idx++) {
		setArrayItem(TYPES.byte, arrayIdx, idx + FIELD_NEXT_SIZE, str.charCodeAt(idx));
		runningLen--;
		if (runningLen === remainingLen) {
			remainingLen = remainingLen - STRING_BLOCK_SIZE - FIELD_NEXT_SIZE;
			strIdx = getArrayItem(TYPES.byte, arrayIdx, idx + FIELD.NEXT_BLOCK);
			arrayIdx = getArrayItem(TYPES.byte, stringArrayIdx, strIdx + FIELD.STRING_ARRAY_IDX) & 0x7fff;
		}
	}
}

export function getString(idx: number) {
	let result = "";

	const strIdx = getArrayItem(TYPES.int, stringArrayIdx, idx) & 0x7fff;
	const len = getArraySize(strIdx);
	for (let idx = 0; idx < len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx, idx);
		result += String.fromCharCode(ch);
	}
	return result;
}

export function getStringLen(idx: number) {
	const strIdx = getArrayItem(TYPES.int, stringArrayIdx, idx) & 0x7fff;
	return getArraySize(strIdx);
}

export function concatStrings(strIdx1: number, strIdx2: number) {
	const str1Len = getStringLen(strIdx1);
	const str2Len = getStringLen(strIdx2);
	const destStrLen = str1Len + str2Len;
	const strIdx = createString(destStrLen);

	let destPtr = 0;
	for (let idx = 0; idx < str1Len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx1, idx);
		setArrayItem(TYPES.byte, strIdx, destPtr + idx, ch);
	}
	destPtr = str1Len;
	for (let idx = 0; idx < str2Len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx2, idx);
		setArrayItem(TYPES.byte, strIdx, destPtr + idx, ch);
	}
	return strIdx;
}

export function copyString(destStrIdx: number, srcStrIdx: number) {
	const destStrLen = getStringLen(destStrIdx);
	const srcStrLen = getStringLen(srcStrIdx);

	if (destStrLen < srcStrLen) return ERRORS.OVERFLOW;

	for (let idx = 0; idx < srcStrLen; idx++) {
		const ch = getArrayItem(TYPES.byte, srcStrIdx, idx);
		setArrayItem(TYPES.byte, destStrIdx, idx, ch);
	}

	return ERRORS.NONE;
}

// let tempStringsIdx;
export function resetTempStrings() {
	// strings.length= tempStringsIdx;
}

export function setTempStrings() {
	// tempStringsIdx= strings.length;
}

export function dumpStrings() {
	console.log("-- STRINGS --");

	const strCount = getArrayItem(TYPES.int, stringArrayIdx, 0);
	console.log(`array:${stringArrayIdx} count:${strCount}`);

	for (let idx = 0; idx < strCount; idx++) {
		const strIdx = getArrayItem(TYPES.int, stringArrayIdx, idx + 1);
		console.log(`${String(idx).padStart(4, "0")} array:${hexWord(strIdx)} ${strIdx & 0x8000 ? "v" : " "} "${getString(idx + 1)}"`);
	}
	console.log("");
}
