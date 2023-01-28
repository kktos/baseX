10 dim a$(10)
20 for i%=0 to 9
25 let tmp$= chr$(65+i%)
30 let a$(i%)= tmp$
31 let tmp$="prout"
35 print a$(i%)
40 next i%
