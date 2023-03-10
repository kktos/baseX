import { headers, prgCode, prgLines, SIZE, TPrgBuffer } from "./defs";
import { program } from "./vm/vm.def";

function writeBuffer(p: TPrgBuffer, value: number, size: number) {
	switch (size) {
		case SIZE.byte:
			p.buffer[p.idx++] = value;
			break;
		case SIZE.word:
			p.buffer[p.idx++] = value & 0xff;
			p.buffer[p.idx++] = (value >> 8) & 0xff;
			break;
	}

	return p.idx - 1;
}

export function writeBufferProgram(size: number, value: number, idx = -1) {
	const p =
		idx === -1
			? prgCode
			: {
					buffer: prgCode.buffer,
					idx,
			  };

	// console.log(hexWord(p.idx), size === SIZE.byte ? hexByte(p.idx) : hexWord(p.idx));

	return writeBuffer(p, value, size);
}

export function writeBufferHeader(idx: number, val: number) {
	const p = {
		buffer: headers,
		idx,
	};
	writeBuffer(p, val, SIZE.word);
}

export function writeBufferLine(val: number, idx: number = -1) {
	const p = {
		buffer: prgLines.buffer,
		idx,
	};
	writeBuffer(idx !== -1 ? p : prgLines, val, SIZE.word);
}

export function readBuffer(p: TPrgBuffer, size: number, lookahead = false) {
	switch (size) {
		case SIZE.byte: {
			const value = p.buffer[p.idx];
			if (!lookahead) p.idx++;
			return value;
		}
		case SIZE.word: {
			const value = (p.buffer[p.idx] & 0xff) | (p.buffer[p.idx + 1] << 8);
			if (!lookahead) p.idx += 2;
			return value;
		}
		case SIZE.long: {
			const value = (p.buffer[p.idx] & 0xff) | (p.buffer[p.idx + 1] << 8) | (p.buffer[p.idx + 1] << 16) | (p.buffer[p.idx + 1] << 24);
			if (!lookahead) p.idx += 4;
			return value;
		}
		default:
			throw new TypeError("Unknown Size");
	}
}

export function readBufferLine(idx: number) {
	const p = {
		buffer: prgLines.buffer,
		idx,
	};
	return readBuffer(idx !== undefined ? p : prgLines, SIZE.word);
}

export function readBufferHeader(idx: number) {
	const p = {
		buffer: headers,
		idx,
	};
	return readBuffer(p, SIZE.word);
}

export function readBufferProgram(size: number, idx: number= -1) {
	const p = idx === -1 ? program : {
		buffer: program.buffer,
		idx,
	};

	// const out= `readBufferProgram ${hexWord(p.idx)} ${EnumToName(SIZE, size)} `;
	const value= readBuffer(p, size);
	// console.log(out, "VALUE:", hexNum(value), "NEXT:", hexWord(p.idx));
	return value;
}

export function peekBufferProgram(size: number, idx: number= -1) {
	const p = {
		buffer: program.buffer,
		idx,
	};
	return readBuffer(idx !== -1 ? p : program, size, true);
}
