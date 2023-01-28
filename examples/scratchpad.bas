110 	let $this = 0

10 dim a$(10)
20 for i%=0 to 9
25 let tmp$= chr$(65+i%)
30 let a$(i%)= tmp$
31 let tmp$="prout"
35 print a$(i%)
40 next i%

140 dim tab%(10)
150 print tab%[5]

30 rem
40 print (), test()
50 end
100 function test
200 return 3
300 end function

10 let N$= "john"
20 let count%=3
30 PRINT count%, "Your name is ";CHR$(34);N$;CHR$(34)
40 let count%=count%-1
50 if count% > 0 then 30

140 for x%=0 to 9
150 print chr$( 48 + x% )
160 next x%
