10 print peek%(36)
20 end
30 function peek
40 asm {
	lda $20
	pha
	lda $21
	pha
	jsr getparm
	sta $20
	stx $21
	ldy #0
	lda ($21),y
	tax
	lda ($20),y
	jsr setreturn
}
50 end function
