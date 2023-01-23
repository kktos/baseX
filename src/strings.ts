import {
	addArray,
	getArrayItem,
	getArraySize,
	setArrayItem
} from "./arrays";
import { TYPES } from "./defs";

const MAX_STRINGS = 64;
let stringArray = -1;

export function addString(str: string) {
	if (stringArray < 0) {
		stringArray = addArray(TYPES.int, MAX_STRINGS);
		setArrayItem(TYPES.int, stringArray, 0, 0);
	}

	const strCount = getArrayItem(TYPES.int, stringArray, 0) + 1;
	setArrayItem(TYPES.int, stringArray, 0, strCount);

	const strIdx = addArray(TYPES.byte, str.length);
	setArrayItem(TYPES.int, stringArray, strCount, strIdx);

	for (let idx = 0; idx < str.length; idx++) {
		setArrayItem(TYPES.byte, strIdx, idx, str.charCodeAt(idx));
	}

	return strCount;
}

export function getString(idx: number) {
	let result = "";

	const strIdx = getArrayItem(TYPES.int, stringArray, idx);
	const len = getArraySize(strIdx);
	for (let idx = 0; idx < len; idx++) {
		const ch = getArrayItem(TYPES.byte, strIdx, idx);
		result += String.fromCharCode(ch);
	}
	return result;
}

let tempStringsIdx;
export function resetTempStrings() {
	// strings.length= tempStringsIdx;
}

export function setTempStrings() {
	// tempStringsIdx= strings.length;
}

export function dumpStrings() {
	const strCount = getArrayItem(TYPES.int, stringArray, 0);
	console.log("count:", strCount);

	for (let idx = 0; idx < strCount; idx++) {
		console.log(`${String(idx).padStart(4, "0")} : "${getString(idx)}"`);
	}
}
