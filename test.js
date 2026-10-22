const {calculate}=require('./app.js');
const assert=require('node:assert/strict');
const base={entry:100,margin:50,leverage:20,leveraged:true,direction:'long',mode:'change',movement:50,sizing:'margin',fees:false,feeRate:0.05};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
let r=calculate(base);near(r.gross,500);near(r.grossRoi,1000);
r=calculate({...base,movement:-2});near(r.gross,-20);near(r.grossRoi,-40);
r=calculate({...base,movement:-2,direction:'short'});near(r.gross,20);near(r.grossRoi,40);
for(const direction of ['long','short']){r=calculate({...base,mode:'roi',movement:100,direction});near(r.gross,50);near(r.grossRoi,100);}
r=calculate({...base,fees:true,movement:2});near(r.fees,1.01);near(r.net,18.99);near(r.roi,37.98);
r=calculate({...base,leveraged:false,movement:2});near(r.gross,1);near(r.roi,2);
r=calculate({...base,sizing:'quantity',quantity:10});near(r.margin,50);near(r.gross,500);
r=calculate({...base,mode:'prices',exit:98,direction:'short'});near(r.gross,20);
assert.ok(calculate({...base,movement:-6}).liquidation);
assert.ok(calculate({...base,movement:-5}).liquidation);
for(const patch of [{entry:0},{margin:-1},{leverage:1001},{movement:-100},{entry:''},{margin:Infinity},{margin:1e308},{feeRate:-1,fees:true}])assert.throws(()=>calculate({...base,...patch}));
console.log('Passed: long/short PnL, target ROI, fees, leverage off, quantity sizing, entry/exit, invalid inputs, overflow, liquidation.');
